import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './KD 97 Bank Ledger.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheetName = 'Dashboard';
    console.log(`Inspecting '${sheetName}'...`);

    if (workbook.Sheets[sheetName]) {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`\n--- First 20 Rows of '${sheetName}' ---`);
        for (let i = 0; i < Math.min(20, jsonData.length); i++) {
            console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
        }
    }

} catch (err) {
    console.error("Error reading file:", err);
}
