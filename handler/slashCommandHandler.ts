import path from "path";
import { ExtendedClient } from "../types/ExtendedClient";
import { readdirSync } from "fs";
import { pathToFileURL } from "url";

export async function loadCommands(client: ExtendedClient) {
    const commands_path = path.join(__dirname, '../commands');
    const command_files = readdirSync(commands_path).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of command_files) {
        const file_path = path.join(commands_path, file);
        try {
            const file_url = pathToFileURL(file_path).href;
            const command_module = await import(file_url);
            const command = command_module.default;
            client.commands.set(command.name, command);
        } catch (error) {
            console.error(`Failed to load command file ${file}:`, error);
        }
    }
}