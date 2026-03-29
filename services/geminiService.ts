import { MoodAnalysis, Song } from "../types";

const API_URL = 'http://localhost:3005/api';



export const analyzeMoodFromImage = async (base64Image: string): Promise<MoodAnalysis> => {
  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Image }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error: any = new Error(data.error || 'Failed to analyze mood from backend');
    error.details = data.details;
    throw error;
  }

  return await response.json() as MoodAnalysis;
};

export const getAllSongs = async (): Promise<Song[]> => {
  const response = await fetch(`${API_URL}/songs`);
  if (!response.ok) {
    throw new Error('Failed to fetch songs library');
  }
  return await response.json() as Song[];
};

export const getMoods = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/moods`);
  if (!response.ok) {
    throw new Error('Failed to fetch available moods');
  }
  return await response.json() as string[];
};

export const recommendSongsByMood = async (mood: string): Promise<MoodAnalysis> => {
    const response = await fetch(`${API_URL}/recommend?mood=${encodeURIComponent(mood)}`);
    if (!response.ok) {
        throw new Error('Failed to get mood recommendations');
    }
    return await response.json() as MoodAnalysis;
};


export const getLyrics = async (songTitle: string, artist: string): Promise<string> => {
  const response = await fetch(`${API_URL}/lyrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ songTitle, artist }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to get lyrics from backend');
  }

  const data = await response.json();
  return data.lyrics;
};
