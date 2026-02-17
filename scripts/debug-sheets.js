import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const FILES = [
    'SoC_2_StormOfStratagems_2025.xlsx'
];

FILES.forEach(file => {
    const filePath = path.join(process.cwd(), 'public/data', file);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${file}`);
        return;
    }

    console.log(`\n--- Inspecting: ${file} ---`);
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);

    const targetSheet = workbook.Sheets['Performance Analysis'];
    if (targetSheet) {
        const json = XLSX.utils.sheet_to_json(targetSheet, { header: 1 });
        console.log('Headers (Row 1):', json[0]);
        console.log('Headers (Row 2):', json[1]);
        console.log('Data Row 1 (Row 3):', json[2]);
        console.log('Data Row 2 (Row 4):', json[3]);
        console.log('Data Row 3 (Row 5):', json[4]);
    } else {
        console.log('❌ "Performance Analysis" sheet not found.');
    }
});
