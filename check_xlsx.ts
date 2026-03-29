import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = 'e:/project/project/server/data/songs.csv.xlsx';
const workbook = xlsx.readFile(csvPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const songs = xlsx.utils.sheet_to_json(sheet) as any[];

console.log(JSON.stringify(songs.slice(0, 3), null, 2));
