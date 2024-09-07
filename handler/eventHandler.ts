import { Client, Events } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export function loadEvents(client: Client) {
    const events_path = path.resolve(__dirname, './events');
    const events_files = fs.readdirSync(events_path).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of events_files) {
        const file_path = path.join(events_path, file);
        
        import(pathToFileURL(file_path).href).then(event_module => {
            const event = event_module.default;

            if (event.once) {
                client.once(event.name as keyof typeof Events, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name as keyof typeof Events, (...args) => event.execute(...args, client));
            }
        }).catch((e) => {
            console.error(`Failed to load event file ${file}:`, e);
        });
    }
}