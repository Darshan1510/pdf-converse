import express from 'express';
import multer from 'multer';
import * as pdfController from '../controllers/pdfController.js'; // Import with .js extension

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

router.post('/upload', upload.single('pdfFile'), pdfController.uploadPdf);
router.post('/query/:documentId', express.json(), pdfController.queryPdf);

export default router; // Default export for the router