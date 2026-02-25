import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import { DATA_CONFIG } from "./data-mapping.js";

// eslint-disable-next-line no-undef
if (process.env.FUNCTIONS_EMULATOR) {
    try {
        const serviceAccountPath = new URL('./serviceAccountKey.json', import.meta.url);
        const serviceAccountConfig = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        initializeApp({
            credential: cert(serviceAccountConfig)
        });
        logger.info("Successfully initialized Firebase Admin with local service Account Key.");
    } catch (e) {
        logger.error("Failed to load local service account key! Token minting will fail.", e);
        initializeApp();
    }
} else {
    initializeApp();
}
const db = getFirestore("kdmanagerdb");
db.settings({ ignoreUndefinedProperties: true });



// Helper: Find sheet by pattern
async function findSheetName(sheets, spreadsheetId, pattern) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });

    if (pattern === 'AUTO') {
        const allSheets = meta.data.sheets.map(s => s.properties.title);
        // Exclude ignored sheets
        const candidates = allSheets.filter(title => title !== "Dashboard");

        if (candidates.length === 0) return null;

        // Attempt to parse dates (Format: D_M or D_M_YYYY)
        const datedSheets = candidates.map(title => {
            const parts = title.split(/[_/.-]/);
            if (parts.length < 2) return null;

            const day = Number(parts[0]);
            const month = Number(parts[1]);
            let year = parts.length > 2 ? Number(parts[2]) : new Date().getFullYear();

            if (isNaN(day) || isNaN(month)) return null;
            const dateObj = new Date(year, month - 1, day);
            if (isNaN(dateObj.getTime())) return null;

            return { title, date: dateObj };
        }).filter(item => item !== null);

        // If we found valid dates, sort generic descending
        if (datedSheets.length > 0) {
            datedSheets.sort((a, b) => b.date - a.date);
            return datedSheets[0].title;
        }

        // Fallback: Return the last sheet in the list (often the newest created)
        return candidates[candidates.length - 1];
    }

    const sheet = meta.data.sheets.find(s => s.properties.title.includes(pattern));
    return sheet ? sheet.properties.title : null;
}

// Helper: Get data from sheet
async function getSheetData(sheets, spreadsheetId, sheetName) {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueRenderOption: "UNFORMATTED_VALUE", // Fix: Get raw numbers (no commas/symbols)
    });
    return res.data.values || [];
}

// --- Sync Functions ---

async function syncPlayers(sheets) {
    const SPREADSHEET_ID = DATA_CONFIG.GOOGLE_SHEETS.PLAYERS.SPREADSHEET_ID;
    if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("YOUR_")) return { status: "skipped", reason: "No ID" };

    const sheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.SHEETS.PLAYERS);
    if (!sheetName) return { status: "error", reason: "Sheet not found" };

    const rows = await getSheetData(sheets, SPREADSHEET_ID, sheetName);

    // Skip header (Row 1)
    const players = rows.slice(1).map((row, index) => ({
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
    })).filter(p => p.id && p.name);

    // Save one big doc to keep it simple for frontend
    await db.collection("static_data").doc("players").set({ list: players, updatedAt: new Date().toISOString() });

    // Also save history stats if present in same sheet? 
    // Logic from digest-data.js implies history is in the same workbook but different sheet matching 'Dashboard'
    // We'll skip history sync for this MVP step or add it if easy.
    // Let's add history.

    return { status: "success", count: players.length };
}

async function syncBank(sheets) {
    const SPREADSHEET_ID = DATA_CONFIG.GOOGLE_SHEETS.BANK.SPREADSHEET_ID;
    if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("YOUR_")) return { status: "skipped" };

    // Dashboard Sheet
    const dbSheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.SHEETS.BANK_DASHBOARD);
    let bankData = { total: {}, weekly: [], history: [], updatedAt: new Date().toISOString() };

    if (dbSheetName) {
        const dbRows = await getSheetData(sheets, SPREADSHEET_ID, dbSheetName);
        const colIdx = DATA_CONFIG.BANK_DASHBOARD.COL_INDEX;
        // Rows are 0-indexed in array, but 1-indexed in config. ROWS.FOOD=1 means index 0?
        // digest-data.js used: dbJson[DATA_CONFIG.BANK_DASHBOARD.ROWS.FOOD]?.[colIdx]
        // Let's assume Config Row Indices are 0-based for json array? 
        // In digest-data: `const dbJson = XLSX.utils.sheet_to_json(dbSheet, { header: 1 });` 
        // header:1 means array of arrays.
        // Row 1 in Excel is index 0.
        // If config says 1, it probably means index 1 (Row 2).
        // Let's stick to the config indices.

        bankData.total = {
            food: Number(dbRows[DATA_CONFIG.BANK_DASHBOARD.ROWS.FOOD]?.[colIdx]) || 0,
            wood: Number(dbRows[DATA_CONFIG.BANK_DASHBOARD.ROWS.WOOD]?.[colIdx]) || 0,
            stone: Number(dbRows[DATA_CONFIG.BANK_DASHBOARD.ROWS.STONE]?.[colIdx]) || 0,
            gold: Number(dbRows[DATA_CONFIG.BANK_DASHBOARD.ROWS.GOLD]?.[colIdx]) || 0
        };
    }

    // Weekly Sheet
    const weeklySheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.SHEETS.BANK_WEEKLY);
    if (weeklySheetName) {
        const weeklyRows = await getSheetData(sheets, SPREADSHEET_ID, weeklySheetName);

        // Find header rows (First cell is "ID")
        const headerIndices = weeklyRows.map((r, i) => r[0] === 'ID' ? i : -1).filter(i => i !== -1);
        const weeklyHistory = [];
        const weeksToProcess = headerIndices.slice(0, 4);

        weeksToProcess.forEach((headerRowIdx, weekIndex) => {
            const nextHeaderIdx = headerIndices[weekIndex + 1];
            const endRowIdx = nextHeaderIdx ? nextHeaderIdx : weeklyRows.length;
            const weekRows = weeklyRows.slice(headerRowIdx + 1, endRowIdx);

            const weekData = weekRows.map(row => {
                if (!row[1]) return null;
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

        bankData.weekly = weeklyHistory[0]?.data || [];
        bankData.history = weeklyHistory;
    }

    await db.collection("static_data").doc("bank").set(bankData);
    return { status: "success" };
}

async function syncDeadweight(sheets) {
    const SPREADSHEET_ID = DATA_CONFIG.GOOGLE_SHEETS.DEADWEIGHT.SPREADSHEET_ID;
    if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("YOUR_")) return { status: "skipped" };

    const sheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.SHEETS.DEADWEIGHT);
    if (!sheetName) return { status: "error", reason: "Deadweight sheet not found" };

    const rows = await getSheetData(sheets, SPREADSHEET_ID, sheetName);

    // Header Row 3 (Index 2), Data starts Row 4 (Index 3)
    const deadweightList = rows.slice(3).map(row => {
        const id = row[DATA_CONFIG.DEADWEIGHT.COLUMNS.ID];
        const name = row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NAME];
        if (!id || !name) return null;

        return {
            id: id,
            name: name,
            power: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.POWER]) || 0,
            kp: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.KP]) || 0,
            powerDiff: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.POWER_DIFF]) || 0,
            kpGained: Number(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.KP_GAINED]) || 0,
            reason: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.REASON] || "Unknown",
            ready: String(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.READY]).toLowerCase() === 'yes',
            rssDonation: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.RSS_DONATION],
            location: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.LOCATION],
            passports: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.PASSPORTS],
            dateEmigration: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.DATE_EMIGRATION],
            needKingdom: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NEED_KINGDOM],
            accountAvailable: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.ACCOUNT_AVAILABLE],
            status: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.STATUS] || "Pending",
            note: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NOTE]
        };
    }).filter(Boolean);

    await db.collection("static_data").doc("deadweight").set({
        list: deadweightList,
        count: deadweightList.length,
        updatedAt: new Date().toISOString()
    });
    return { status: "success", count: deadweightList.length };
}

async function syncTrophies(sheets) {
    const SPREADSHEET_ID = DATA_CONFIG.GOOGLE_SHEETS.TROPHIES.SPREADSHEET_ID;
    if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("YOUR_")) return { status: "skipped" };

    const sheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.TROPHIES.SHEET_PATTERN);
    if (!sheetName) return { status: "error", reason: "Trophies sheet not found" };

    const rows = await getSheetData(sheets, SPREADSHEET_ID, sheetName);

    // Vertical Parsing Logic from digest-data.js
    const parsedWeeks = [];
    let currentWeek = null;
    let currentTrophyType = null;

    rows.forEach(row => {
        const firstCell = String(row[0] || "").trim();
        const secondCell = String(row[1] || "").trim();

        if (firstCell.startsWith("Week")) {
            if (currentWeek) parsedWeeks.push(currentWeek);
            currentWeek = { title: firstCell, groups: {} };
            currentTrophyType = null;
            return;
        }

        if (secondCell === "Name" || (!firstCell && !secondCell)) return;

        if (firstCell) {
            currentTrophyType = firstCell;
            if (currentWeek && !currentWeek.groups[currentTrophyType]) {
                currentWeek.groups[currentTrophyType] = [];
            }
        }

        if (currentWeek && currentTrophyType && secondCell) {
            currentWeek.groups[currentTrophyType].push({
                id: null, // No ID in sheet
                name: secondCell,
                score: row[2] || ""
            });
        }
    });
    if (currentWeek) parsedWeeks.push(currentWeek);

    // Save as array in doc
    await db.collection("static_data").doc("trophies").set({ weekList: parsedWeeks, updatedAt: new Date().toISOString() });
    return { status: "success", count: parsedWeeks.length };
}

async function syncKvk(sheets) {
    const SPREADSHEET_ID = DATA_CONFIG.GOOGLE_SHEETS.KVK.SPREADSHEET_ID;
    if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("YOUR_")) return { status: "skipped", reason: "No ID" };

    const sheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.KVK.SHEET_NAME);
    if (!sheetName) return { status: "error", reason: "KvK sheet not found" };

    const rows = await getSheetData(sheets, SPREADSHEET_ID, sheetName);

    // Header is Row 3 (index 2), Data starts Row 4 (index 3)
    const kvkList = rows.slice(3).map(row => {
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

    await db.collection("static_data").doc("kvk").set({ list: uniqueKvkList, updatedAt: new Date().toISOString() });
    return { status: "success", count: uniqueKvkList.length };
}

async function syncKvkFiller(sheets) {
    const SPREADSHEET_ID = DATA_CONFIG.GOOGLE_SHEETS.KVK.SPREADSHEET_ID;
    if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("YOUR_")) return { status: "skipped", reason: "No ID" };

    const sheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.KVK_FILLER.SHEET_NAME);
    if (!sheetName) return { status: "error", reason: "KvK Filler sheet not found" };

    const rows = await getSheetData(sheets, SPREADSHEET_ID, sheetName);

    // Headers are on Row 2 (Index 1).
    // Data starts on Row 3 (Index 2).
    const startRowIndex = 2;

    const kvkFillerList = rows.slice(startRowIndex).map(row => {
        return {
            id: row[DATA_CONFIG.KVK_FILLER.COLUMNS.ID],
            name: row[DATA_CONFIG.KVK_FILLER.COLUMNS.NAME],
            initialPower: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.INITIAL_POWER]) || 0,
            finalPower: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.FINAL_POWER]) || 0,
            kp: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.KP]) || 0,
            t4Dead: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.T4_DEAD]) || 0,
            t5Dead: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.T5_DEAD]) || 0,
            pass4Dead: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.PASS4_DEAD]) || 0,
            pass7Dead: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.PASS7_DEAD]) || 0,
            klDead: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.KL_DEAD]) || 0,
            totalDead: Number(row[DATA_CONFIG.KVK_FILLER.COLUMNS.TOTAL_DEAD]) || 0,
            goalPercent: row[DATA_CONFIG.KVK_FILLER.COLUMNS.GOAL_PERCENT]
        };
    }).filter(p => p.id && p.name);

    // Deduplicate by ID
    const uniqueList = Array.from(new Map(kvkFillerList.map(item => [item.id, item])).values());

    await db.collection("static_data").doc("kvk_filler").set({ list: uniqueList, updatedAt: new Date().toISOString() });
    return { status: "success", count: uniqueList.length };
}

// Main Export
export const syncData = onRequest(async (req, res) => {
    // CORS Headers
    res.set('Access-Control-Allow-Origin', '*'); // Allow all origins (or specify your domain)
    if (req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Methods', 'GET, POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
        return;
    }

    let serviceAccountEmail = "unknown";
    try {
        logger.info("Starting Sync Process...");

        // Auth Step
        let sheets;
        try {
            const { google } = await import("googleapis");
            const auth = new google.auth.GoogleAuth({
                keyFile: "./service-account.json",
                scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
            });
            const client = await auth.getClient();
            serviceAccountEmail = client.email; // Capture email
            logger.info("Running as Service Account:", serviceAccountEmail);
            sheets = google.sheets({ version: "v4", auth });
        } catch (e) {
            logger.error("Failed to authenticate", e);
            throw new Error("Auth Failed: " + e.message);
        }

        const results = {};

        // Sync Players
        try {
            results.players = await syncPlayers(sheets);
        } catch (e) {
            logger.error("Error syncing Players", e);
            results.players = { status: "error", error: e.message };
        }

        // Sync Bank
        try {
            results.bank = await syncBank(sheets);
        } catch (e) {
            logger.error("Error syncing Bank", e);
            results.bank = { status: "error", error: e.message };
        }

        // Sync Deadweight
        try {
            results.deadweight = await syncDeadweight(sheets);
        } catch (e) {
            logger.error("Error syncing Deadweight", e);
            results.deadweight = { status: "error", error: e.message };
        }

        // Sync Trophies
        try {
            results.trophies = await syncTrophies(sheets);
        } catch (e) {
            logger.error("Error syncing Trophies", e);
            results.trophies = { status: "error", error: e.message };
        }

        // Sync KvK
        try {
            results.kvk = await syncKvk(sheets);
        } catch (e) {
            logger.error("Error syncing KvK", e);
            results.kvk = { status: "error", error: e.message };
        }

        // Sync KvK Filler
        try {
            results.kvkFiller = await syncKvkFiller(sheets);
        } catch (e) {
            logger.error("Error syncing KvK Filler", e);
            results.kvkFiller = { status: "error", error: e.message };
        }

        logger.info("Sync Complete", results);
        // Include email in response
        res.json({ success: true, serviceAccountEmail, results });
    } catch (error) {
        logger.error("Sync Critical Failure", error);
        // Return full error info for debugging
        res.status(500).json({
            success: false,
            serviceAccountEmail, // Include here too if available
            error: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack
        });
    }
});

// Export Discord Auth Cloud Functions
export { discordLogin, discordCallback, confirmDiscordLink, forceRoleSync } from "./discordAuth.js";
