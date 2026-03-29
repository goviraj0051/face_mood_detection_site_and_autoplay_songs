import Database from 'better-sqlite3';

const db = new Database('e:/project/project/server/data/songs.db');

// Delete duplicates
db.exec('DELETE FROM songs WHERE id > 49');

// Map fixed paths
const updates = [
    { title: 'Maruvaarthai', path: 'Maru-Varthai-Pesathey-MassTamilan.com.mp3' },
    { title: 'Kutty Story', path: 'Kutti-Story-MassTamilan.io.mp3' },
    { title: 'Ilaya Nila', path: 'Ilaiya Nila.mp3' },
    { title: 'Pachai Nirame', path: 'Pachchai-Nirame.mp3' },
    { title: 'Oru Deivam Thantha Poove', path: 'Kannathil-MuthamittalF.mp3' },
    { title: 'Aaromale', path: 'Aaoromale.mp3' },
    { title: 'Kannalane', path: 'Kannalanae Enadhu.mp3' }
];

const stmt = db.prepare('UPDATE songs SET file_path = ? WHERE title = ?');
for (const u of updates) {
    stmt.run(u.path, u.title);
}

console.log("Database duplicates removed and paths mapped properly.");
