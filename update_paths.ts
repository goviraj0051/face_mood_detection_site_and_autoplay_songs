import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = 'e:/project/project/server/data/songs.db';
const songsDir = 'e:/project/project/Main songs';

if (!fs.existsSync(dbPath)) {
    console.error('Database not found');
    process.exit(1);
}

const db = new Database(dbPath);
const songs = db.prepare('SELECT * FROM songs').all() as any[];
const files = fs.readdirSync(songsDir);

console.log(`Analyzing ${songs.length} DB songs against ${files.length} local files...`);

let updateCount = 0;
songs.forEach(song => {
    // Try to find a match for this song in the files
    const cleanTitle = song.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = files.find(f => {
        const cleanFile = f.toLowerCase().replace(/[^a-z0-9]/g, '').replace('mp3', '');
        return cleanFile === cleanTitle || cleanFile.includes(cleanTitle) || cleanTitle.includes(cleanFile);
    });

    if (match) {
        if (song.file_path !== match) {
            console.log(`Updating "${song.title}": ${song.file_path} -> ${match}`);
            db.prepare('UPDATE songs SET file_path = ? WHERE id = ?').run(match, song.id);
            updateCount++;
        }
    } else {
        console.log(`No file found for: "${song.title}"`);
    }
});

console.log(`\nUpdated ${updateCount} songs in database.`);
