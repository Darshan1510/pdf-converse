# PDF Converse 🤖📄💬

**Ask questions and get answers from your PDF documents using AI-powered semantic search and language models.**

This project allows users to upload PDF files, process their content to generate semantic embeddings, and then ask questions related to the document. The backend leverages Node.js, Express, PostgreSQL with the `pgvector` extension for efficient similarity searches, and Hugging Face Transformers (via `@xenova/transformers`) for creating text embeddings. The frontend is built with React and Vite, styled with Tailwind CSS.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [API Documentation](#api-documentation)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

## Overview

PDF Converse aims to make information retrieval from PDF documents more interactive and efficient. Instead of manually searching through pages, users can simply ask questions in natural language. The system extracts text from the PDF, divides it into manageable chunks, converts these chunks into vector embeddings, and stores them. When a user asks a question, it's also converted into an embedding, and a similarity search is performed to find the most relevant text chunks. These chunks are then (optionally) fed to a Large Language Model (LLM) to generate a coherent answer.

## Features

* **PDF Upload:** Securely upload PDF documents.
* **Text Extraction:** Automatically extracts text content from PDFs.
* **Semantic Chunking:** Divides extracted text into meaningful, manageable chunks.
* **Vector Embeddings:** Generates dense vector embeddings for text chunks using Hugging Face models.
* **Similarity Search:** Efficiently finds relevant text chunks using `pgvector` in PostgreSQL.
* **Question Answering:** Allows users to ask questions and receive answers based on document content.
* **Interactive UI:** User-friendly interface built with React and Tailwind CSS.
* **API Documentation:** Swagger/OpenAPI documentation for backend APIs.
* **Scalable Backend:** Built with Node.js and Express.

## Tech Stack

**Backend:**

* **Node.js:** JavaScript runtime environment.
* **Express.js:** Web application framework for Node.js.
* **PostgreSQL:** Powerful open-source relational database.
* **pgvector:** PostgreSQL extension for vector similarity search.
* **`@xenova/transformers`:** Hugging Face Transformers library for Node.js/JavaScript (for embeddings).
* **`pdf-parse`:** Library for extracting text from PDF files.
* **`multer`:** Middleware for handling file uploads.
* **`swagger-jsdoc` & `swagger-ui-express`:** For API documentation.
* **`dotenv`:** For managing environment variables.

**Frontend:**

* **React:** JavaScript library for building user interfaces.
* **Vite:** Fast frontend build tool.
* **Tailwind CSS:** Utility-first CSS framework for styling.
* **Lucide React:** Icon library.
* **`axios` (or `fetch`):** For making API requests.

**Database:**

* **PostgreSQL** with the **`pgvector`** extension.

## Prerequisites

* **Node.js:** Version 18.x or later (to support ES6 modules and `@xenova/transformers`).
* **npm** or **yarn:** Package manager for Node.js.
* **PostgreSQL:** Version 13 or later (ensure `pgvector` compatibility).
* **Docker (Recommended):** For easily running PostgreSQL with `pgvector`.
* **Git:** For version control.
## Database Setup

The application requires a PostgreSQL database with the `pgvector` extension enabled.

1.  **Install PostgreSQL:** If not already installed, download and install PostgreSQL. Alternatively, use Docker.
    * **Using Docker (Recommended):**
        ```bash
        docker run -d \
          --name pdf-chat-postgres \
          -p 5432:5432 \
          -e POSTGRES_USER=your_db_user \
          -e POSTGRES_PASSWORD=your_db_password \
          -e POSTGRES_DB=vector_db \
          ankane/pgvector:v0.5.0 # Or latest pgvector compatible image
        ```
        (Replace `your_db_user`, `your_db_password` with your desired credentials. The `vector_db` name matches the SQL script.)

2.  **Create the Database:**
    If you didn't use the `POSTGRES_DB` environment variable with Docker, or if setting up manually, create the database:
    ```bash
    createdb vector_db
    ```
    (Ensure `your_db_user` has privileges on this database).

3.  **Connect to `vector_db`** using `psql` or your preferred SQL client:
    ```bash
    psql -U your_db_user -d vector_db
    ```

4.  **Run the Schema Script:**
    Execute the SQL commands provided in the `sql_schema_vector_db` artifact (or a dedicated `.sql` file like `schema.sql`) to create the necessary tables (`documents`, `text_chunks`) and enable the `pgvector` extension. The key parts of the schema are:

    ```sql
    -- Enable the pgvector extension
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Create 'documents' table
    CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
    );

    -- Create 'text_chunks' table
    CREATE TABLE IF NOT EXISTS text_chunks (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding_vector VECTOR(384), -- Dimension must match your embedding model
        chunk_order INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        chunk_metadata JSONB
    );

    -- Create an index for faster similarity search (HNSW example)
    CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding_hnsw_cosine
    ON text_chunks
    USING hnsw (embedding_vector vector_cosine_ops);
    ```
    **Note:** Ensure the `VECTOR(384)` dimension matches the output of your chosen Hugging Face model (e.g., `Xenova/all-MiniLM-L6-v2` is 384).

## Environment Variables

Create `.env` files for both the backend and frontend.

**Backend (`server/.env`):**
(Note: Your project structure shows `backend/` but the text below mentioned `server/.env`. I'll use `server/.env` to match your structure diagram if `server` is indeed the backend folder name. If it's `backend`, adjust accordingly.)

```env
# PostgreSQL Configuration
DB_USER=your_postgres_user
DB_HOST=localhost # or your docker container name/service if using docker-compose
DB_DATABASE=vector_db
DB_PASSWORD=your_postgres_password
DB_PORT=5432

# Server Configuration
PORT=3001

# OpenAI API Key (Optional - if you extend to use OpenAI)
# OPENAI_API_KEY=your_openai_api_key

# Hugging Face Model (Optional - if you want to configure the model name here, though it's hardcoded in embeddingService.js for now)
# HF_MODEL_NAME=Xenova/all-MiniLM-L6-v2

```

# Future Enhancements

## 1. User Authentication
- Secure the application and associate PDFs with specific users.

## 2. More Sophisticated LLM Integration
- Use more advanced LLMs (like OpenAI's GPT models or open-source alternatives) for generating answers, summarization, etc.

## 3. Support for More Document Types
- Extend the application to support additional document types such as `.docx`, `.txt`, etc.

## 4. Improved UI/UX
- Add features like:
  - PDF preview
  - Highlighting relevant sections
  - Chat history persistence

## 5. Advanced Chunking Strategies
- Implement more context-aware text chunking for better accuracy and relevance in responses.

## 6. Model Selection
- Allow users to choose different embedding models for personalized processing.

## 7. Error Handling & Logging
- Implement more robust error handling mechanisms and centralized logging for better debugging and maintenance.

## 8. Dockerization
- Dockerize both frontend and backend for easier deployment and environment consistency.

## 9. CI/CD Pipeline
- Set up continuous integration and deployment (CI/CD) pipelines for streamlined updates and testing.


## License
This project is licensed under the MIT License. See the LICENSE file for details (you would need to create a LICENSE file with the MIT license text).