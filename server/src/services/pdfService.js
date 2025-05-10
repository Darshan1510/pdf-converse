import * as db from '../config/db.js'; // Import with .js extension
import { extractTextFromPDF } from '../utils/textExtractor.js'; // Import with .js extension
import { generateEmbedding, chunkText } from './embeddingService.js'; // Import with .js extension
import dotenv from 'dotenv';

dotenv.config(); //

/**
 * Processes an uploaded PDF, extracts text, generates embeddings for chunks,
 * and stores them in the database.
 * @param {Buffer} pdfBuffer - The PDF file buffer.
 * @param {string} filename - The original name of the PDF file.
 * @returns {Promise<object>} - Information about the processed document.
 */
const processAndStorePDF = async (pdfBuffer, filename) => {
  console.log(`Processing PDF: ${filename}`);
  const rawText = await extractTextFromPDF(pdfBuffer);
  if (!rawText.trim()) {
    throw new Error("Extracted text is empty. Cannot process PDF.");
  }
  console.log(`Extracted ${rawText.length} characters from ${filename}`);

  const textChunks = chunkText(rawText, { chunkSize: 500, overlap: 50 });
  console.log(`Divided text into ${textChunks.length} chunks.`);

  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    const docResult = await client.query(
      'INSERT INTO documents (filename, uploaded_at) VALUES ($1, NOW()) RETURNING id, filename',
      [filename]
    );
    const documentId = docResult.rows[0].id;
    console.log(`Stored document record with ID: ${documentId}`);

    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      if (!chunk || chunk.trim() === "") continue;

      console.log(`Generating embedding for chunk ${i + 1}/${textChunks.length}...`);
      const embedding = await generateEmbedding(chunk);

      if (!embedding || embedding.length === 0) {
        console.warn(`Skipping chunk ${i+1} due to empty embedding.`);
        continue;
      }
      const embeddingString = `[${embedding.join(',')}]`;
      await client.query(
        `INSERT INTO text_chunks (document_id, chunk_text, embedding_vector, chunk_order)
         VALUES ($1, $2, $3, $4)`,
        [documentId, chunk, embeddingString, i]
      );
      console.log(`Stored chunk ${i + 1} for document ID: ${documentId}`);
    }

    await client.query('COMMIT');
    return {
      documentId,
      filename: docResult.rows[0].filename,
      chunksStored: textChunks.filter(c => c && c.trim() !== "").length,
      message: 'PDF processed and stored successfully.'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in processAndStorePDF:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Queries the PDF for relevant chunks based on a user question.
 * @param {number} documentId - The ID of the document to query.
 * @param {string} userQuestion - The question from the user.
 * @returns {Promise<Array<object>>} - Array of relevant text chunks.
 */
const queryPDFChunks = async (documentId, userQuestion) => {
  console.log(`Querying document ID ${documentId} with question: "${userQuestion}"`);
  const questionEmbedding = await generateEmbedding(userQuestion);

  if (!questionEmbedding || questionEmbedding.length === 0) {
    throw new Error("Could not generate embedding for the question.");
  }
  const questionEmbeddingString = `[${questionEmbedding.join(',')}]`;
  const similarityQuery = `
    SELECT
      id,
      chunk_text,
      document_id,
      chunk_order,
      embedding_vector <=> $1 AS similarity_score
    FROM text_chunks
    WHERE document_id = $2
    ORDER BY similarity_score ASC
    LIMIT 5;
  `;
  try {
    const { rows } = await db.query(similarityQuery, [questionEmbeddingString, documentId]);
    console.log(`Found ${rows.length} relevant chunks.`);
    return rows;
  } catch (error) {
    console.error('Error querying PDF chunks:', error);
    throw error;
  }
};

const getAnswerFromLLM = async (contextChunks, userQuestion) => {
  // const openaiApiKey = process.env.OPENAI_API_KEY;
  // if (!openaiApiKey) {
  //   return "LLM interaction is not configured. Relevant snippets:\n" + contextChunks.map(c => c.chunk_text).join("\n\n");
  // }
  // import { OpenAI } from "openai"; // Would be imported at the top if used
  // const openai = new OpenAI({ apiKey: openaiApiKey });
  // ... LLM logic ...
  if (contextChunks.length === 0) {
    return "I couldn't find any relevant information in the document to answer your question.";
  }
  return "Based on the document, here's some relevant information:\n" + contextChunks.map(c => c.chunk_text).join("\n\n");
};

export { processAndStorePDF, queryPDFChunks, getAnswerFromLLM };