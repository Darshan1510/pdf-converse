import dotenv from 'dotenv';
dotenv.config();

let pipelineInstance;

const getPipeline = async (task = 'feature-extraction', model = 'Xenova/all-MiniLM-L6-v2') => {
  if (!pipelineInstance) {
    // Dynamic import() is inherently asynchronous and fits well with ES modules
    const { pipeline, env } = await import('@xenova/transformers');
    // env.allowLocalModels = false;
    console.log('Initializing Hugging Face pipeline...');
    try {
      pipelineInstance = await pipeline(task, model);
      console.log('Hugging Face pipeline initialized successfully.');
    } catch (error) {
        console.error("Failed to load Hugging Face pipeline:", error);
        pipelineInstance = null;
        throw error;
    }
  }
  return pipelineInstance;
};

/**
 * Generates embeddings for a given text using Hugging Face transformers.js.
 * @param {string} text - The text to generate embeddings for.
 * @returns {Promise<Array<number>>} - The embedding vector.
 */
const generateEmbedding = async (text) => {
  if (!text || text.trim() === "") {
    console.warn("Attempted to generate embedding for empty text.");
    return [];
  }
  try {
    const extractor = await getPipeline();
    if (!extractor) {
        throw new Error("Embedding pipeline is not available.");
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding.');
  }
};

/**
 * Chunks text into smaller pieces.
 * @param {string} text - The text to chunk.
 * @param {object} options - Chunking options.
 * @param {number} options.chunkSize - Max characters per chunk.
 * @param {number} options.overlap - Characters to overlap between chunks.
 * @returns {Array<string>} - Array of text chunks.
 */
const chunkText = (text, { chunkSize = 1000, overlap = 100 } = {}) => {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.substring(i, end));
        if (end === text.length) break;
        i += (chunkSize - overlap);
        if (i >= text.length) break;
    }
    return chunks;
};

export { generateEmbedding, chunkText, getPipeline }; 