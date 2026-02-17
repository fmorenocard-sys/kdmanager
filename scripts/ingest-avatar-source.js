import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_FILE = path.join(__dirname, '../public/data/avatar-source.json');
const TARGET_FILE = path.join(__dirname, '../src/data/player-avatars.json');

try {
    console.log(`Reading source file: ${SOURCE_FILE}`);
    const sourceData = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));

    if (!sourceData.kvkDataFull || !sourceData.kvkDataFull.kvkDetailsData) {
        console.error('Error: kvkDataFull.kvkDetailsData not found in source file.');
        process.exit(1);
    }

    const players = sourceData.kvkDataFull.kvkDetailsData;
    console.log(`Found ${players.length} players in source.`);

    let targetMapping = {};
    if (fs.existsSync(TARGET_FILE)) {
        targetMapping = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
    }

    let updatedCount = 0;
    let newCount = 0;

    players.forEach(p => {
        const id = String(p.governor_id);
        const avatarUrl = p.avatar?.avatar;

        if (id && avatarUrl) {
            if (!targetMapping[id]) {
                targetMapping[id] = avatarUrl;
                newCount++;
            } else if (targetMapping[id] !== avatarUrl) {
                // Update if URL is different (e.g. newer)
                // Note: You might want to be careful here if existing URLs are local paths
                // But assumed these are remote URLs being updated
                // Only update if the existing one is NOT a downloaded local path (starts with /avatars/)
                if (!targetMapping[id].startsWith('/avatars/')) {
                    targetMapping[id] = avatarUrl;
                    updatedCount++;
                }
            }
        }
    });

    fs.writeFileSync(TARGET_FILE, JSON.stringify(targetMapping, null, 2));
    console.log(`Successfully updated avatar mapping.`);
    console.log(`New avatars: ${newCount}`);
    console.log(`Updated avatars: ${updatedCount}`);
    console.log(`Total mapped: ${Object.keys(targetMapping).length}`);

} catch (err) {
    console.error('Error processing avatar source:', err);
}
