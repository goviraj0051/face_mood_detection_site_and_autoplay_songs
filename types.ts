
export interface Song {
  id?: number;
  title: string;
  artist: string;
  movie?: string;
  year?: number;
  mood?: string;
  reason?: string;
  moodMatch?: string;
  youtubeUrl?: string;
  youtubeVideoId: string;
  filePath?: string;
}

export interface MoodAnalysis {
  mood: string;
  confidence: number;
  description: string;
  recommendations: Song[];
  color: string;
  isBlurred?: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
