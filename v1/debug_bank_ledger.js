import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'KD 97 Bank Ledger.xlsx');

console.log(`Reading file from: ${filePath}`);

try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    console.log("Workbook Sheet Names:", workbook.SheetNames);

    const checkSheet = (name) => {
        const sheetName = workbook.SheetNames.find(n => n.trim().toLowerCase() === name.toLowerCase() || n.toLowerCase().includes(name.toLowerCase()));
        if (sheetName) {
            console.log(`\n--- Sheet Found: "${sheetName}" ---`);
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            console.log(`Total Rows: ${json.length}`);
            if (json.length > 0) {
                console.log("Row 0 (Header):", JSON.stringify(json[0]));
                console.log("Row 1:", JSON.stringify(json[1]));
                console.log("Row 2:", JSON.stringify(json[2]));
            }
        } else {
            console.log(`\n--- Sheet "${name}" NOT FOUND ---`);
        }
    }

    checkSheet('Weekly Contribution');
    checkSheet('Dashboard');

} catch (err) {
    console.error("Error reading file:", err.message);
}
