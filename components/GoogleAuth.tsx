
import React, { useState, useEffect, useCallback } from 'react';
import { CheckIcon } from './Icons';

// These are types from the Google Identity Services library
// It's better to define them to have type safety

// FIX: Redefined TokenResponse to correctly handle both success and error cases from the Google Identity API.
// This union type allows for type-safe access to properties in both scenarios.
interface TokenSuccessResponse {
    access_token: string;
    expires_in: number;
    scope: string;
}
interface TokenErrorResponse {
    error: string;
}
export type TokenResponse = TokenSuccessResponse | TokenErrorResponse;

export interface TokenClient {
    requestAccessToken: (overrideConfig?: { prompt: string }) => void;
    callback: (response: TokenResponse) => void;
}

declare const google: any;

const CLIENT_ID = '1024935146829-rs8dkid3kpj50jmmlo7c6u85ns9bv6hc.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

interface GoogleAuthProps {
  onAuthChange: (client: TokenClient | null, isAuthenticated: boolean) => void;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onAuthChange }) => {
    const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState<string|null>(null);

    const handleAuthCallback = useCallback((resp: TokenResponse) => {
        // Store the latest response globally for the API service to access.
        // This is now the single source of truth for token responses.
        (window as any).googleTokenResponse = resp;

        if ('error' in resp) {
            setError(`Authentication error: ${resp.error}`);
            setIsAuthenticated(false);
            onAuthChange(tokenClient, false);
            return;
        }
        setIsAuthenticated(true);
        setError(null);
        onAuthChange(tokenClient, true);
    }, [onAuthChange, tokenClient]);
    
    useEffect(() => {
        if (typeof google === 'undefined' || !google.accounts) {
            console.warn("Google Identity Services script not loaded yet.");
            return;
        }

        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: handleAuthCallback,
            });
            setTokenClient(client);
            onAuthChange(client, false); 
        } catch (e: any) {
            setError("Failed to initialize Google Auth client. Please ensure you're online and not blocking third-party scripts.");
            console.error("Error initializing Google Auth:", e);
        }
    }, [handleAuthCallback, onAuthChange]);

    const handleAuthClick = () => {
        if (tokenClient) {
            // Prompt the user to grant access
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            setError("Google Auth client is not ready. Please try again in a moment.");
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col justify-between">
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-800">Connect to Google</h2>
                <p className="text-sm text-gray-600 mb-4">
                    To upload images to Drive and update your sheet, please connect your Google account.
                </p>
                <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
                    <li>This will request permission to create files in your Google Drive.</li>
                    <li>It will also request permission to edit the Google Sheet you provide.</li>
                </ul>
            </div>

            <div className="w-full text-right pt-4">
                {isAuthenticated ? (
                    <div className="flex items-center justify-end text-green-600 font-semibold">
                        <CheckIcon className="w-6 h-6 mr-2" />
                        <span>Successfully Connected</span>
                    </div>
                ) : (
                    <button
                        onClick={handleAuthClick}
                        disabled={!tokenClient}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        Connect Google Account
                    </button>
                )}
                {error && <p className="mt-2 text-xs text-red-500 text-right">{error}</p>}
            </div>
        </div>
    );
};

export default GoogleAuth;
