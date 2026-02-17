import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAPPING_FILE = path.join(__dirname, '../src/data/player-avatars.json');
const OUTPUT_DIR = path.join(__dirname, '../public/data/avatars');

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode === 200) {
                const fileStream = fs.createWriteStream(filepath);
                res.pipe(fileStream);
                fileStream.on('error', reject);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(filepath);
                });
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

(async () => {
    try {
        if (!fs.existsSync(MAPPING_FILE)) {
            console.error(`Mapping file not found: ${MAPPING_FILE}`);
            process.exit(1);
        }

        const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
        const playerIds = Object.keys(mapping);

        console.log(`Processing ${playerIds.length} avatars from mapping...`);

        let downloadedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const id of playerIds) {
            const url = mapping[id];

            // Skip if already a local path
            if (url.startsWith('/data/avatars/') || url.startsWith('/src/data/avatars/')) {
                skippedCount++;
                continue;
            }

            if (!url.startsWith('http')) {
                console.warn(`Invalid URL for ID ${id}: ${url}`);
                failedCount++;
                continue;
            }

            try {
                // Determine extension from URL or default to .jpg
                let ext = path.extname(new URL(url).pathname) || '.jpg';
                // Sanitize extension
                if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase())) {
                    ext = '.jpg';
                }

                const filename = `${id}${ext}`;
                const filepath = path.join(OUTPUT_DIR, filename);

                // Check if file already exists (optional: skip download if exists)
                // For now, we overwrite or download again if the mapping says it's a remote URL

                await downloadImage(url, filepath);

                // Update mapping to local path
                mapping[id] = `/data/avatars/${filename}`;
                downloadedCount++;

                // Optional: Log progress every 10 items
                if (downloadedCount % 10 === 0) {
                    process.stdout.write('.');
                }

            } catch (error) {
                console.error(`\nFailed to download for ID ${id} (${url}):`, error.message);
                failedCount++;
            }
        }

        console.log('\n');

        // Save updated mapping
        fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
        console.log(`Summary:`);
        console.log(`- Downloaded: ${downloadedCount}`);
        console.log(`- Skipped (Already Local): ${skippedCount}`);
        console.log(`- Failed: ${failedCount}`);
        console.log(`Mapping updated in ${MAPPING_FILE}`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
})();
