import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'KD 97 Bank Ledger.xlsx');

console.log(`Reading file from: ${filePath}`);

try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames.find(n => n.includes('Weekly'));
    if (sheetName) {
        console.log(`\n--- Sheet Found: "${sheetName}" ---`);
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`Total Rows: ${json.length}`);
        // Print first 10 rows to find the headers
        for (let i = 0; i < 10; i++) {
            console.log(`Row ${i}:`, JSON.stringify(json[i]));
        }
    } else {
        console.log("Weekly Contribution sheet NOT FOUND");
    }

} catch (err) {
    console.error("Error reading file:", err.message);
}
