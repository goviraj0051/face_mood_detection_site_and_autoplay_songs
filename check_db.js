
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'server', 'data', 'songs.db');
const db = new Database(dbPath);

const songs = db.prepare('SELECT * FROM songs LIMIT 5').all();
console.log(JSON.stringify(songs, null, 2));
db.close();
