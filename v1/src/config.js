export const DATA_CONFIG = {
    // File Paths (relative to public/)
    FILES: {
        TOP_300: '/data/Top 300 14_2_2026.xlsx',
        BANK: '/data/KD 97 Bank Ledger.xlsx',
        TROPHIES: '/data/Offseason_KingTrophies_2026.xlsx',
        DEADWEIGHT: '/data/KD 97 Deadweight.xlsx' // Available but Top 300 often used as source
    },
    // Sheet Name Patterns (for fuzzy matching)
    SHEETS: {
        PLAYERS: '14_2', // Matches "14_2_2026"
        KINGDOM_STATS: 'Dashboard',
        BANK_WEEKLY: 'Weekly Contribution',
        BANK_DASHBOARD: 'Dashboard',
        TROPHIES: 'Sheet1' // Default or first sheet
    },
    // Column Mappings (Indices)
    PLAYER_COLUMNS: {
        ID: 0,
        NAME: 1,
        POWER: 2,
        POWER_DIFF: 3,
        KP: 4,
        DEADS: 5,
        T1_KILLS: 6,
        T4_KILLS: 7,
        T5_KILLS: 8,
        RANGED: 9,
        RSS_GATHERED: 10,
        RSS_ASSISTANCE: 11,
        HELPS: 12,
        ALLIANCE: 13,
        CITY_HALL: 14,
        LOCATION: 15,
        NOTES: 16
    }
};

export const BANK_CONFIG = {
    DASHBOARD_ROWS: {
        FOOD: 1,
        WOOD: 2,
        STONE: 3,
        GOLD: 4
    },
    DASHBOARD_COL_INDEX: 3 // Column D
};
