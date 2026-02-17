import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './public/Top 300 14_2_2026.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // 2. Parse Kingdom Evolution Data ('Dashboard' tab - "2997 Kingdom Stats Scan")
    const dashSheetName = workbook.SheetNames.find(n => n.includes('Dashboard'));
    console.log("Dashboard Sheet Name:", dashSheetName);

    if (dashSheetName) {
        const sheet = workbook.Sheets[dashSheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log("Total Rows in Dashboard Sheet:", jsonData.length);

        // Find start of "Kingdom Stats Scan" table
        let startRow = -1;
        for (let i = 0; i < jsonData.length; i++) {
            if (JSON.stringify(jsonData[i]).includes("Kingdom Stats Scan")) {
                startRow = i;
                console.log(`Found 'Kingdom Stats Scan' at row index: ${i}`);
                console.log(`Row Content: ${JSON.stringify(jsonData[i])}`);
                break;
            }
        }

        if (startRow !== -1) {
            // Check the next few rows to see where data starts
            console.log("\n--- Checking rows after 'Kingdom Stats Scan' ---");
            for (let j = 1; j <= 5; j++) {
                console.log(`Row ${startRow + j}:`, JSON.stringify(jsonData[startRow + j]));
            }

            const scanDataCandidate = jsonData.slice(startRow + 1);

            const parsedHistory = scanDataCandidate.map((row, idx) => {
                let date = row[1]; // Col 1
                const originalDate = date;

                if (!date) return null;

                // Date Parsing
                if (typeof date === 'number') {
                    // Basic validity check for Excel date (approx year 2000+)
                    if (date > 35000) {
                        const parsedDate = new Date(Math.round((date - 25569) * 86400 * 1000));
                        date = parsedDate.toLocaleDateString();
                    } else {
                        // console.log(`Row ${idx}: Number ${originalDate} too small for date`);
                        return null;
                    }
                } else if (typeof date === 'string' && !date.includes('/')) {
                    // console.log(`Row ${idx}: String '${originalDate}' not a date`);
                    return null;
                }

                if (!Number(row[2]) || !Number(row[3])) {
                    // console.log(`Row ${idx}: Missing Power/KP`);
                    return null;
                }

                return {
                    date: date,
                    power: Number(row[2]) || 0, // Col 2
                    kp: Number(row[3]) || 0     // Col 3
                };
            }).filter(h => h && h.power > 0);

            console.log(`\nParsed ${parsedHistory.length} valid history entries.`);
            if (parsedHistory.length > 0) {
                console.log("First entry:", parsedHistory[0]);
                console.log("Last entry:", parsedHistory[parsedHistory.length - 1]);
            }
        } else {
            console.log("'Kingdom Stats Scan' NOT FOUND");
        }
    } else {
        console.log("Dashboard sheet not found!");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
