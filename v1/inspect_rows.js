import xlsx from 'xlsx';

try {
    const workbook = xlsx.readFile('c:/Users/fmore/.gemini/antigravity/playground/shadow-kuiper/KD 97 Deadweight.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Get range to ensure we can read specific rows
    const jsonData = xlsx.utils.sheet_to_json(sheet, { range: 2, header: 0 }); // range: 2 to skip first 2 header lines

    // Log rows around 190 (index ~187-189 depending on how 0-indexed logic works)
    console.log("--- Rows around index 185-195 ---");
    for (let i = 185; i < 195; i++) {
        if (jsonData[i]) {
            console.log(`Index ${i}:`, JSON.stringify(jsonData[i]));
        }
    }
} catch (e) {
    console.error("Error reading file:", e);
}
