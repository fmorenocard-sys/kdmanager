
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the scraped data
const dataPath = 'C:/Users/fmore/.gemini/antigravity/brain/f427b0ca-5cbf-4cc0-b804-acdbea3e2a40/.system_generated/steps/461/output.txt';

try {
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    const commanders = jsonData.json.commanders;

    // Output directory for images (Public folder for static serving)
    const outputDir = path.join(__dirname, '../public/assets/commanders');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Output directory for metadata
    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const downloadImage = (url, filepath) => {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode === 200) {
                    res.pipe(fs.createWriteStream(filepath))
                        .on('error', reject)
                        .once('close', () => resolve(filepath));
                } else {
                    res.resume();
                    reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
                }
            });
        });
    };

    const processCommanders = async () => {
        const metadata = [];

        for (const cmd of commanders) {
            // Clean name: "Alexander the Great" -> "alexander_the_great"
            const safeName = cmd.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `${safeName}.png`;
            const filePath = path.join(outputDir, fileName);

            console.log(`Downloading ${cmd.name}...`);
            try {
                await downloadImage(cmd.imageUrl, filePath);
                metadata.push({
                    name: cmd.name,
                    id: safeName,
                    rarity: cmd.rarity,
                    // Path relative to public folder
                    image: `/assets/commanders/${fileName}`
                });
            } catch (err) {
                console.error(`Failed to download ${cmd.name}:`, err.message);
            }
        }

        // Write metadata file
        const metaPath = path.join(dataDir, 'commanders.js');
        const fileContent = `export const COMMANDERS = ${JSON.stringify(metadata, null, 4)};`;
        fs.writeFileSync(metaPath, fileContent);
        console.log('Done! Metadata saved to src/data/commanders.js');
    };

    processCommanders();

} catch (err) {
    console.error("Error:", err);
}
