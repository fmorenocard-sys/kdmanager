import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './public/Top 300 14_2_2026.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const dashboardSheetName = workbook.SheetNames.find(n => n.includes('Dashboard'));
    console.log("Dashboard Sheet found:", dashboardSheetName);

    if (dashboardSheetName) {
        const sheet = workbook.Sheets[dashboardSheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let foundRow = -1;
        data.forEach((row, index) => {
            if (JSON.stringify(row).includes("Kingdom Stats Scan")) {
                foundRow = index;
                console.log(`FOUND 'Kingdom Stats Scan' at Row ${index}`);
            }
        });

        if (foundRow !== -1) {
            console.log("Dumping 20 rows starting from found row:");
            data.slice(foundRow, foundRow + 20).forEach((row, idx) => {
                console.log(`Row ${foundRow + idx}:`, JSON.stringify(row));
            });
        } else {
            console.log("'Kingdom Stats Scan' NOT FOUND in the first pass.");
            // Dump first few rows just in case
            console.log("First 10 rows:");
            data.slice(0, 10).forEach((row, index) => {
                console.log(`Row ${index}:`, JSON.stringify(row));
            });
        }

    } else {
        console.log("Dashboard sheet not found!");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
