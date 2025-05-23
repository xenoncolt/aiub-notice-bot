import path from "path";
import { ExtendedClient } from "../types/ExtendedClient.js";
import { readdirSync } from "fs";
import { pathToFileURL, fileURLToPath } from "url";
import { Command } from "../types/Command.js";
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import config from "../config.json" with { type: "json" };

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

export async function registerSlashCommands(client: ExtendedClient) {
    const commands : any[] = [];
    const ownerCmds : any[] = [];
    
    client.commands.forEach(command => {
        if (command.name === 'bot-info') {
            ownerCmds.push({
                name: command.name,
                description: command.description,
                options: command.options || [],
            });
        } else {
            commands.push({
                name: command.name,
                description: command.description,
                options: command.options || [],
            })
        }
    })

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client.user!.id),
            { body: commands }
        );

        if (ownerCmds.length > 0)  {
            await rest.put(
                Routes.applicationGuildCommands(client.user!.id, config.guild_id),
                { body: ownerCmds }
            )
        }

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error while registering commands:', error);
    }
}