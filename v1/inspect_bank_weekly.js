import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './KD 97 Bank Ledger.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    console.log("Raw Sheet Names:", workbook.SheetNames);
    console.log("Sheet Names with quotes:", workbook.SheetNames.map(n => `'${n}'`));

    // Try to find "Weekly Deposit" with fuzzy matching
    let targetSheet = workbook.SheetNames.find(n => n.trim() === 'Weekly Deposit');

    if (!targetSheet) {
        console.log("Exact match for 'Weekly Deposit' failed. Trying case-insensitive...");
        targetSheet = workbook.SheetNames.find(n => n.toLowerCase().includes('weekly'));
    }

    if (targetSheet) {
        console.log(`Found target sheet: '${targetSheet}'`);
        const sheet = workbook.Sheets[targetSheet];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`\n--- First 20 Rows of '${targetSheet}' ---`);
        for (let i = 0; i < Math.min(20, jsonData.length); i++) {
            console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
        }
    } else {
        console.log("Could not find any sheet resembling 'Weekly Deposit'.");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
