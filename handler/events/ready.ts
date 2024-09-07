import { Client, Events } from "discord.js";

// need to change later
let last_notice: string | null = "Loading";

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`${client.user?.tag} Bot is ready!`);

        let status_index = 0;
        setInterval(() => {
            const sts = [
                {name: `custom`, type: 4, state: `🪧Latest notice: ${last_notice}` as const},
                { name: `with ${client.guilds.cache.size} servers`, type: 0 as const}
            ];
            client.user?.setPresence({
                activities: [sts[status_index]],
                status: 'idle'
            });

            status_index = (status_index + 1) % sts.length;
        }, 1 * 60 * 1000);
    }
}