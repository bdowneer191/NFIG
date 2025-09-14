
import React, { useState } from 'react';
import SheetProcessor from './components/SheetProcessor';
import { GithubIcon } from './components/Icons';
import ApiConfig from './components/ApiConfig';
import GoogleAuth, { TokenClient } from './components/GoogleAuth';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [keysSaved, setKeysSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);

  const handleSaveKeys = (newApiKey: string) => {
    setApiKey(newApiKey);
    setKeysSaved(true);
    setError(null);
  };
  
  const handleAuthChange = (client: TokenClient | null, isAuthenticated: boolean) => {
    setTokenClient(client);
    setIsGoogleAuthenticated(isAuthenticated);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <h1 className="text-2xl font-bold text-gray-900">
              News Feature Image Generator
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/google/generative-ai-docs/tree/main/site/en/gemini-api/docs/applications/prompting_images"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="GitHub Repository"
            >
              <GithubIcon className="w-7 h-7" />
            </a>
          </div>
        </nav>
      </header>
      
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <ApiConfig 
              onSave={handleSaveKeys} 
              initialApiKey={apiKey}
            />
            <GoogleAuth onAuthChange={handleAuthChange} />
        </div>
        
        {error && <p className="text-center text-red-600 bg-red-100 p-4 rounded-lg mb-6">{error}</p>}
        
        {keysSaved ? (
            <SheetProcessor 
              apiKey={apiKey} 
              tokenClient={tokenClient}
              isGoogleAuthenticated={isGoogleAuthenticated}
            />
          ) : (
            <div className="text-center bg-yellow-50 text-yellow-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-2">Configuration Required</h2>
              <p>Please enter and save your Gemini API key above to proceed.</p>
            </div>
        )}
      </main>

      <footer className="text-center py-4 mt-8 text-gray-500 text-sm">
        <p>Powered by React, Tailwind CSS, and the Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;
