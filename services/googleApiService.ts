
import { Article, SheetInfo, GenerationStatus } from '../types';
import { TokenClient, TokenResponse } from '../components/GoogleAuth';

// FIX: Declare the global 'google' object from the Google Identity Services script to resolve TypeScript errors.
declare const google: any;

const FOLDER_NAME = 'News Feature Images';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

interface UploadParams {
    tokenClient: TokenClient;
    sheetInfo: SheetInfo;
    article: Article;
    onStateChange: (status: GenerationStatus, message: string) => void;
}

// Helper to convert base64 to a Blob
const base64ToBlob = (base64: string, contentType: string = 'image/jpeg'): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
};

// 1. Find or create the target folder in Google Drive
const getOrCreateFolder = async (accessToken: string): Promise<string> => {
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    
    const query = encodeURIComponent(`mimeType='${FOLDER_MIME_TYPE}' and name='${FOLDER_NAME}' and trashed=false`);
    let response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, { headers });
    
    let data = await response.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }

    const folderMetadata = { name: FOLDER_NAME, mimeType: FOLDER_MIME_TYPE };
    response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(folderMetadata),
    });

    data = await response.json();
    if (!response.ok) throw new Error(`Failed to create Drive folder: ${data.error?.message || 'Unknown error'}`);
    return data.id;
};

// 2. Upload the image file to the folder
const uploadImageToDrive = async (base64Image: string, articleId: number, folderId: string, accessToken: string): Promise<string> => {
    const blob = base64ToBlob(base64Image);
    const metadata = {
        name: `news_feature_image_${articleId}.jpeg`,
        parents: [folderId],
        mimeType: 'image/jpeg',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Failed to upload image: ${data.error?.message || 'Unknown error'}`);
    return data.id;
};

// 3. Make the file public and get its web link
const makePublicAndGetLink = async (fileId: string, accessToken: string): Promise<string> => {
    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(`Failed to get public link: ${data.error?.message || 'Unknown error'}`);
    return data.webViewLink;
};

// 4. Get sheet name from GID
const getSheetName = async (spreadsheetId: string, gid: string | null, accessToken: string): Promise<string> => {
    if (!gid) { 
        return 'Sheet1'; 
    }
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(`Failed to get sheet properties: ${data.error?.message || 'Unknown error'}`);

    const sheet = data.sheets.find((s: any) => s.properties.sheetId == gid);
    if (!sheet) throw new Error(`Could not find a sheet with GID ${gid} in the spreadsheet.`);
    return sheet.properties.title;
};

// 5. Update the Google Sheet with the new URL
const updateSheet = async (
    { spreadsheetId, gid, imageHeaderColumnIndex }: SheetInfo,
    rowIndex: number,
    imageUrl: string,
    accessToken: string
) => {
    const sheetName = await getSheetName(spreadsheetId, gid, accessToken);
    const colLetter = String.fromCharCode(65 + imageHeaderColumnIndex);
    const range = `'${sheetName}'!${colLetter}${rowIndex + 2}`;
    
    const body = { values: [[imageUrl]] };

    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(`Failed to update sheet: ${data.error?.message || 'Unknown error'}`);
};

/**
 * Requests a new access token and waits for the main callback in GoogleAuth.tsx to populate it.
 * This avoids race conditions and callback reassignment issues.
 */
const getRequiredAccessToken = (tokenClient: TokenClient): Promise<string> => {
    const existingTokenResponse = (window as any).googleTokenResponse as TokenResponse | undefined;
    if (existingTokenResponse && 'access_token' in existingTokenResponse) {
        return Promise.resolve(existingTokenResponse.access_token);
    }
    
    return new Promise((resolve, reject) => {
        const timeout = 20000; // 20 seconds
        const interval = 200;
        let elapsedTime = 0;

        const pollForToken = setInterval(() => {
            const resp = (window as any).googleTokenResponse as TokenResponse | undefined;
            if (resp) {
                clearInterval(pollForToken);
                if ('access_token' in resp) {
                    resolve(resp.access_token);
                } else {
                    reject(new Error(resp.error || 'Authorization failed.'));
                }
            }
            elapsedTime += interval;
            if (elapsedTime >= timeout) {
                clearInterval(pollForToken);
                reject(new Error('Authorization timed out. Please try again.'));
            }
        }, interval);

        // Clear previous response before making a new request
        (window as any).googleTokenResponse = null;
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};


// Main orchestrator function
export const uploadImageAndUpdateSheet = async ({ tokenClient, sheetInfo, article, onStateChange }: UploadParams): Promise<string> => {
    if (!article.generatedImage) throw new Error("Article has no generated image to upload.");

    const accessToken = await getRequiredAccessToken(tokenClient);

    onStateChange(GenerationStatus.UPLOADING, 'Finding or creating Drive folder...');
    const folderId = await getOrCreateFolder(accessToken);

    onStateChange(GenerationStatus.UPLOADING, 'Uploading image to Drive...');
    const fileId = await uploadImageToDrive(article.generatedImage, article.id, folderId, accessToken);

    onStateChange(GenerationStatus.UPLOADING, 'Making image public...');
    const driveLink = await makePublicAndGetLink(fileId, accessToken);
    
    onStateChange(GenerationStatus.UPDATING_SHEET, 'Updating Google Sheet...');
    await updateSheet(sheetInfo, article.id, driveLink, accessToken);

    return driveLink;
};
