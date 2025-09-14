import { Article, GenerationStatus, SheetInfo } from '../types';

/**
 * A simple CSV parser to handle comma-separated values, including quoted strings.
 */
const parseCSV = (csv: string): string[][] => {
    const lines = csv.replace(/\r/g, '').split('\n');
    const result: string[][] = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const row: string[] = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuote && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());
        result.push(row);
    }
    return result;
};


/**
 * Fetches and parses data from a public Google Sheet URL.
 * It accepts both "Published to the web" CSV links and standard editor URLs.
 */
export const fetchAndParseSheet = async (url: string): Promise<{ articles: Article[], sheetInfo: SheetInfo }> => {
    try {
        let csvUrl = url;
        let spreadsheetId = '';
        let gid: string | null = null;

        const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch) {
            spreadsheetId = sheetIdMatch[1];
        } else {
            throw new Error("Could not parse Spreadsheet ID from URL. Please provide a standard Google Sheet URL.");
        }
        
        const gidMatch = url.match(/#gid=([0-9]+)/);
        if (gidMatch) {
            gid = gidMatch[1];
        }

        // If the user provides a standard sheet URL, attempt to convert it to a CSV export URL.
        if (url.includes('/spreadsheets/d/') && (url.includes('/edit') || !url.includes('output=csv'))) {
            csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
            if (gid) {
                csvUrl += `&gid=${gid}`;
            }
        } else if (!url.includes('output=csv')) {
             throw new Error("Invalid URL. Please provide a standard Google Sheet URL or a 'Published to the web' CSV link.");
        }

        const response = await fetch(csvUrl);
        if (!response.ok) {
             throw new Error(`Failed to fetch sheet data. Status: ${response.status}. Please ensure the sheet is public or accessible to anyone with the link.`);
        }

        const csvData = await response.text();
        const data = parseCSV(csvData);

        if (!data || data.length < 2) {
            throw new Error("Sheet is empty or contains only a header row.");
        }

        const originalHeader = data[0].map(h => h.trim());
        const lowerCaseHeader = originalHeader.map(h => h.toLowerCase());
        
        let instructionIndex = lowerCaseHeader.indexOf('news writing instructions');
        if (instructionIndex === -1) {
            instructionIndex = lowerCaseHeader.indexOf('writing instructions'); // Fallback
        }
        
        const topicIndex = lowerCaseHeader.indexOf('topic sentence');
        const imageIndex = lowerCaseHeader.indexOf('image header field');
        const promptIndex = lowerCaseHeader.indexOf('image prompt');

        const requiredHeaders = [
            { name: '"News Writing Instructions" or "Writing Instructions"', found: instructionIndex > -1 },
            { name: '"Topic Sentence"', found: topicIndex > -1 },
            { name: '"Image Prompt"', found: promptIndex > -1 },
            { name: '"Image header field"', found: imageIndex > -1 }
        ];

        const missingHeaders = requiredHeaders.filter(h => !h.found).map(h => h.name);

        if (missingHeaders.length > 0) {
            throw new Error(`Sheet is missing required headers: ${missingHeaders.join(', ')}. Found headers: ${originalHeader.join(', ')}`);
        }

        const articles = data.slice(1).map((row, index) => ({
            id: index,
            newsWritingInstructions: row[instructionIndex] || '',
            topicSentence: row[topicIndex] || '',
            imagePrompt: row[promptIndex] || '',
            imageHeader: row[imageIndex] || '',
            generationStatus: GenerationStatus.Idle,
            generatedImage: null,
            errorMessage: null,
            generationMessage: null,
        })).filter(article => article.newsWritingInstructions && article.topicSentence && article.imagePrompt);

        const sheetInfo: SheetInfo = {
            spreadsheetId,
            gid,
            imageHeaderColumnIndex: imageIndex,
        };

        return { articles, sheetInfo };

    } catch (error: any) {
        console.error("Error fetching or parsing sheet:", error);
        throw new Error(error.message || "An unknown error occurred while processing the sheet.");
    }
};
