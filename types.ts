export enum GenerationStatus {
  Idle = 'IDLE',
  Loading = 'LOADING',
  Error = 'ERROR',
  SUCCESS = 'SUCCESS',
  UPLOADING = 'UPLOADING',
  UPDATING_SHEET = 'UPDATING_SHEET',
  UPLOAD_SUCCESS = 'UPLOAD_SUCCESS',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
}

export interface Article {
  id: number;
  newsWritingInstructions: string;
  topicSentence: string;
  imagePrompt: string; // User-provided prompt from the sheet
  imageHeader: string; // Original value from sheet
  generationStatus: GenerationStatus;
  generatedImage: string | null; // base64 string
  errorMessage: string | null;
  generationMessage?: string | null;
  driveLink?: string | null;
  uploadErrorMessage?: string | null;
}

export interface SheetInfo {
    spreadsheetId: string;
    gid: string | null;
    imageHeaderColumnIndex: number;
}
