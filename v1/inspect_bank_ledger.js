import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './KD 97 Bank Ledger.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    console.log("Sheet Names:", workbook.SheetNames);

    // Initial inspection of first sheet
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Header 1 means array of arrays

    console.log(`\n--- First Few Rows of '${firstSheetName}' ---`);
    for (let i = 0; i < Math.min(15, jsonData.length); i++) {
        console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
    }

} catch (err) {
    console.error("Error reading file:", err);
}
