import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { DATA_CONFIG } from '../src/config/data-mapping.js';

// Paths - utilizing process.cwd() for reliability when running from root
const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');

// Ensure output directory exists (if we want to output to src/data or public/data)
// We'll output to public/data for easy fetching
const OUTPUT_DIR = DATA_DIR;

console.log(`🚀 Starting Data Digestion...`);
console.log(`📂 Project Root: ${PROJECT_ROOT}`);
console.log(`📂 Scanning directory: ${DATA_DIR}`);

// Helper: Find file by partial name or exact config match
function findFile(pattern) {
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`❌ Data directory does not exist: ${DATA_DIR}`);
        return null;
    }
    const files = fs.readdirSync(DATA_DIR);
    // Try exact match first
    if (files.includes(pattern)) return path.join(DATA_DIR, pattern);
    // Fuzzy match
    const match = files.find(f => f.includes(pattern) && !f.startsWith('~$')); // Ignore lock files
    return match ? path.join(DATA_DIR, match) : null;
}

// 1. Process Players (Top 300)
function processPlayers() {
    const filePath = findFile(DATA_CONFIG.FILES.TOP_300);
    if (!filePath) {
        console.error(`❌ Players file not found: ${DATA_CONFIG.FILES.TOP_300}`);
        return;
    }

    console.log(`READING: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);

    // Players Sheet
    const playerSheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.SHEETS.PLAYERS));
    if (!playerSheetName) {
        console.error(`❌ Players sheet matching '${DATA_CONFIG.SHEETS.PLAYERS}' not found.`);
        return;
    }

    const sheet = workbook.Sheets[playerSheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const players = jsonData.slice(1).map((row, index) => ({
        rank: index + 1,
        id: row[DATA_CONFIG.PLAYER_COLUMNS.ID],
        name: row[DATA_CONFIG.PLAYER_COLUMNS.NAME],
        power: Number(row[DATA_CONFIG.PLAYER_COLUMNS.POWER]) || 0,
        kp: Number(row[DATA_CONFIG.PLAYER_COLUMNS.KP]) || 0,
        deads: Number(row[DATA_CONFIG.PLAYER_COLUMNS.DEADS]) || 0,
        t1Kills: Number(row[DATA_CONFIG.PLAYER_COLUMNS.T1_KILLS]) || 0,
        t4Kills: Number(row[DATA_CONFIG.PLAYER_COLUMNS.T4_KILLS]) || 0,
        t5Kills: Number(row[DATA_CONFIG.PLAYER_COLUMNS.T5_KILLS]) || 0,
        ranged: Number(row[DATA_CONFIG.PLAYER_COLUMNS.RANGED]) || 0,
        rssGathered: Number(row[DATA_CONFIG.PLAYER_COLUMNS.RSS_GATHERED]) || 0,
        rssAssistance: Number(row[DATA_CONFIG.PLAYER_COLUMNS.RSS_ASSISTANCE]) || 0,
        helps: Number(row[DATA_CONFIG.PLAYER_COLUMNS.HELPS]) || 0,
        alliance: row[DATA_CONFIG.PLAYER_COLUMNS.ALLIANCE] || "Unknown",
        cityHall: Number(row[DATA_CONFIG.PLAYER_COLUMNS.CITY_HALL]) || 0,
        location: row[DATA_CONFIG.PLAYER_COLUMNS.LOCATION] || "",
        notes: row[DATA_CONFIG.PLAYER_COLUMNS.NOTES] || "",
        powerDiff: Number(row[DATA_CONFIG.PLAYER_COLUMNS.POWER_DIFF]) || 0
    })).filter(p => p.id && p.name); // Basic validation

    const outputFile = path.join(OUTPUT_DIR, DATA_CONFIG.JSON.PLAYERS);
    fs.writeFileSync(outputFile, JSON.stringify(players)); // Minified
    console.log(`✅ Generated ${DATA_CONFIG.JSON.PLAYERS} (${players.length} records)`);

    // History Stats (from same workbook)
    const historySheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.SHEETS.KINGDOM_STATS));
    if (historySheetName) {
        const historySheet = workbook.Sheets[historySheetName];
        const historyJson = XLSX.utils.sheet_to_json(historySheet, { header: 1 });

        // Find "Kingdom Stats Scan" block
        let startRow = -1;
        for (let i = 0; i < historyJson.length; i++) {
            if (JSON.stringify(historyJson[i]).includes("Kingdom Stats Scan")) {
                startRow = i;
                break;
            }
        }

        if (startRow !== -1) {
            const history = historyJson.slice(startRow + 1).map(row => {
                let date = row[DATA_CONFIG.HISTORY_COLUMNS.DATE];
                if (!date) return null;

                // Date Parsing
                if (typeof date === 'number') {
                    // Excel Date to JS Date
                    const parsedDate = new Date(Math.round((date - 25569) * 86400 * 1000));
                    date = parsedDate.toLocaleDateString('en-US'); // standardized string
                } else if (typeof date !== 'string' || !date.includes('/')) {
                    return null;
                }

                return {
                    date: date,
                    power: Number(row[DATA_CONFIG.HISTORY_COLUMNS.POWER]) || 0,
                    kp: Number(row[DATA_CONFIG.HISTORY_COLUMNS.KP]) || 0
                };
            }).filter(h => h && h.power > 0);

            const historyFile = path.join(OUTPUT_DIR, DATA_CONFIG.JSON.HISTORY);
            fs.writeFileSync(historyFile, JSON.stringify(history));
            console.log(`✅ Generated ${DATA_CONFIG.JSON.HISTORY} (${history.length} records)`);
        }
    }
}

// 2. Process Bank
function processBank() {
    const filePath = findFile(DATA_CONFIG.FILES.BANK);
    if (!filePath) {
        console.warn(`⚠️ Bank file not found: ${DATA_CONFIG.FILES.BANK}`);
        return;
    }
    console.log(`READING: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);

    // Dashboard Sheet
    const dbSheet = workbook.Sheets[DATA_CONFIG.SHEETS.BANK_DASHBOARD];
    if (dbSheet) {
        const dbJson = XLSX.utils.sheet_to_json(dbSheet, { header: 1 });
        const colIdx = DATA_CONFIG.BANK_DASHBOARD.COL_INDEX;

        const bankData = {
            total: {
                food: Number(dbJson[DATA_CONFIG.BANK_DASHBOARD.ROWS.FOOD]?.[colIdx]) || 0,
                wood: Number(dbJson[DATA_CONFIG.BANK_DASHBOARD.ROWS.WOOD]?.[colIdx]) || 0,
                stone: Number(dbJson[DATA_CONFIG.BANK_DASHBOARD.ROWS.STONE]?.[colIdx]) || 0,
                gold: Number(dbJson[DATA_CONFIG.BANK_DASHBOARD.ROWS.GOLD]?.[colIdx]) || 0
            },
            weekly: [], // New Weekly Contribution Data
            updatedAt: new Date().toISOString()
        };

        // Weekly Contribution Sheet - Multi-Week Parsing
        const weeklySheet = workbook.Sheets[DATA_CONFIG.SHEETS.BANK_WEEKLY];
        if (weeklySheet) {
            const weeklyJson = XLSX.utils.sheet_to_json(weeklySheet, { header: 1 });

            // Find all header rows (where first cell is "ID")
            const headerIndices = weeklyJson.map((r, i) => r[0] === 'ID' ? i : -1).filter(i => i !== -1);

            const weeklyHistory = [];

            // Process up to 4 weeks
            const weeksToProcess = headerIndices.slice(0, 4);

            weeksToProcess.forEach((headerRowIdx, weekIndex) => {
                // Determine end of this block (next header or end of file)
                const nextHeaderIdx = headerIndices[weekIndex + 1];
                const endRowIdx = nextHeaderIdx ? nextHeaderIdx : weeklyJson.length;

                // Extract rows for this week (skip header)
                const weekRows = weeklyJson.slice(headerRowIdx + 1, endRowIdx);

                const weekData = weekRows.map(row => {
                    if (!row[1]) return null; // Skip if no name
                    return {
                        id: row[0],
                        name: row[1],
                        food: Number(row[2]) || 0,
                        wood: Number(row[3]) || 0,
                        stone: Number(row[4]) || 0,
                        gold: Number(row[5]) || 0,
                        weekTotal: Number(row[6]) || 0,
                        totalContribution: Number(row[7]) || 0
                    };
                }).filter(item => item !== null);

                if (weekData.length > 0) {
                    weeklyHistory.push({
                        weekLabel: weekIndex === 0 ? "Current Week" : `${weekIndex} Week${weekIndex > 1 ? 's' : ''} Ago`,
                        data: weekData
                    });
                }
            });

            // Bank.weekly is now the current week (first block)
            bankData.weekly = weeklyHistory[0]?.data || [];
            // Store full history
            bankData.history = weeklyHistory;

            console.log(`   + Loaded ${weeklyHistory.length} weeks of history`);
        }

        const bankFile = path.join(OUTPUT_DIR, DATA_CONFIG.JSON.BANK);
        fs.writeFileSync(bankFile, JSON.stringify(bankData));
        console.log(`✅ Generated ${DATA_CONFIG.JSON.BANK}`);
    }
}

// 3. Process Trophies
function processTrophies() {
    const filePath = findFile(DATA_CONFIG.FILES.TROPHIES);
    if (!filePath) {
        console.warn(`⚠️ Trophies file not found: ${DATA_CONFIG.FILES.TROPHIES}`);
        return;
    }
    console.log(`READING: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);

    const sheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.TROPHIES.SHEET_PATTERN));
    if (!sheetName) return [];

    console.log(`FOUND Trophies Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const parsedWeeks = [];
    let currentWeek = null;
    let currentTrophyType = null;

    // Vertical Parsing Logic
    jsonData.forEach((row) => {
        const firstCell = String(row[0] || "").trim();
        const secondCell = String(row[1] || "").trim();

        // 1. Detect Week Header
        if (firstCell.startsWith("Week")) {
            if (currentWeek) parsedWeeks.push(currentWeek);
            currentWeek = {
                title: firstCell,
                groups: {}
            };
            currentTrophyType = null;
            return; // Skip processing this row
        }

        // 2. Skip Header Row (Name/Type) or Empty Rows
        if (secondCell === "Name" || (!firstCell && !secondCell)) {
            return;
        }

        // 3. Detect Trophy Type (Column A)
        // If Col A matches a known trophy type pattern or just is not empty
        if (firstCell) {
            currentTrophyType = firstCell;
            if (currentWeek && !currentWeek.groups[currentTrophyType]) {
                currentWeek.groups[currentTrophyType] = [];
            }
        }

        // 4. Process Player (Column B)
        if (currentWeek && currentTrophyType && secondCell) {
            currentWeek.groups[currentTrophyType].push({
                id: null, // No ID in this sheet, logic relies on Name
                name: secondCell,
                score: row[2] || ""
            });
        }
    });
    if (currentWeek) parsedWeeks.push(currentWeek);

    const outputFile = path.join(OUTPUT_DIR, DATA_CONFIG.JSON.TROPHIES);
    fs.writeFileSync(outputFile, JSON.stringify(parsedWeeks));
    console.log(`✅ Generated ${DATA_CONFIG.JSON.TROPHIES} (${parsedWeeks.length} weeks)`);
}

// 4. Process Deadweight
function processDeadweight() {
    const filePath = findFile(DATA_CONFIG.FILES.DEADWEIGHT);
    if (!filePath) {
        console.warn(`⚠️ Deadweight file not found: ${DATA_CONFIG.FILES.DEADWEIGHT}`);
        return;
    }
    console.log(`READING: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);

    // Use specific sheet name from config or fuzzy search
    let sheetName = DATA_CONFIG.SHEETS.DEADWEIGHT;
    if (!workbook.SheetNames.includes(sheetName)) {
        // Fallback: try to find a sheet containing "DW" or "Deadweight"
        sheetName = workbook.SheetNames.find(n => n.includes("DW") || n.includes("Deadweight"));
    }

    if (!sheetName) {
        console.error(`❌ Deadweight sheet not found (expected '${DATA_CONFIG.SHEETS.DEADWEIGHT}' or similar).`);
        return;
    }

    console.log(`FOUND Deadweight Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Header is row 3 (index 2), Data starts row 4 (index 3)
    const deadweightList = jsonData.slice(3).map((row, index) => {
        const id = row[DATA_CONFIG.DEADWEIGHT.COLUMNS.ID];
        const name = row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NAME];

        // Validation: ID must be a number or string with length >= 5, and Name must exist
        const isValidId = (typeof id === 'number' && String(id).length >= 5) || (typeof id === 'string' && id.length >= 5);
        if (!isValidId || !name) return null;

        return {
            id: id,
            name: name,
            power: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.POWER]) || 0,
            kp: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.KP]) || 0,
            powerDiff: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.POWER_DIFF]) || 0,
            kpGained: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.KP_GAINED]) || 0,
            reason: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.REASON] || "Unknown",
            ready: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.READY] === true || String(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.READY]).toLowerCase() === 'yes',
            rssDonation: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.RSS_DONATION],
            location: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.LOCATION],
            passports: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.PASSPORTS],
            dateEmigration: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.DATE_EMIGRATION],
            needKingdom: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NEED_KINGDOM],
            accountAvailable: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.ACCOUNT_AVAILABLE],
            status: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.STATUS] || "Pending", // Default status
            note: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NOTE]
        };
    }).filter(item => item !== null);

    const outputFile = path.join(OUTPUT_DIR, DATA_CONFIG.JSON.DEADWEIGHT);
    // Wrap in object with metadata
    const outputData = {
        updatedAt: new Date().toISOString(),
        count: deadweightList.length,
        list: deadweightList
    };

    fs.writeFileSync(outputFile, JSON.stringify(outputData));
    console.log(`✅ Generated ${DATA_CONFIG.JSON.DEADWEIGHT} (${deadweightList.length} records)`);
}

// 5. Process KvK Stats
function processKvkStats() {
    const filePath = findFile(DATA_CONFIG.KVK.FILE);
    if (!filePath) {
        console.error(`❌ KvK file not found: ${DATA_CONFIG.KVK.FILE}`);
        return;
    }

    console.log(`READING: ${path.basename(filePath)}`);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[DATA_CONFIG.KVK.SHEET_NAME];

    if (!sheet) {
        console.error(`❌ Sheet '${DATA_CONFIG.KVK.SHEET_NAME}' not found in KvK file.`);
        return;
    }

    console.log(`FOUND KvK Sheet: ${DATA_CONFIG.KVK.SHEET_NAME}`);
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Header is Row 3 (index 2), Data starts Row 4 (index 3)
    const kvkList = jsonData.slice(3).map(row => {
        return {
            id: row[DATA_CONFIG.KVK.COLUMNS.ID],
            name: row[DATA_CONFIG.KVK.COLUMNS.NAME],
            initialPower: Number(row[DATA_CONFIG.KVK.COLUMNS.INITIAL_POWER]) || 0,
            finalPower: Number(row[DATA_CONFIG.KVK.COLUMNS.FINAL_POWER]) || 0,
            initialKp: Number(row[DATA_CONFIG.KVK.COLUMNS.INITIAL_KP]) || 0,
            finalKp: Number(row[DATA_CONFIG.KVK.COLUMNS.FINAL_KP]) || 0,
            totalDead: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_DEAD]) || 0,
            totalPowerDiff: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_POWER_DIFF]) || 0,
            totalKpGained: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_KP_GAINED]) || 0,
            goalPercent: row[DATA_CONFIG.KVK.COLUMNS.GOAL_PERCENT],
            rate: row[DATA_CONFIG.KVK.COLUMNS.RATE]
        };
    }).filter(p => p.id && p.name);

    // Deduplicate by ID
    const uniqueKvkList = Array.from(new Map(kvkList.map(item => [item.id, item])).values());

    const outputFile = path.join(OUTPUT_DIR, DATA_CONFIG.KVK.JSON_OUTPUT);
    fs.writeFileSync(outputFile, JSON.stringify(uniqueKvkList, null, 2));
    console.log(`✅ Generated ${DATA_CONFIG.KVK.JSON_OUTPUT} (${uniqueKvkList.length} records)`);
}

// Execute
try {
    processPlayers();
    processBank();
    processTrophies();
    processDeadweight();
    processKvkStats();
    console.log(`🎉 Data digestion complete!`);
} catch (e) {
    console.error("❌ Fatal Error during digestion:", e);
    fs.writeFileSync('error.log', JSON.stringify(e, Object.getOwnPropertyNames(e)));
    process.exit(1);
}
