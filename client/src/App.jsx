import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Send, FileText, User, Cpu, AlertCircle, CheckCircle, Loader2, CornerDownLeft } from 'lucide-react';

// Helper to get API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Chat Message Component
const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';
  const Icon = isUser ? User : Cpu;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-2xl p-4 rounded-2xl shadow-md ${
          isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'
        }`}
      >
        <div className="flex items-center mb-2">
          <Icon size={20} className={`mr-2 ${isUser ? 'text-blue-100' : 'text-indigo-500'}`} />
          <span className="font-semibold">{isUser ? 'You' : 'AI Assistant'}</span>
        </div>
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.chunks && message.chunks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300/50">
            <h4 className="text-xs font-semibold mb-1 opacity-80">Relevant Information:</h4>
            <ul className="space-y-2">
              {message.chunks.map((chunk, index) => (
                <li key={index} className="text-xs p-2 bg-gray-50/50 dark:bg-gray-700/20 rounded-md border border-gray-200/50 dark:border-gray-600/30">
                  <p className="italic opacity-75">"...{chunk.chunk_text}..."</p>
                  <p className="text-xxs opacity-50 mt-1">Similarity: {chunk.similarity_score.toFixed(4)} (Order: {chunk.chunk_order})</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null); // Stores { id, filename }
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [currentQuestion, setCurrentQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [queryError, setQueryError] = useState('');

  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom of chat messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadError('');
      setUploadSuccess('');
    } else {
      setSelectedFile(null);
      setUploadError('Please select a valid PDF file.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a PDF file first.');
      return;
    }

    setIsLoadingUpload(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadedDocument(null); // Reset previous document
    setMessages([]); // Clear chat if new PDF is uploaded

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/pdfs/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! Status: ${response.status}`);
      }

      setUploadedDocument({ id: data.data.documentId, filename: data.data.filename });
      setUploadSuccess(`Successfully uploaded and processed: ${data.data.filename} (ID: ${data.data.documentId})`);
      setSelectedFile(null); // Clear file input
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input visually
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload PDF. Please try again.');
    } finally {
      setIsLoadingUpload(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim()) return;
    if (!uploadedDocument) {
      setQueryError('Please upload and process a PDF first.');
      return;
    }

    const userMessage = { sender: 'user', text: currentQuestion.trim() };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setCurrentQuestion('');
    setIsLoadingQuery(true);
    setQueryError('');

    try {
      const response = await fetch(`${API_BASE_URL}/pdfs/query/${uploadedDocument.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: userMessage.text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! Status: ${response.status}`);
      }

      const aiMessage = {
        sender: 'ai',
        text: data.data.answer,
        chunks: data.data.relevantChunks,
      };
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Query error:', error);
      setQueryError(error.message || 'Failed to get an answer. Please try again.');
      const aiErrorMessage = { sender: 'ai', text: `Sorry, I encountered an error: ${error.message}` };
      setMessages(prevMessages => [...prevMessages, aiErrorMessage]);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="bg-white/10 backdrop-blur-lg shadow-2xl rounded-xl w-full max-w-4xl h-[calc(100vh-4rem)] flex flex-col overflow-hidden border border-white/20">
        {/* Header */}
        <header className="p-6 border-b border-white/20">
          <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            PDF Converse
          </h1>
          <p className="text-center text-sm text-gray-300 mt-1">Upload a PDF and ask questions about its content.</p>
        </header>

        {/* Main Content Area */}
        <div className="flex-grow flex md:flex-row flex-col overflow-hidden">
          {/* Left Panel: Upload and Document Info */}
          <div className="md:w-1/3 w-full p-6 border-r border-white/20 flex flex-col space-y-6 overflow-y-auto">
            <div>
              <label htmlFor="pdf-upload" className="block text-sm font-medium text-gray-200 mb-1">
                Upload PDF
              </label>
              <div className="mt-1 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  id="pdf-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleUpload}
                  disabled={isLoadingUpload || !selectedFile}
                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  {isLoadingUpload ? (
                    <Loader2 size={20} className="animate-spin mr-2" />
                  ) : (
                    <UploadCloud size={20} className="mr-2" />
                  )}
                  Upload
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="flex items-center p-3 text-sm text-red-300 bg-red-500/20 rounded-lg border border-red-500/30" role="alert">
                <AlertCircle size={20} className="mr-2" />
                <span>{uploadError}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="flex items-center p-3 text-sm text-green-300 bg-green-500/20 rounded-lg border border-green-500/30" role="alert">
                <CheckCircle size={20} className="mr-2" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadedDocument && (
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold text-purple-300 mb-2 flex items-center">
                  <FileText size={20} className="mr-2" /> Active Document
                </h3>
                <p className="text-sm text-gray-300">
                  <span className="font-medium">File:</span> {uploadedDocument.filename}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-medium">ID:</span> {uploadedDocument.id}
                </p>
                <p className="text-xs text-gray-400 mt-2">You can now ask questions about this document in the chat window.</p>
              </div>
            )}
              {!uploadedDocument && !isLoadingUpload && (
                <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                    <FileText size={30} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400">No document processed yet.</p>
                    <p className="text-xs text-gray-500">Upload a PDF to start chatting.</p>
                </div>
            )}
          </div>


          {/* Right Panel: Chat Window */}
          <div className="flex-grow flex flex-col p-6 bg-white/5">
            <div ref={chatContainerRef} className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {messages.length === 0 && !isLoadingQuery && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Cpu size={48} className="mb-4 opacity-50" />
                  <p className="text-lg">AI Assistant</p>
                  <p className="text-sm">
                    {uploadedDocument ? `Ask me anything about ${uploadedDocument.filename}!` : "Upload a PDF to begin."}
                  </p>
                </div>
              )}
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
              {isLoadingQuery && (
                <div className="flex justify-start mb-4">
                    <div className="max-w-md p-3 rounded-lg shadow-md bg-white text-gray-800 rounded-bl-none flex items-center">
                    <Loader2 size={20} className="animate-spin mr-3 text-indigo-500" />
                    <span className="text-sm italic">AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {queryError && (
              <div className="mt-4 flex items-center p-3 text-sm text-red-300 bg-red-500/20 rounded-lg border border-red-500/30" role="alert">
                <AlertCircle size={20} className="mr-2" />
                <span>{queryError}</span>
              </div>
            )}

            <form onSubmit={handleQuery} className="mt-6 flex items-center space-x-3 border-t border-white/20 pt-6">
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder={uploadedDocument ? `Ask about ${uploadedDocument.filename}...` : "Upload a PDF first..."}
                disabled={!uploadedDocument || isLoadingQuery}
                className="flex-grow p-3 rounded-lg bg-white/10 border border-white/20 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-gray-400 text-white transition-colors duration-150 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!uploadedDocument || isLoadingQuery || !currentQuestion.trim()}
                className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                aria-label="Send question"
              >
                {isLoadingQuery ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
              </button>
            </form>
          </div>
        </div>
      </div>
        <footer className="text-center mt-4">
            <p className="text-xs text-gray-400">
                PDF Chat AI &copy; {new Date().getFullYear()}.
                <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer" className="ml-1 hover:text-purple-400 underline">
                    View on GitHub
                </a>
            </p>
        </footer>
    </div>
  );
}

export default App;

