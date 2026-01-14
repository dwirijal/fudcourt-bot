
const fs = require('node:fs');
const path = require('node:path');

const foldersPath = path.join(__dirname, '../commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);

    if (fs.lstatSync(commandsPath).isDirectory()) {
        const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith('.ts'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            console.log(`Loading: ${filePath}`);
            try {
                require(filePath);
                console.log(`Success: ${filePath}`);
            } catch (error) {
                console.error(`FAILED: ${filePath}`);
                console.error(error);
                // process.exit(1); Continue!
            }
        }
    }
}
