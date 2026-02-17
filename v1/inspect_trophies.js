import xlsx from 'xlsx';

try {
    const workbook = xlsx.readFile('c:/Users/fmore/.gemini/antigravity/playground/shadow-kuiper/Offseason_KingTrophies_2026.xlsx');

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // raw array of arrays to see headers

    console.log(`--- First 200 rows of sheet '${firstSheetName}' ---`);
    jsonData.slice(0, 200).forEach((row, index) => {
        // Only print rows that might contain week info (string "Week") or data
        if (row.length > 0) {
            console.log(`Row ${index}:`, JSON.stringify(row));
        }
    });

} catch (e) {
    console.error("Error reading file:", e);
}
