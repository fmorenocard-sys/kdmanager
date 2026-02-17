import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './public/Offseason_KingTrophies_2026.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const dashboardSheetName = workbook.SheetNames.find(n => n.includes('Dashboard'));
    console.log("Dashboard Sheet found:", dashboardSheetName);

    if (dashboardSheetName) {
        const sheet = workbook.Sheets[dashboardSheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log("First 50 rows of Dashboard sheet:");
        data.slice(0, 50).forEach((row, index) => {
            console.log(`Row ${index}:`, JSON.stringify(row));
        });
    } else {
        console.log("Dashboard sheet not found!");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
