
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const xlsxPath = 'e:/project/project/tamil_real_50_songs.csv.xlsx';
const csvPath = 'e:/project/project/server/data/songs.csv';

if (fs.existsSync(xlsxPath)) {
    console.log('Reading XLSX file...');
    const workbook = xlsx.readFile(xlsxPath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const csvData = xlsx.utils.sheet_to_csv(worksheet);
    
    // Ensure data directory exists
    const dataDir = path.dirname(csvPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(csvPath, csvData);
    console.log(`Converted XLSX to CSV at ${csvPath}`);
} else {
    console.log('XLSX file not found.');
}
