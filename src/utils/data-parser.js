import * as XLSX from 'xlsx';
import { DATA_CONFIG } from '../config/data-mapping';

export const parsePlayers = (workbook) => {
    const sheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.SHEETS.PLAYERS));
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (jsonData.length < 2) return [];

    const headers = jsonData[0].map(h => typeof h === 'string' ? h.toLowerCase().trim() : '');
    
    const colMap = {};
    for (const [key, possibleNames] of Object.entries(DATA_CONFIG.PLAYER_COLUMNS)) {
        colMap[key] = headers.findIndex(h => possibleNames.includes(h));
    }

    const getVal = (row, key) => colMap[key] !== -1 ? row[colMap[key]] : undefined;

    return jsonData.slice(1).map((row, index) => ({
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
};

export const parseHistory = (workbook) => {
    const sheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.SHEETS.KINGDOM_STATS));
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let startRow = -1;
    for (let i = 0; i < jsonData.length; i++) {
        if (JSON.stringify(jsonData[i]).includes("Kingdom Stats Scan")) {
            startRow = i;
            break;
        }
    }

    if (startRow === -1) return [];

    return jsonData.slice(startRow + 1).map(row => {
        let date = row[DATA_CONFIG.HISTORY_COLUMNS.DATE];
        if (!date) return null;

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
};

export const parseBank = (workbook) => {
    const dbSheet = workbook.Sheets[DATA_CONFIG.SHEETS.BANK_DASHBOARD];
    const weeklySheet = workbook.Sheets[DATA_CONFIG.SHEETS.BANK_WEEKLY];

    let total = { food: 0, wood: 0, stone: 0, gold: 0 };
    let weekly = [];

    // Parse Totals
    if (dbSheet) {
        const jsonData = XLSX.utils.sheet_to_json(dbSheet, { header: 1 });
        const colIdx = DATA_CONFIG.BANK_DASHBOARD.COL_INDEX;
        total = {
            food: Number(jsonData[DATA_CONFIG.BANK_DASHBOARD.ROWS.FOOD]?.[colIdx]) || 0,
            wood: Number(jsonData[DATA_CONFIG.BANK_DASHBOARD.ROWS.WOOD]?.[colIdx]) || 0,
            stone: Number(jsonData[DATA_CONFIG.BANK_DASHBOARD.ROWS.STONE]?.[colIdx]) || 0,
            gold: Number(jsonData[DATA_CONFIG.BANK_DASHBOARD.ROWS.GOLD]?.[colIdx]) || 0
        };
    }

    // Parse Weekly
    if (weeklySheet) {
        const weeklyJson = XLSX.utils.sheet_to_json(weeklySheet, { header: 1 });

        // Find all header rows (where first cell is "ID")
        const headerIndices = weeklyJson.map((r, i) => r[0] === 'ID' ? i : -1).filter(i => i !== -1);

        const weeklyHistory = [];
        const weeksToProcess = headerIndices.slice(0, 4);

        weeksToProcess.forEach((headerRowIdx, weekIndex) => {
            const nextHeaderIdx = headerIndices[weekIndex + 1];
            const endRowIdx = nextHeaderIdx ? nextHeaderIdx : weeklyJson.length;
            const weekRows = weeklyJson.slice(headerRowIdx + 1, endRowIdx);

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

        weekly = weeklyHistory[0]?.data || [];
        // Structure return to include history
        return { total, weekly, history: weeklyHistory, updatedAt: new Date().toISOString() };
    }

    return { total, weekly, history: [], updatedAt: new Date().toISOString() };
};

export const parseTrophies = (workbook) => {
    const sheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.TROPHIES.SHEET_PATTERN));
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const parsedWeeks = [];
    let currentWeek = null;
    let currentTrophyType = null;

    jsonData.forEach((row) => {
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
                id: null,
                name: secondCell,
                score: row[2] || ""
            });
        }
    });

    if (currentWeek) parsedWeeks.push(currentWeek);
    return parsedWeeks;
};

export const parseDeadweight = (workbook) => {
    let sheetName = DATA_CONFIG.SHEETS.DEADWEIGHT;
    if (!workbook.SheetNames.includes(sheetName)) {
        sheetName = workbook.SheetNames.find(n => n.includes("DW") || n.includes("Deadweight"));
    }

    if (!sheetName) return null;

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const list = jsonData.slice(3).map((row) => {
        const id = row[DATA_CONFIG.DEADWEIGHT.COLUMNS.ID];
        const name = row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NAME];

        if (!id && !name) return null;

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
            status: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.STATUS] || "Pending",
            note: row[DATA_CONFIG.DEADWEIGHT.COLUMNS.NOTE]
        };
    }).filter(item => item !== null);

    return {
        updatedAt: new Date().toISOString(),
        count: list.length,
        list: list
    };
};

export const parseKvkStats = (workbook) => {
    const sheetName = workbook.SheetNames.find(n => n.includes(DATA_CONFIG.KVK.SHEET_NAME));

    if (!sheetName) return null;

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

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

    return uniqueKvkList;
};
