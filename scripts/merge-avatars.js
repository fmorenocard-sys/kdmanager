const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '../src/data/player-avatars.json');
const SOURCE_FILE = process.argv[2]; // Pass the scraped JSON file as an argument

if (!SOURCE_FILE) {
    console.error("Please provide a source JSON file path.");
    console.error("Usage: node scripts/merge-avatars.js <path-to-scraped-data.json>");
    process.exit(1);
}

const sourcePath = path.resolve(SOURCE_FILE);

if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
}

// Load existing avatars
let existingAvatars = {};
if (fs.existsSync(TARGET_FILE)) {
    existingAvatars = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
}

// Load new data
const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

// Handle different Firecrawl output formats
let newPlayers = [];
if (Array.isArray(sourceData)) {
    newPlayers = sourceData;
} else if (sourceData.players && Array.isArray(sourceData.players)) {
    newPlayers = sourceData.players;
} else if (sourceData.json && sourceData.json.players) {
    newPlayers = sourceData.json.players;
} else {
    console.error("Could not find a 'players' array in the source file.");
    process.exit(1);
}

let count = 0;
newPlayers.forEach(p => {
    if (p.id && p.avatarUrl && p.avatarUrl !== "N/A" && p.avatarUrl !== "") {
        // Simple normalization
        const id = String(p.id);
        if (!existingAvatars[id] || existingAvatars[id] !== p.avatarUrl) {
            existingAvatars[id] = p.avatarUrl;
            count++;
        }
    }
});

fs.writeFileSync(TARGET_FILE, JSON.stringify(existingAvatars, null, 2));
console.log(`Merged ${count} new avatars into ${TARGET_FILE}`);
