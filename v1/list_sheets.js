import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './public/Offseason_KingTrophies_2026.xlsx';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found at ${filePath}`);
        process.exit(1);
    }
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    console.log("Sheet Names:", workbook.SheetNames);
} catch (err) {
    console.error("Error:", err);
}
