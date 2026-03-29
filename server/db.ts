console.log('Loading db.ts...');
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'songs.db');
const db = new Database(dbPath);

// Initialize database
export function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            movie TEXT,
            year INTEGER,
            genre TEXT,
            mood TEXT,
            file_path TEXT,
            youtubeVideoId TEXT,
            UNIQUE(title, artist)
        )
    `);

    // Migration from CSV if table is empty
    const count = db.prepare('SELECT COUNT(*) as count FROM songs').get() as { count: number };
    console.log(`Database has ${count.count} songs.`);
    if (count.count === 0) {
        migrateFromCsv();
    }
    // Always sync with Main songs folder
    syncWithMainSongs();
}

function syncWithMainSongs() {
    const songsDir = path.join(__dirname, '..', 'Main songs');
    if (!fs.existsSync(songsDir)) return;

    const files = fs.readdirSync(songsDir);
    const songs = db.prepare('SELECT * FROM songs').all() as any[];
    
    console.log(`Syncing ${songs.length} DB entries with ${files.length} local files...`);
    
    let updateCount = 0;
    const update = db.prepare('UPDATE songs SET file_path = ? WHERE id = ?');
    
    songs.forEach(song => {
        const cleanTitle = song.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Specialized clean for common spelling variations
        const cleanTitleAlt = cleanTitle.replace('ilaya', 'ilaiya');
        
        const match = files.find(f => {
            const cleanFile = f.toLowerCase().replace(/[^a-z0-9]/g, '').replace('mp3', '');
            return cleanFile === cleanTitle || 
                   cleanFile === cleanTitleAlt ||
                   cleanFile.includes(cleanTitle) || 
                   cleanTitle.includes(cleanFile);
        });

        if (match) {
            if (song.file_path !== match) {
                update.run(match, song.id);
                updateCount++;
            }
        } else if (song.file_path && song.file_path.includes('songs/')) {
            // Clean up old invalid paths
            update.run(null, song.id);
            updateCount++;
        }
    });
    
    console.log(`Updated ${updateCount} song paths in database mapping to local files.`);
}


function migrateFromCsv() {
    const csvPath = path.join(__dirname, 'data', 'songs.csv.xlsx');

    if (fs.existsSync(csvPath)) {
        console.log('Loading songs from CSV...');
        const workbook = xlsx.readFile(csvPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const songs = xlsx.utils.sheet_to_json(sheet) as any[];

        const insert = db.prepare(`
            INSERT OR IGNORE INTO songs (title, artist, movie, year, genre, mood, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((songs) => {
            for (const song of songs) {
                insert.run(
                    String(song.Title || song.title || ''), 
                    String(song.Artist || song.artist || ''), 
                    String(song.Movie || song.movie || ''), 
                    song.Year || song.year || 0, 
                    String(song.Genre || song.genre || ''), 
                    String(song.Mood || song.mood || ''), 
                    String(song.File_Path || song.file_path || '')
                );
            }
        });

        insertMany(songs);
        console.log(`Synchronized songs from CSV to SQLite`);
    } else {
        console.warn('songs.csv not found at', csvPath);
    }
}

export interface DBSong {
    id: number;
    title: string;
    artist: string;
    movie: string;
    year: number;
    genre: string;
    mood: string;
    file_path: string;
    youtubeVideoId?: string;
}

export function getAllSongs(): DBSong[] {
    return db.prepare('SELECT * FROM songs').all() as DBSong[];
}

export function searchSongsByMood(mood: string): DBSong[] {
    return db.prepare('SELECT * FROM songs WHERE mood LIKE ?').all(`%${mood}%`) as DBSong[];
}

export function addSong(song: Omit<DBSong, 'id'>) {
    const insert = db.prepare(`
        INSERT INTO songs (title, artist, movie, year, mood, youtubeVideoId)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    return insert.run(song.title, song.artist, song.movie, song.year, song.mood, song.youtubeVideoId);
}

export function updateSongYoutubeId(id: number, youtubeVideoId: string) {
    const update = db.prepare('UPDATE songs SET youtubeVideoId = ? WHERE id = ?');
    return update.run(youtubeVideoId, id);
}

export default db;
