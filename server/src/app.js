import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pdfRoutes from './routes/pdfRoutes.js'; // Import with .js extension
import * as db from './config/db.js'; // Import with .js extension

dotenv.config(); // Ensure .env is loaded for this file too

const app = express();

db.getPool(); // Initialize DB Pool

app.use(cors());
app.use(express.urlencoded({ extended: true }));
// Note: express.json() is applied specifically in pdfRoutes where needed for the /query endpoint.
// If other routes need JSON parsing, you can add app.use(express.json()); here globally.

app.use('/api/pdfs', pdfRoutes);

app.get('/', (req, res) => {
  res.send('PDF Chat API is running with ES6 Modules!');
});

app.get('/api/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).json({
            message: 'Database connection successful!',
            time: result.rows[0].now,
        });
    } catch (error) {
        console.error('Database connection test failed:', error);
        res.status(500).json({
            message: 'Database connection failed.',
            error: error.message,
        });
    }
});

app.use((err, req, res, next) => {
  console.error("Global error handler caught:", err.stack);
  if (err.message === 'Only PDF files are allowed!') {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).send('Something broke!');
});

export default app; // Default export for the app