import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

const { Pool } = pg; // Destructure Pool from the pg object
let poolInstance;

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

/**
 * Returns a singleton instance of the PostgreSQL connection pool.
 */
const getPool = () => {
  if (!poolInstance) {
    console.log('Creating new PostgreSQL connection pool...');
    poolInstance = new Pool(dbConfig);

    poolInstance.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
      } else {
        console.log('Successfully connected to PostgreSQL. Current time:', res.rows[0].now);
      }
    });

    poolInstance.on('error', (err, client) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return poolInstance;
};

/**
 * A simple query function to interact with the database.
 * @param {string} text - The SQL query string.
 * @param {Array} params - Parameters for the SQL query.
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => {
  const currentPool = getPool();
  return currentPool.query(text, params);
};

// Export functions
export { query, getPool };