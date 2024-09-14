import { Client, Events } from "discord.js";
import { readFileSync } from "fs";
import { fetchNotice } from "../../utils/noticeFetch.js";

let data = readFileSync('./database/notice.json');
let notices = JSON.parse(data.toString());
let last_notice = notices[notices.length - 1];

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`${client.user?.tag} Bot is ready!`);

        let status_index = 0;
        setInterval(() => {
            const sts = [
                {name: `custom`, type: 4, state: `🪧Latest notice: ${last_notice.title}` as const},
                { name: `with ${client.guilds.cache.size} servers`, type: 0 as const}
            ];
            client.user?.setPresence({
                activities: [sts[status_index]],
                status: 'idle'
            });

            status_index = (status_index + 1) % sts.length;
        }, 1 * 60 * 1000);

        // fetchNotice
        setInterval(() => fetchNotice(client), 1 * 60 * 1000);
    }
}