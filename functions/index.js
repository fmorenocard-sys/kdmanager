import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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
let _db;
function getDb() {
    if (!_db) {
        _db = getFirestore("kdmanagerdb");
        _db.settings({ ignoreUndefinedProperties: true });
    }
    return _db;
}



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

    if (rows.length < 2) return { status: "error", reason: "Sheet is empty or missing headers" };

    const headers = rows[0].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');
    
    // Build dynamic index map
    const colMap = {};
    for (const [key, possibleNames] of Object.entries(DATA_CONFIG.PLAYER_COLUMNS)) {
        colMap[key] = headers.findIndex(h => possibleNames.includes(h));
    }

    const getVal = (row, key) => colMap[key] !== -1 ? row[colMap[key]] : undefined;

    // Skip header (Row 1)
    const players = rows.slice(1).map((row, index) => ({
        rank: index + 1,
        id: getVal(row, 'ID'),
        name: getVal(row, 'NAME'),
        power: Number(getVal(row, 'POWER')) || 0,
        kp: Number(getVal(row, 'KP')) || 0,
        deads: Number(getVal(row, 'DEADS')) || 0,
        t1Kills: Number(getVal(row, 'T1_KILLS')) || 0,
        t4Kills: Number(getVal(row, 'T4_KILLS')) || 0,
        t5Kills: Number(getVal(row, 'T5_KILLS')) || 0,
        ranged: Number(getVal(row, 'RANGED')) || 0,
        rssGathered: Number(getVal(row, 'RSS_GATHERED')) || 0,
        rssAssistance: Number(getVal(row, 'RSS_ASSISTANCE')) || 0,
        helps: Number(getVal(row, 'HELPS')) || 0,
        alliance: getVal(row, 'ALLIANCE') || "Unknown",
        cityHall: Number(getVal(row, 'CITY_HALL')) || 0,
        location: getVal(row, 'LOCATION') || "",
        notes: getVal(row, 'NOTES') || "",
        powerDiff: Number(getVal(row, 'POWER_DIFF')) || 0
    })).filter(p => p.id && p.name);

    // Extract CH25 Total Power (Line 303 -> index 302)
    const totalPowerCH25 = colMap['POWER'] !== -1 ? (Number(rows[302]?.[colMap['POWER']]) || 0) : 0;

    // Save one big doc to keep it simple for frontend
    await getDb().collection("static_data").doc("players").set({ list: players, updatedAt: new Date().toISOString() });

    // Save Kingdom Stats (Global)
    await getDb().collection("static_data").doc("stats").set({
        totalPowerCH25,
        updatedAt: new Date().toISOString()
    });

    // Sync History Stats (from 'Dashboard' sheet in same workbook)
    const historySheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.SHEETS.KINGDOM_STATS);
    if (historySheetName) {
        const historyRows = await getSheetData(sheets, SPREADSHEET_ID, historySheetName);

        // Find "Kingdom Stats Scan" block
        let startRow = -1;
        for (let i = 0; i < historyRows.length; i++) {
            if (JSON.stringify(historyRows[i]).includes("Kingdom Stats Scan")) {
                startRow = i;
                break;
            }
        }

        if (startRow !== -1) {
            const history = historyRows.slice(startRow + 1).map(row => {
                let date = row[DATA_CONFIG.HISTORY_COLUMNS.DATE];
                if (!date) return null;

                // Simple date parsing if it's an Excel number
                if (typeof date === 'number') {
                    const parsedDate = new Date(Math.round((date - 25569) * 86400 * 1000));
                    date = parsedDate.toLocaleDateString('en-US');
                } else if (typeof date !== 'string' || !date.includes('/')) {
                    return null;
                }

                return {
                    date: date,
                    power: Number(row[DATA_CONFIG.HISTORY_COLUMNS.POWER]) || 0,
                    kp: Number(row[DATA_CONFIG.HISTORY_COLUMNS.KP]) || 0
                };
            }).filter(h => h && h.power > 0);

            await getDb().collection("static_data").doc("history").set({ list: history, updatedAt: new Date().toISOString() });
        }
    }

    return { status: "success", count: players.length, historyTracked: historySheetName ? true : false };
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

    await getDb().collection("static_data").doc("bank").set(bankData);
    return { status: "success" };
}

// Officer sheets often format numbers with (non-breaking) spaces: "82 975 614"
function cleanNumber(v) {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

async function syncDeadweight(sheets) {
    const SPREADSHEET_ID = DATA_CONFIG.GOOGLE_SHEETS.DEADWEIGHT.SPREADSHEET_ID;
    if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("YOUR_")) return { status: "skipped" };

    let sheetName = await findSheetName(sheets, SPREADSHEET_ID, DATA_CONFIG.SHEETS.DEADWEIGHT);
    if (!sheetName) {
        // Officer-made files are single-tab with arbitrary names — take the first tab
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        sheetName = meta.data.sheets?.[0]?.properties?.title || null;
    }
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
            power: cleanNumber(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.POWER]),
            kp: cleanNumber(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.KP]),
            acclaim: cleanNumber(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.ACCLAIM]),
            powerDiff: cleanNumber(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.POWER_DIFF]),
            kpGained: cleanNumber(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.KP_GAINED]),
            reason: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.REASON] || "Deadweight",
            ready: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.READY] === true || String(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.READY]).toLowerCase() === 'yes' || String(row[DATA_CONFIG.DEADWEIGHT.COLUMNS.READY]).toLowerCase() === 'true',
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

    await getDb().collection("static_data").doc("deadweight").set({
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
    await getDb().collection("static_data").doc("trophies").set({ weekList: parsedWeeks, updatedAt: new Date().toISOString() });
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
            totalKills: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_KILLS]) || 0,
            totalDead: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_DEAD]) || 0,
            totalAcclaim: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_ACCLAIM]) || 0,
            totalPowerDiff: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_POWER_DIFF]) || 0,
            totalKpGained: Number(row[DATA_CONFIG.KVK.COLUMNS.TOTAL_KP_GAINED]) || 0,
            goalPercent: row[DATA_CONFIG.KVK.COLUMNS.GOAL_PERCENT],
            rate: row[DATA_CONFIG.KVK.COLUMNS.RATE]
        };
    }).filter(p => p.id && p.name);

    // Deduplicate by ID
    const uniqueKvkList = Array.from(new Map(kvkList.map(item => [item.id, item])).values());

    await getDb().collection("static_data").doc("kvk").set({ list: uniqueKvkList, updatedAt: new Date().toISOString() });
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

    await getDb().collection("static_data").doc("kvk_filler").set({ list: uniqueList, updatedAt: new Date().toISOString() });
    return { status: "success", count: uniqueList.length };
}

// Avatar refresh (docs/pm/Etude_Avatars_Joueurs.md): fresh in-game avatar
// URLs from ProKingdoms' public KvK endpoint (Lilith CDN), with Discord
// avatars from linked profiles as fallback tier. Merge-only: an entry is
// never downgraded (lilith > discord) nor removed when a player drops off
// the leaderboard.
async function syncAvatars() {
    const cfg = DATA_CONFIG.PROKINGDOMS || {};
    const fresh = {};

    if (cfg.KVK_MAP_ID) {
        for (let page = 1; page <= (cfg.MAX_PAGES || 8); page++) {
            const res = await fetch(
                `https://beta.prokingdoms.com/proxy-fast/stats/kvk/aggregated/${cfg.KVK_MAP_ID}?isLiveTable=0&pageNumber=${page}`,
                { headers: { "User-Agent": "Mozilla/5.0 (kdmanager avatar sync)" } }
            );
            if (res.status === 429) { logger.warn(`syncAvatars: rate limited at page ${page}, keeping partial results`); break; }
            if (!res.ok) { logger.warn(`syncAvatars: HTTP ${res.status} at page ${page}`); break; }
            const j = await res.json();
            const rows = j?.kvkData?.kvkDetailsData || [];
            for (const r of rows) {
                if (r.kingdom === (cfg.KINGDOM_ID || 2997) && r.avatar?.avatar) {
                    fresh[String(r.governor_id)] = { url: r.avatar.avatar, source: "lilith", seenAt: new Date().toISOString() };
                }
            }
            if (rows.length < 100) break;
            await new Promise((r) => setTimeout(r, cfg.PAGE_DELAY_MS || 2500));
        }
    }

    // Discord avatars for linked governors (fallback tier)
    const profiles = await getDb().collection("user_profiles").get();
    profiles.docs.forEach((d) => {
        const p = d.data();
        const gid = p.governorId ? String(p.governorId) : null;
        if (gid && p.photoURL && !fresh[gid]) {
            fresh[gid] = { url: p.photoURL, source: "discord", seenAt: new Date().toISOString() };
        }
    });

    const ref = getDb().collection("static_data").doc("avatars");
    const map = (await ref.get()).data()?.map || {};
    let updated = 0;
    for (const [gid, entry] of Object.entries(fresh)) {
        if (entry.source === "discord" && map[gid]?.source === "lilith") continue; // never downgrade
        if (map[gid]?.url !== entry.url) updated++;
        map[gid] = entry;
    }
    await ref.set({ map, updatedAt: new Date().toISOString() });
    return { status: "success", fresh: Object.keys(fresh).length, updated, total: Object.keys(map).length };
}

// Full sync pipeline, shared by the HTTP endpoint and the daily schedule.
// Each source is isolated: one failing sheet never blocks the others.
async function runFullSync() {
    let serviceAccountEmail = "unknown";
    let sheets;
    try {
        const { google } = await import("googleapis");
        const auth = new google.auth.GoogleAuth({
            keyFile: "./service-account.json",
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        const client = await auth.getClient();
        serviceAccountEmail = client.email;
        logger.info("Running as Service Account:", serviceAccountEmail);
        sheets = google.sheets({ version: "v4", auth });
    } catch (e) {
        logger.error("Failed to authenticate", e);
        throw new Error("Auth Failed: " + e.message);
    }

    const results = {};
    const steps = {
        players: syncPlayers,
        bank: syncBank,
        deadweight: syncDeadweight,
        trophies: syncTrophies,
        kvk: syncKvk,
        kvkFiller: syncKvkFiller,
        avatars: syncAvatars,
    };
    for (const [name, fn] of Object.entries(steps)) {
        try {
            results[name] = await fn(sheets);
        } catch (e) {
            logger.error(`Error syncing ${name}`, e);
            results[name] = { status: "error", error: e.message };
        }
    }
    return { serviceAccountEmail, results };
}

// Main Export
export const syncData = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
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

    try {
        logger.info("Starting Sync Process...");
        const { serviceAccountEmail, results } = await runFullSync();
        logger.info("Sync Complete", results);
        res.json({ success: true, serviceAccountEmail, results });
    } catch (error) {
        logger.error("Sync Critical Failure", error);
        // Return full error info for debugging
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack
        });
    }
});

// Daily automatic refresh (05:00 UTC) so the app and the Discord bot
// never serve week-old data when nobody thinks to press "Sync".
export const scheduledSync = onSchedule({ schedule: "0 5 * * *", timeZone: "Etc/UTC", timeoutSeconds: 300 }, async () => {
    const { results } = await runFullSync();
    const failed = Object.entries(results).filter(([, r]) => r.status === "error");
    if (failed.length) {
        logger.error("Scheduled sync finished with errors", results);
    } else {
        logger.info("Scheduled sync complete", results);
    }
});

// Export Discord Auth Cloud Functions
export { discordLogin, discordCallback, confirmDiscordLink, forceRoleSync } from "./discordAuth.js";

// Export Discord Bot Interaction Handler (Slash Commands)
export { discordInteractionHandler } from "./discordBot.js";
