import * as logger from "firebase-functions/logger";
import { DATA_CONFIG } from "./data-mapping.js";

// --- Soldes de la banque : repérage du bon tableau dans l'onglet Dashboard ---
// Depuis le changement de banque du 2997 (2026-11-02), l'onglet Dashboard empile
// plusieurs tableaux « Resource | Total In | Total Out | Current Balance » :
// l'ancienne banque (Aurion) en haut, « Bank97 Balance Sheet » en dessous. Une plage
// figée lirait toujours la première — d'où le repérage par en-tête, dans l'esprit de
// `syncPlayers` (colonnes retrouvées par leur libellé) et du parseur hebdomadaire.

// "" / null / libellé non numérique → 0. La colonne « Total Out » de Bank97 est vide
// tant qu'aucun retrait n'a eu lieu : il n'en sort ni NaN ni solde négatif.
export function bankNumber(v) {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function lowerCells(row) {
    return (Array.isArray(row) ? row : []).map(c => (typeof c === "string" ? c.toLowerCase().trim() : ""));
}

// Dernier bloc de soldes de la feuille (la banque en cours est ajoutée sous les
// anciennes). -1 si la feuille n'en contient aucun.
export function findBalanceHeaderRow(rows) {
    const cfg = DATA_CONFIG.BANK_DASHBOARD;
    let found = -1;
    rows.forEach((row, i) => {
        const cells = lowerCells(row);
        if (cells[0] === cfg.HEADER_FIRST_CELL && cells.includes(cfg.BALANCE_HEADER)) found = i;
    });
    return found;
}

// Lit les 4 ressources sous la ligne d'en-tête `headerRowIdx`, colonnes retrouvées
// par libellé. Le bloc s'arrête à la première ligne sans libellé de ressource.
export function readBalanceBlock(rows, headerRowIdx) {
    const cfg = DATA_CONFIG.BANK_DASHBOARD;
    const header = lowerCells(rows[headerRowIdx]);
    const balanceCol = header.indexOf(cfg.BALANCE_HEADER);
    const inCol = header.indexOf(cfg.TOTAL_IN_HEADER);
    const outCol = header.indexOf(cfg.TOTAL_OUT_HEADER);

    const totals = { food: 0, wood: 0, stone: 0, gold: 0 };
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = Array.isArray(rows[i]) ? rows[i] : [];
        const label = typeof row[0] === "string" ? row[0].toLowerCase().trim() : "";
        if (!label) break; // ligne vide = fin du tableau
        const key = Object.keys(cfg.RESOURCES).find(k => cfg.RESOURCES[k] === label);
        if (!key) continue;

        const raw = balanceCol !== -1 ? row[balanceCol] : undefined;
        // « Current Balance » absent → on le recalcule depuis Total IN − Total Out.
        const value = (raw !== undefined && raw !== null && raw !== "")
            ? bankNumber(raw)
            : bankNumber(row[inCol]) - bankNumber(row[outCol]);
        totals[key] = Math.max(0, value); // un solde de banque ne descend pas sous 0
    }
    return totals;
}

// Ligne d'en-tête du tableau nommé `BANK_DASHBOARD.TABLE_NAME`, quand le classeur
// en déclare un (API Sheets : `sheets[].tables`). -1 sinon.
export async function findNamedTableHeaderRow(sheets, spreadsheetId, sheetTitle) {
    const wanted = DATA_CONFIG.BANK_DASHBOARD.TABLE_NAME;
    if (!wanted) return -1;
    try {
        const meta = await sheets.spreadsheets.get({
            spreadsheetId,
            fields: "sheets(properties(title),tables(name,range))",
        });
        const sheet = (meta.data.sheets || []).find(s => s.properties.title === sheetTitle);
        const table = (sheet?.tables || []).find(t => t.name === wanted);
        return table ? (table.range?.startRowIndex ?? -1) : -1;
    } catch (e) {
        logger.warn("Lecture des tableaux nommés impossible, repli sur l'en-tête", e.message);
        return -1;
    }
}
