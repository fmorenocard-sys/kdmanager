import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './public/Top 300 14_2_2026.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Find the player sheet (contains "14_2")
    const playerSheetName = workbook.SheetNames.find(n => n.includes('14_2'));
    console.log("Player Sheet Name:", playerSheetName);

    if (playerSheetName) {
        const sheet = workbook.Sheets[playerSheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length > 0) {
            console.log("Headers (Row 0):", jsonData[0]);
            console.log("First Row Data (Row 1):", jsonData[1]);
        }
    } else {
        console.log("Player sheet not found!");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
