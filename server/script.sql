-- Step 1: Create the database (if it doesn't exist)
-- IMPORTANT: You might need to run this command separately using a tool like `psql`
-- or your database administration GUI, as `CREATE DATABASE` cannot typically be run
-- in the same transaction block as other commands that expect to connect to that database.
--
-- Example using psql:
-- > createdb vector_db
--
-- Or, if you have superuser privileges and want to run it as a query (less common for initial setup):
-- CREATE DATABASE vector_db;
--
-- For the rest of the script, ensure you are connected to the 'vector_db' database.
-- In psql, you would do this with: \c vector_db

-- Step 2: Enable the pgvector extension (if not already enabled in vector_db)
-- This needs to be run once per database where you want to use vector types.
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 3: Create the 'documents' table
-- This table will store information about each uploaded PDF file.
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,                      -- Unique identifier for each document
    filename VARCHAR(255) NOT NULL,             -- Original filename of the uploaded PDF
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, -- Timestamp of when the document was uploaded
    -- You could add other metadata here, e.g., user_id if you have users
    metadata JSONB                             -- Optional: For any other structured metadata
);

-- Add a comment to the documents table
COMMENT ON TABLE documents IS 'Stores metadata about uploaded PDF documents.';
COMMENT ON COLUMN documents.id IS 'Primary key, auto-incrementing ID for the document.';
COMMENT ON COLUMN documents.filename IS 'The original name of the uploaded PDF file.';
COMMENT ON COLUMN documents.uploaded_at IS 'Timestamp indicating when the PDF was uploaded.';
COMMENT ON COLUMN documents.metadata IS 'Optional JSONB field for storing additional document metadata.';


-- Step 4: Create the 'text_chunks' table
-- This table will store individual text chunks extracted from the PDFs and their embeddings.
CREATE TABLE IF NOT EXISTS text_chunks (
    id SERIAL PRIMARY KEY,                      -- Unique identifier for each text chunk
    document_id INTEGER NOT NULL,               -- Foreign key referencing the 'documents' table
    chunk_text TEXT NOT NULL,                   -- The actual text content of the chunk
    embedding_vector VECTOR(384),             -- The vector embedding for this chunk.
                                                -- IMPORTANT: The dimension (e.g., 384) MUST match
                                                -- the output dimension of your chosen Hugging Face model
                                                -- (e.g., 'Xenova/all-MiniLM-L6-v2' is 384).
    chunk_order INTEGER,                        -- The sequential order of this chunk within its document
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, -- Timestamp of when the chunk was created
    -- You could add other metadata specific to the chunk here
    chunk_metadata JSONB,                       -- Optional: For any other structured metadata about the chunk

    -- Define the foreign key constraint
    CONSTRAINT fk_document
        FOREIGN KEY(document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE                       -- If a document is deleted, its chunks are also deleted
);

-- Add comments to the text_chunks table
COMMENT ON TABLE text_chunks IS 'Stores text chunks extracted from PDFs and their vector embeddings.';
COMMENT ON COLUMN text_chunks.id IS 'Primary key, auto-incrementing ID for the text chunk.';
COMMENT ON COLUMN text_chunks.document_id IS 'Foreign key linking to the parent document in the "documents" table.';
COMMENT ON COLUMN text_chunks.chunk_text IS 'The actual text content of this specific chunk.';
COMMENT ON COLUMN text_chunks.embedding_vector IS 'The vector embedding representing the semantic meaning of the chunk_text. Dimension must match the embedding model.';
COMMENT ON COLUMN text_chunks.chunk_order IS 'The sequential order of this chunk within the original document (0-indexed).';
COMMENT ON COLUMN text_chunks.created_at IS 'Timestamp indicating when this chunk record was created.';
COMMENT ON COLUMN text_chunks.chunk_metadata IS 'Optional JSONB field for storing additional chunk-specific metadata.';


-- Step 5: (Optional but Recommended for Performance) Create an index on the embedding_vector
-- This will speed up similarity searches.
-- For pgvector, common index types are IVFFlat and HNSW.
--
-- Using cosine similarity (vector_cosine_ops):
-- For IVFFlat: `lists` is a key parameter. A common starting point is `sqrt(N)` for N rows,
-- or `N / 1000` for larger datasets. Adjust based on your data size and performance testing.
--
-- CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding_ivfflat
-- ON text_chunks
-- USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
--
-- For HNSW (Hierarchical Navigable Small World) - often better for many use cases:
-- `m` and `ef_construction` are key parameters.
--
-- CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding_hnsw
-- ON text_chunks
-- USING hnsw (embedding_vector vector_cosine_ops) WITH (m = 16, ef_construction = 64);
--
-- Choose one type of index based on your needs. HNSW is generally a good default.
-- If you choose to create an index now, uncomment one of the above.
-- Note: Index creation can take some time on large tables.
-- For this example, let's create an HNSW index as a common recommendation:

CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding_hnsw_cosine
ON text_chunks
USING hnsw (embedding_vector vector_cosine_ops); -- Uses default m and ef_construction, or specify them

COMMENT ON INDEX idx_text_chunks_embedding_hnsw_cosine IS 'HNSW index on embedding_vector for efficient cosine similarity searches.';

-- You can verify table creation by listing tables in your database:
-- \dt

-- And inspect table structure:
-- \d documents
-- \d text_chunks

SELECT 'Database schema creation script finished.' AS status;
