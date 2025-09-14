import React, { useState, useCallback } from 'react';
import { Article, GenerationStatus, SheetInfo } from '../types';
import { fetchAndParseSheet } from '../services/sheetService';
import { generateImage, generateSafeImagePrompt, getGoogleSearchContext } from '../services/geminiService';
import { uploadImageAndUpdateSheet } from '../services/googleApiService';
import Loader from './Loader';
import { DownloadIcon, CheckIcon } from './Icons';
import { TokenClient } from './GoogleAuth';


const ArticleCard: React.FC<{ 
    article: Article; 
    onGenerate: (id: number) => void;
    onUpload: (id: number) => void;
    isGoogleAuthenticated: boolean;
}> = ({ article, onGenerate, onUpload, isGoogleAuthenticated }) => {
    const [isErrorDetailsVisible, setIsErrorDetailsVisible] = useState(false);

    const handleDownload = () => {
        if (!article.generatedImage) return;
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${article.generatedImage}`;
        link.download = `news_feature_image_${article.id}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isUploading = article.generationStatus === GenerationStatus.UPLOADING || article.generationStatus === GenerationStatus.UPDATING_SHEET;
    
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-xl">
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Article Data (Row {article.id + 2})</h3>
                        <div className="space-y-4">
                             <div>
                                <h4 className="font-bold text-gray-800">Image Prompt</h4>
                                <p className="text-gray-600 mt-1 text-sm">{article.imagePrompt}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">Topic Sentence</h4>
                                <p className="text-gray-600 mt-1 text-sm">{article.topicSentence}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">Writing Instructions</h4>
                                <p className="text-gray-600 mt-1 text-sm">{article.newsWritingInstructions}</p>
                            </div>
                             {article.imageHeader && (
                                <div>
                                    <h4 className="font-bold text-gray-800">Original Image URL</h4>
                                    <a href={article.imageHeader} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm break-all hover:underline">{article.imageHeader}</a>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4 h-full min-h-[256px]">
                        {article.generationStatus === GenerationStatus.Idle && (
                            <button
                                onClick={() => onGenerate(article.id)}
                                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105"
                            >
                                Generate Image
                            </button>
                        )}
                        {article.generationStatus === GenerationStatus.Loading && (
                            <Loader message={article.generationMessage || 'Generating...'} />
                        )}
                         {isUploading && (
                            <Loader message={article.generationMessage || 'Processing...'} />
                        )}
                        {article.generationStatus === GenerationStatus.Error && (
                             <div className="text-center text-red-600 w-full">
                                <p className="font-semibold">Operation Failed</p>
                                <div className="mt-4 flex justify-center items-center space-x-2">
                                    <button
                                        onClick={() => onGenerate(article.id)}
                                        className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-600"
                                    >
                                        Retry
                                    </button>
                                    {article.errorMessage && (
                                        <button
                                            onClick={() => setIsErrorDetailsVisible(!isErrorDetailsVisible)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-300"
                                            aria-expanded={isErrorDetailsVisible}
                                        >
                                            {isErrorDetailsVisible ? 'Hide Details' : 'Show Details'}
                                        </button>
                                    )}
                                </div>
                                {isErrorDetailsVisible && article.errorMessage && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg text-left text-xs text-red-800 overflow-y-auto max-h-40">
                                        <pre className="whitespace-pre-wrap font-mono">{article.errorMessage}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                        {article.generationStatus === GenerationStatus.UPLOAD_ERROR && (
                             <div className="text-center text-red-600 w-full">
                                <p className="font-semibold">Upload Failed</p>
                                <div className="mt-4 flex justify-center items-center space-x-2">
                                    <button
                                        onClick={() => onUpload(article.id)}
                                        className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-600"
                                    >
                                        Retry Upload
                                    </button>
                                     {article.uploadErrorMessage && (
                                        <button
                                            onClick={() => setIsErrorDetailsVisible(!isErrorDetailsVisible)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-300"
                                            aria-expanded={isErrorDetailsVisible}
                                        >
                                            {isErrorDetailsVisible ? 'Hide Details' : 'Show Details'}
                                        </button>
                                    )}
                                </div>
                                {isErrorDetailsVisible && article.uploadErrorMessage && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg text-left text-xs text-red-800 overflow-y-auto max-h-40">
                                        <pre className="whitespace-pre-wrap font-mono">{article.uploadErrorMessage}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                        {(article.generationStatus === GenerationStatus.SUCCESS || article.generationStatus === GenerationStatus.UPLOAD_SUCCESS) && article.generatedImage && (
                           <div className="w-full text-center">
                                <img
                                    src={`data:image/jpeg;base64,${article.generatedImage}`}
                                    alt="Generated news feature"
                                    className="rounded-lg object-cover w-full h-auto shadow-lg"
                                />
                                {article.generationStatus === GenerationStatus.UPLOAD_SUCCESS ? (
                                    <div className="mt-4 text-center bg-green-50 p-3 rounded-lg">
                                        <div className="flex items-center justify-center text-green-700">
                                            <CheckIcon className="w-5 h-5 mr-2"/>
                                            <span className="font-semibold text-sm">Sheet Updated Successfully</span>
                                        </div>
                                        <a href={article.driveLink!} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs break-all hover:underline mt-1 block">View on Google Drive</a>
                                    </div>
                                ) : (
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button 
                                            onClick={handleDownload}
                                            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 flex items-center justify-center space-x-2 text-sm"
                                        >
                                            <DownloadIcon className="w-4 h-4" />
                                            <span>Download</span>
                                        </button>
                                        <button 
                                            onClick={() => onUpload(article.id)}
                                            disabled={!isGoogleAuthenticated}
                                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            title={!isGoogleAuthenticated ? "Please connect to Google to enable this feature" : ""}
                                        >
                                            <span>Upload & Update Sheet</span>
                                        </button>
                                    </div>
                                )}
                           </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SheetProcessorProps {
  apiKey: string;
  tokenClient: TokenClient | null;
  isGoogleAuthenticated: boolean;
}

const SheetProcessor: React.FC<SheetProcessorProps> = ({ apiKey, tokenClient, isGoogleAuthenticated }) => {
    const [sheetUrl, setSheetUrl] = useState('');
    const [articles, setArticles] = useState<Article[]>([]);
    const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('imagen-4.0-generate-001');

    const handleFetch = async () => {
        if (!sheetUrl) {
            setError('Please enter a Google Sheet URL.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setArticles([]);
        setSheetInfo(null);

        try {
            const { articles: parsedArticles, sheetInfo: parsedSheetInfo } = await fetchAndParseSheet(sheetUrl);
            setArticles(parsedArticles);
            setSheetInfo(parsedSheetInfo);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateImage = useCallback(async (id: number) => {
        if (!apiKey) {
             setArticles(prev => prev.map(a => a.id === id ? { ...a, generationStatus: GenerationStatus.Error, errorMessage: "Gemini API Key is not configured." } : a));
            return;
        }

        const article = articles.find(a => a.id === id);
        if (!article) return;

        try {
            setArticles(prev => prev.map(a => a.id === id ? { ...a, generationStatus: GenerationStatus.Loading, generationMessage: 'Searching for context...', errorMessage: null } : a));
            const searchContext = await getGoogleSearchContext(article.topicSentence, apiKey);

            setArticles(prev => prev.map(a => a.id === id ? { ...a, generationMessage: 'Analyzing topic & context...' } : a));
            const safePrompt = await generateSafeImagePrompt(article.topicSentence, article.newsWritingInstructions, article.imagePrompt, searchContext, apiKey);
            
            setArticles(prev => prev.map(a => a.id === id ? { ...a, generationMessage: 'Generating image...' } : a));
            const imageB64 = await generateImage(safePrompt, apiKey, selectedModel);
            
            setArticles(prev => prev.map(a => a.id === id ? { ...a, generationStatus: GenerationStatus.SUCCESS, generatedImage: imageB64, generationMessage: null } : a));

        } catch (err: any) {
            setArticles(prev => prev.map(a => a.id === id ? { ...a, generationStatus: GenerationStatus.Error, errorMessage: err.message, generationMessage: null } : a));
        }
    }, [articles, apiKey, selectedModel]);

    const handleGenerateAllImages = async () => {
        setIsGeneratingAll(true);
        const articlesToGenerate = articles.filter(
            a => a.generationStatus === GenerationStatus.Idle || a.generationStatus === GenerationStatus.Error
        );

        // This loop processes articles sequentially. The `await` ensures that
        // handleGenerateImage completes for one article before the next one begins.
        for (const article of articlesToGenerate) {
            await handleGenerateImage(article.id);
        }

        setIsGeneratingAll(false);
    };

    const handleUploadAndUpdate = useCallback(async (id: number) => {
        if (!tokenClient || !sheetInfo) {
            setArticles(prev => prev.map(a => a.id === id ? { ...a, generationStatus: GenerationStatus.UPLOAD_ERROR, uploadErrorMessage: "Authentication or sheet info is missing." } : a));
            return;
        }

        const article = articles.find(a => a.id === id);
        if (!article || !article.generatedImage) return;
        
        const updateState = (status: GenerationStatus, message: string | null, data: Partial<Article> = {}) => {
            setArticles(prev => prev.map(a => a.id === id ? { ...a, generationStatus: status, generationMessage: message, ...data } : a));
        };

        try {
            updateState(GenerationStatus.UPLOADING, 'Uploading image to Google Drive...');
            
            const driveLink = await uploadImageAndUpdateSheet({
                tokenClient,
                sheetInfo,
                article,
                onStateChange: (status, message) => updateState(status, message)
            });

            updateState(GenerationStatus.UPLOAD_SUCCESS, null, { driveLink: driveLink, uploadErrorMessage: null });
        
        } catch (err: any) {
            updateState(GenerationStatus.UPLOAD_ERROR, null, { uploadErrorMessage: err.message });
        }
    }, [articles, tokenClient, sheetInfo]);

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 text-gray-800">2. Enter Google Sheet URL</h2>
                <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-4 rounded-lg border">
                    <p className="font-semibold mb-2">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Use a standard Google Sheet URL (from the address bar, like <code>.../edit#gid=0</code>).</li>
                        <li>Ensure your sheet is shared so that "Anyone with the link can view".</li>
                         <li>
                           To use the "Upload & Update Sheet" feature, you must also grant editor access on the sheet to the Google account you connect with.
                        </li>
                    </ol>
                    <p className="mt-4 pt-3 border-t">
                        Your sheet must contain the following exact column headers: <br />
                        <code className="bg-gray-200 text-gray-800 font-mono text-xs px-1 py-0.5 rounded">News Writing Instructions</code>, <code className="bg-gray-200 text-gray-800 font-mono text-xs px-1 py-0.5 rounded">Topic Sentence</code>, <code className="bg-gray-200 text-gray-800 font-mono text-xs px-1 py-0.5 rounded">Image Prompt</code>, and <code className="bg-gray-200 text-gray-800 font-mono text-xs px-1 py-0.5 rounded">Image header field</code>.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="url"
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="Enter your Google Sheet URL here"
                        className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                    <button
                        onClick={handleFetch}
                        disabled={isLoading}
                        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Fetching...' : 'Fetch Articles'}
                    </button>
                </div>
                 {error && <p className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            </div>

            {isLoading && (
                 <div className="flex justify-center py-10">
                    <Loader message="Fetching and parsing sheet data..." />
                </div>
            )}

            {articles.length > 0 && (
                <div className="space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Image Generation Settings</h2>
                        <div>
                            <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
                                Select Image Model
                            </label>
                            <select
                                id="model-select"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full max-w-xs p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="imagen-4.0-generate-001">Imagen 4.0 (Highest Quality)</option>
                                <option value="imagen-4.0-generate-fast-001">Imagen 4.0 (Fast - Hypothetical)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-2">Choose the model for generating images. Different models may have different costs and generation speeds.</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">3. Generate & Process Images</h2>
                        <button
                            onClick={handleGenerateAllImages}
                            disabled={isGeneratingAll}
                            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isGeneratingAll ? 'Generating...' : 'Generate All Images'}
                        </button>
                    </div>
                    {articles.map(article => (
                        <ArticleCard 
                            key={article.id} 
                            article={article} 
                            onGenerate={handleGenerateImage}
                            onUpload={handleUploadAndUpdate}
                            isGoogleAuthenticated={isGoogleAuthenticated}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SheetProcessor;