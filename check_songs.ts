import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = 'e:/project/project/server/data/songs.db';
const songsDir = 'e:/project/project/Main songs';

if (!fs.existsSync(dbPath)) {
    console.error('Database not found at', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);
const songs = db.prepare('SELECT * FROM songs').all() as any[];

console.log(`Checking ${songs.length} songs in DB against files in ${songsDir}...`);

const files = fs.readdirSync(songsDir);
console.log(`Found ${files.length} files in Main songs directory.`);

let foundCount = 0;
songs.forEach(song => {
    const fileName = song.file_path ? path.basename(song.file_path) : '';
    if (fileName && files.includes(fileName)) {
        foundCount++;
    } else {
        // Try to find by title?
        const cleanTitle = (song.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = files.find(f => {
            const cleanFile = f.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanFile.includes(cleanTitle) || cleanTitle.includes(cleanFile.replace('mp3', ''));
        });
        
        if (match) {
            console.log(`Missing EXACT file for "${song.title}" (expected ${fileName}), but found potential match: ${match}`);
        } else {
             console.log(`Missing ANY file for "${song.title}" (expected ${fileName})`);
        }
    }
});

console.log(`\nMatched ${foundCount} / ${songs.length} songs EXACTLY.`);
