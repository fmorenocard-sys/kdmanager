
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load Scraped Data
// (Paste the JSON content here or read from file if possible, but for this script I'll paste the relevant part)
// Since I can't easily read the temp file from previous steps in this isolated script environment without exact path which might change, 
// I will rely on reading the file I WILL create in the next step. 
// actually I can just paste the JSON here, it's not that big (550 lines).
// But for cleaner code, I will assume a file 'tiermaker_data.json' exists in scripts folder.

const TIERMAKER_DATA_PATH = path.join(__dirname, 'tiermaker.json');
const EXISTING_DATA_PATH = path.join(__dirname, '../src/data/commanders.js');
const OUTPUT_DATA_PATH = path.join(__dirname, '../src/data/commanders.js');
const IMAGES_DIR = path.join(__dirname, '../public/assets/commanders');

// Ensure images dir exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Helper to download image
const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filepath)) {
            // console.log(`Skipping existing: ${filepath}`);
            resolve();
            return;
        }

        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                // Try to follow redirect or just fail? TierMaker usually direct links.
                // consume response data to free up memory
                response.resume();
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${filepath}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => { });
            reject(err);
        });
    });
};

// Main function
const run = async () => {
    // Read Tiermaker data
    if (!fs.existsSync(TIERMAKER_DATA_PATH)) {
        console.error("Tiermaker data not found!");
        process.exit(1);
    }
    const rawData = fs.readFileSync(TIERMAKER_DATA_PATH, 'utf-8');
    const tierData = JSON.parse(rawData);

    // Read Existing Data (to keep Rarities)
    let existingCommanders = [];
    if (fs.existsSync(EXISTING_DATA_PATH)) {
        const fileContent = fs.readFileSync(EXISTING_DATA_PATH, 'utf-8');
        // Hacky parse of JS file export
        const match = fileContent.match(/export const COMMANDERS = (\[[\s\S]*?\]);/);
        if (match) {
            // This is dangerous if the file has imports/logic, but for a simple data file it works.
            // But strict JSON parse won't work on JS object keys without quotes.
            // Better to match names and rarities via regex or just assume defaults.
            // Actually, let's use a regex to extract name and rarity tuples.
            const entries = fileContent.matchAll(/name":\s*"([^"]+)",[\s\S]*?"rarity":\s*"([^"]+)"/g);
            for (const entry of entries) {
                existingCommanders.push({ name: entry[1], rarity: entry[2] });
            }
        }
    }

    const newCommanders = [];

    // Process
    for (const cmd of tierData.json.commanders) {
        const safeId = cmd.name.toLowerCase().replace(/[^a-z0-0]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const imageFilename = `${safeId}.png`;
        const imagePath = path.join(IMAGES_DIR, imageFilename); // Absolute path for FS
        const publicPath = `/assets/commanders/${imageFilename}`; // Web path

        // Rarity lookup
        const existing = existingCommanders.find(c => c.name === cmd.name || c.name.toLowerCase() === cmd.name.toLowerCase());
        const rarity = existing ? existing.rarity : 'Legendary'; // Default to Legendary for new ones

        newCommanders.push({
            name: cmd.name,
            id: safeId,
            rarity: rarity,
            image: publicPath
        });

        // Download
        try {
            await downloadImage(cmd.imageUrl, imagePath);
        } catch (e) {
            console.error(`Error downloading ${cmd.name}:`, e.message);
        }
    }

    // Write new file
    const fileContent = `export const COMMANDERS = ${JSON.stringify(newCommanders, null, 4)};`;
    fs.writeFileSync(OUTPUT_DATA_PATH, fileContent);
    console.log(`Updated commanders.js with ${newCommanders.length} commanders.`);
};

run();
