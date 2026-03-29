console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);
const fs = require('fs');
const path = require('path');
const dbPath = 'e:/project/project/server/data/songs.db';
console.log('Checking dbPath:', dbPath);
console.log('Exists:', fs.existsSync(dbPath));
