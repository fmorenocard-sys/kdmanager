import * as XLSX from 'xlsx';
import fs from 'fs';

// Check the other file which likely has the Dashboard data
const filePath = './public/Top 300 14_2_2026.xlsx';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found at ${filePath}`);
        process.exit(1);
    }
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    console.log(`Sheet Names in ${filePath}:`, workbook.SheetNames);
} catch (err) {
    console.error("Error:", err);
}
