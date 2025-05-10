import app from './src/app.js'; // Import with .js extension
import dotenv from 'dotenv';

// It's good practice to load dotenv at the very start if not already done by an imported module
// that needs it earlier. app.js already does this, but being explicit here doesn't hurt.
dotenv.config();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT} using ES6 Modules`);
  console.log('API Endpoints:');
  console.log(`  POST /api/pdfs/upload`);
  console.log(`  POST /api/pdfs/query/:documentId`);
  console.log(`  GET  /api/db-test`);
});