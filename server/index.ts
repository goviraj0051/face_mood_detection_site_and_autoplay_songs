import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";
import { initDb, getAllSongs, addSong, updateSongYoutubeId } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
console.log('Starting server...');

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
});


const app = express();
const port = 3005;



// Initialize Database
console.log('Initializing database...');
initDb();
console.log('Database initialized.');

app.use(morgan('dev'));
app.use(cors());

app.use(express.json({ limit: '50mb' }));
// Serve local songs if directory exists
// Serve local songs from the 'Main songs' directory in the project root
const projectRoot = path.join(__dirname, '..');
const songsDir = path.join(projectRoot, 'Main songs');
if (!fs.existsSync(songsDir)) {
    console.warn(`Main songs directory not found at ${songsDir}. Creating it...`);
    fs.mkdirSync(songsDir, { recursive: true });
}
console.log(`Serving songs from: ${songsDir}`);
app.use('/songs', express.static(songsDir));


if (!process.env.GEMINI_API_KEY) {
    console.error('CRITICAL: GEMINI_API_KEY is missing in .env file');
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });


app.get('/api/songs', (req, res) => {
    try {
        const songs = getAllSongs();
        const mappedSongs = songs.map(s => {
             const normalizedPath = s.file_path ? (s.file_path.includes('\\') || s.file_path.includes('/') ? path.basename(s.file_path) : s.file_path) : '';
             return {
                 ...s,
                 filePath: normalizedPath
             };
        });
        res.json(mappedSongs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/moods', (req, res) => {
    try {
        // Query database directly to get unique moods
        const songs = getAllSongs();
        const moods = Array.from(new Set(songs.map(s => s.mood).filter(Boolean)));
        res.json(moods);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/recommend', (req, res) => {
    try {
        const { mood } = req.query;
        if (!mood || typeof mood !== 'string') {
            return res.status(400).json({ error: 'Mood query parameter is required' });
        }

        const songs = getAllSongs();
        const recommendations = songs.filter(s =>
            s.mood?.toLowerCase().includes(mood.toLowerCase()) ||
            s.genre?.toLowerCase().includes(mood.toLowerCase())
        );

        // Shuffle and limit to 10
        const shuffled = recommendations.sort(() => Math.random() - 0.5).slice(0, 10);

        const response: MoodAnalysis = {
            mood: mood.charAt(0).toUpperCase() + mood.slice(1),
            confidence: 1.0,
            description: `A collection of songs from our library that match the "${mood}" vibe perfectly.`,
            color: getMoodColor(mood.toLowerCase()),
            recommendations: shuffled.map(s => {
                const normalizedPath = s.file_path ? (s.file_path.includes('\\') || s.file_path.includes('/') ? path.basename(s.file_path) : s.file_path) : '';
                return {
                    title: s.title,
                    artist: s.artist,
                    reason: `Selected as a great match for your ${mood} mood from our local Tamil collection.`,
                    moodMatch: mood.charAt(0).toUpperCase() + mood.slice(1),
                    youtubeUrl: `https://www.youtube.com/watch?v=${s.youtubeVideoId || ''}`,
                    youtubeVideoId: s.youtubeVideoId || '',
                    filePath: normalizedPath
                };
            })
        };

        res.json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

function getMoodColor(mood: string): string {
    const m = mood.toLowerCase();
    if (m.includes('happy') || m.includes('joy')) return '#facc15'; // Yellow
    if (m.includes('sad') || m.includes('emotional')) return '#3b82f6'; // Blue
    if (m.includes('love') || m.includes('romantic')) return '#f43f5e'; // Rose
    if (m.includes('mass') || m.includes('energetic')) return '#ea580c'; // Orange
    if (m.includes('melody')) return '#a855f7'; // Purple
    if (m.includes('dance')) return '#ec4899'; // Pink
    return '#6366f1'; // Indigo
}



app.get('/api/models', async (req, res) => {
    try {
        const models = await ai.models.list();
        res.json(models);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Types
interface MoodAnalysis {
    mood: string;
    confidence: number;
    description: string;
    recommendations: Song[];
    color: string;
    isBlurred?: boolean;
}


interface Song {
    title: string;
    artist: string;
    reason: string;
    moodMatch: string;
    youtubeUrl: string;
    youtubeVideoId: string;
    filePath?: string;
}



app.post('/api/analyze', async (req, res) => {
    console.log('Received analyze request');
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            console.warn('Analysis failed: No image provided');
            return res.status(400).json({ error: 'No image provided' });
        }

        // Fetch all available songs from our database (loaded from CSV)
        const availableSongs = getAllSongs();
        
        // Shuffle the available songs before giving to AI to encourage variety if the same mood repeats
        const shuffledAvailableSongs = [...availableSongs].sort(() => Math.random() - 0.5);
        const songsListStr = shuffledAvailableSongs.map(s => `- "${s.title}" by ${s.artist} (Movie: ${s.movie}, Mood: ${s.mood}${s.youtubeVideoId ? `, YouTube ID: ${s.youtubeVideoId}` : ''})`).join('\n');

        // Expanded retry list to handle all possible SDK/API naming variants
        const possibleModels = [
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',

            'models/gemini-2.0-flash',
            'models/gemini-2.5-flash',
            'models/gemini-1.5-flash',
            'models/gemini-1.5-flash-latest'
        ];
        let lastError = null;
        let finalResponse = null;

        for (const model of possibleModels) {
            try {
                console.log(`Attempting analysis with model: ${model}`);
                finalResponse = await ai.models.generateContent({
                    model,
                    contents: {
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                            {
                                text: `
              Analyze the facial expression in this image to detect the user's mood accurately. 
              Be specific and empathetic. 
              
              STRICT MANDATE: Recommend ONLY songs from the following local database of Tamil songs.
              DO NOT recommend songs that are not in this list.
              
              LOCAL SONG DATABASE:
              ${songsListStr}
              
              CRITICAL INSTRUCTIONS:
              1. Detect if the image is too BLURRY. Set "isBlurred" to true if so.
              2. For the recommended songs, you MUST provide the 11-character YouTube Video ID (e.g., "dQw4w9WgXcQ"). 
                 Use the "YouTube ID" if it is already provided in the database above. If not provided, use your knowledge to provide the most accurate official video ID for these specific songs.
              3. For each song, provide a brief empathetic reason why it matches the user's detected mood.
              4. Generate a YouTube search URL as a fallback.
              
              Return the response in structured JSON.
            ` }
                        ]
                    },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                mood: { type: Type.STRING, description: "The primary detected emotion" },
                                confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1" },
                                description: { type: Type.STRING, description: "A brief, empathetic description of what the AI sees" },
                                color: { type: Type.STRING, description: "A hex color code representing this mood" },
                                isBlurred: { type: Type.BOOLEAN, description: "True if the image is out of focus or too blurry to analyze" },
                                recommendations: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            title: { type: Type.STRING },
                                            artist: { type: Type.STRING },
                                            reason: { type: Type.STRING },
                                            moodMatch: { type: Type.STRING },
                                            youtubeUrl: { type: Type.STRING },
                                            youtubeVideoId: { type: Type.STRING, description: "The 11-character YouTube video ID" }
                                        },
                                        required: ["title", "artist", "reason", "moodMatch", "youtubeUrl", "youtubeVideoId"]
                                    }
                                }
                            },
                            required: ["mood", "confidence", "description", "recommendations", "color", "isBlurred"]
                        }
                    }
                });
                if (finalResponse) break;
            } catch (err: any) {
                console.warn(`Model ${model} failed: ${err.message}`);
                lastError = err;
            }
        }

        if (!finalResponse) throw lastError;
        const response = finalResponse;

        const jsonStr = response.text || '{}';
        const analysis = JSON.parse(jsonStr) as MoodAnalysis;

        // Update our database with the youtubeVideoIds Gemini found
        analysis.recommendations = analysis.recommendations.map(rec => {
            const matchedSong = availableSongs.find(s =>
                s.title.toLowerCase() === rec.title.toLowerCase() &&
                s.artist.toLowerCase() === rec.artist.toLowerCase()
            );

            if (matchedSong) {
                if (!matchedSong.youtubeVideoId) {
                    console.log(`Updating YouTube ID for ${rec.title}: ${rec.youtubeVideoId}`);
                    updateSongYoutubeId(matchedSong.id, rec.youtubeVideoId);
                }
                const normalizedPath = matchedSong.file_path ? (matchedSong.file_path.includes('\\') || matchedSong.file_path.includes('/') ? path.basename(matchedSong.file_path) : matchedSong.file_path) : '';
                return { ...rec, filePath: normalizedPath };
            }
            return rec;

        });

        // Shuffle the final recommendations to ensure the order is varied
        analysis.recommendations = analysis.recommendations.sort(() => Math.random() - 0.5);

        console.log('Successfully analyzed mood:', analysis.mood);
        res.json(analysis);
    } catch (error: any) {
        console.error('Error analyzing mood:', error);
        // Clean error for response
        const errorResponse = {
            error: 'Failed to analyze mood',
            details: error.message || String(error),
            code: error.status || error.name,
            raw: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        };
        res.status(500).json(errorResponse);
    }
});

app.post('/api/lyrics', async (req, res) => {
    try {
        const { songTitle, artist } = req.body;

        if (!songTitle || !artist) {
            return res.status(400).json({ error: 'Missing song title or artist' });
        }

        const model = 'gemini-1.5-flash'; // Default fallback for lyrics

        const prompt = `
      Provide the lyrics for the Tamil song "${songTitle}" by "${artist}".
      
      CRITICAL INSTRUCTIONS:
      1. Provide the lyrics in BOTH Tamil script and English transliteration if possible.
      2. If the full lyrics are too long, provide the most iconic parts (Chorus/Pallavi).
      3. Format the output clearly with line breaks.
      4. If you cannot find the exact lyrics, provide a poetic summary of the song's meaning in English and Tamil.
      5. Do not include any conversational text, just the lyrics/summary.
    `;

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [{ text: prompt }]
            }
        });

        res.json({ lyrics: response.text || "Lyrics not available for this song." });
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        res.status(500).json({ error: 'Failed to fetch lyrics' });
    }
});

const server = app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});

server.on('error', (err: any) => {
    console.error('SERVER ERROR AT LISTEN:', err);
    process.exit(1);
});

