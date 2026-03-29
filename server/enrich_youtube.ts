import Database from 'better-sqlite3';
import { GoogleGenAI, SchemaType } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.join(__dirname, 'data', 'songs.db');
const db = new Database(dbPath);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env');
    process.exit(1);
}

const genAI = new GoogleGenAI(apiKey);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
    }
});

async function main() {
    const songs = db.prepare('SELECT id, title, artist, movie FROM songs WHERE youtubeVideoId IS NULL').all() as any[];
    console.log(`Found ${songs.length} songs without YouTube IDs.`);

    if (songs.length === 0) return;

    // Process in batches of 10 to avoid token limits and keep it manageable
    const batchSize = 10;
    for (let i = 0; i < songs.length; i += batchSize) {
        const batch = songs.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} / ${Math.ceil(songs.length / batchSize)}...`);

        const prompt = `
            Find the official 11-character YouTube video IDs for the following Tamil songs. 
            Return a JSON object where keys are the song IDs and values are the YouTube IDs.
            
            SONGS:
            ${batch.map(s => `ID: ${s.id}, Title: ${s.title}, Artist: ${s.artist}, Movie: ${s.movie}`).join('\n')}
            
            Example Format:
            {
               "1": "dQw4w9WgXcQ",
               "2": "x1y2z3a4b5c"
            }
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const idMap = JSON.parse(text);

            const update = db.prepare('UPDATE songs SET youtubeVideoId = ? WHERE id = ?');
            const transaction = db.transaction((map: Record<string, string>) => {
                for (const [songId, ytId] of Object.entries(map)) {
                    if (ytId && ytId.length === 11) {
                         update.run(ytId, songId);
                    }
                }
            });

            transaction(idMap);
            console.log(`Updated batch ${i / batchSize + 1}.`);
        } catch (err) {
            console.error(`Error processing batch ${i/batchSize + 1}:`, err);
        }
    }

    console.log('Enrichment complete!');
}

main();
