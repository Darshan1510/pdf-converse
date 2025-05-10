import * as pdfService from '../services/pdfService.js'; // Import with .js extension

const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded.' });
    }
    const pdfBuffer = req.file.buffer;
    const filename = req.file.originalname;

    const result = await pdfService.processAndStorePDF(pdfBuffer, filename);
    res.status(201).json({ message: 'PDF processed and stored successfully.', data: result });
  } catch (error) {
    console.error('Error in uploadPdf controller:', error);
    if (error.message.includes("Extracted text is empty") || error.message.includes("Failed to extract text")) {
        return res.status(400).json({ message: error.message });
    }
    if (error.message.includes("Failed to generate embedding") || error.message.includes("Embedding pipeline is not available")) {
        return res.status(500).json({ message: "Internal server error during embedding generation." });
    }
    res.status(500).json({ message: 'Error processing PDF.', error: error.message });
  }
};

const queryPdf = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: 'Question is required in the request body.' });
    }
    if (isNaN(parseInt(documentId))) {
        return res.status(400).json({ message: 'Valid documentId parameter is required.' });
    }

    const relevantChunks = await pdfService.queryPDFChunks(parseInt(documentId), question);

    if (!relevantChunks || relevantChunks.length === 0) {
      return res.status(404).json({ message: 'No relevant information found for your query in this document.' });
    }

    const answer = await pdfService.getAnswerFromLLM(relevantChunks, question);
    res.status(200).json({ message: 'Query successful.', data: { answer, relevantChunks } });

  } catch (error) {
    console.error('Error in queryPdf controller:', error);
    res.status(500).json({ message: 'Error querying PDF.', error: error.message });
  }
};

export { uploadPdf, queryPdf };