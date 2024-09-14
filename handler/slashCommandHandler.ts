import path from "path";
import { ExtendedClient } from "../types/ExtendedClient.js";
import { readdirSync } from "fs";
import { pathToFileURL, fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCommands(client: ExtendedClient) {
    const commands_path = path.join(__dirname, '../commands');
    const command_files = readdirSync(commands_path).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of command_files) {
        const file_path = path.join(commands_path, file);
        console.log(`Loading command from: ${file_path}`);
        try {
            const file_url = pathToFileURL(file_path).toString();
            const command_module = await import(file_url);
            const command = command_module.default;
            client.commands.set(command.name, command);
        } catch (error) {
            console.error(`Failed to load command file ${file}:`, error);
        }
    }
}