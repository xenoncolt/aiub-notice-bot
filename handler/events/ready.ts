import { Client, Events } from "discord.js";
import { readFileSync } from "fs";
import { fetchNotice } from "../../utils/noticeFetch.js";
import package_info from "../../package.json" with { type: "json" };
import { execSync } from "child_process";
import { fetchNewsEvents } from "../../utils/aiubNewsFetch.js";

const commit_count = execSync('git rev-list --count HEAD').toString().trim();

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
                { name: `with ${client.guilds.cache.size} servers and ${client.guilds.cache.reduce((user, guild) => user + guild.memberCount, 0)} users`, type: 0 as const},
                { name: `custom`, type: 4, state: `🤖 Version : v${package_info.version}.${commit_count}`}
            ];
            client.user?.setPresence({
                activities: [sts[status_index]],
                status: 'idle'
            });

            status_index = (status_index + 1) % sts.length;
        }, 1 * 60 * 1000);

        // fetchNotice
        setInterval(() => fetchNotice(client), 1 * 60 * 1000);
        setInterval(() => fetchNewsEvents(client), 10 * 60 * 1000);
    }
}