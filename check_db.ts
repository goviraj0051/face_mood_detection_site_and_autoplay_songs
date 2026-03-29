import db from './server/db.ts';
const songs = db.prepare('SELECT id, title, artist, file_path FROM songs').all();
console.table(songs);
