import { exec } from 'child_process';
import fs from 'fs';

console.log("Starting build verification...");
exec('npx vite build', (error, stdout, stderr) => {
    const log = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nERROR:\n${error}`;
    fs.writeFileSync('build_log.txt', log);
    console.log("Build verification finished. Log written to build_log.txt");
    if (error) {
        console.error("Build failed!");
        process.exit(1);
    } else {
        console.log("Build success!");
    }
});
