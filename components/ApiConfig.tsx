
import React, { useState } from 'react';

interface ApiConfigProps {
  onSave: (apiKey: string) => void;
  initialApiKey: string;
}

const ApiConfig: React.FC<ApiConfigProps> = ({ onSave, initialApiKey }) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isSaved, setIsSaved] = useState(!!initialApiKey);

  const handleSave = () => {
    onSave(apiKey);
    setIsSaved(true);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800">1. Configure Gemini API</h2>
        <p className="text-sm text-gray-600 mb-4">
          Provide your Gemini API Key. It's stored only in your browser for this session.
        </p>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
          Gemini API Key
        </label>
        <div className="mt-1 flex">
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setIsSaved(false); }}
            placeholder="Enter your Gemini API Key"
            className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 text-gray-600 hover:bg-gray-200 rounded-r-lg text-sm font-semibold flex items-center justify-center">
            Get Key
          </a>
        </div>
      </div>
      <div className="flex justify-end items-center pt-4">
          {isSaved && <span className="text-green-600 text-sm mr-4 font-medium">Key saved for session.</span>}
          <button
              onClick={handleSave}
              disabled={!apiKey}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
              Save Key
          </button>
      </div>
    </div>
  );
};

export default ApiConfig;
