import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './KD 97 Bank Ledger.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets['Dashboard'];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`\n--- First 5 Rows of 'Dashboard' ---`);
    for (let i = 0; i < 5; i++) {
        console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
    }

} catch (err) {
    console.error("Error reading file:", err);
}
