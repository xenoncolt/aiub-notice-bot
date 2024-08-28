import { EmbedBuilder } from "discord.js";
import os from "os";
import si from "systeminformation";
import ver from "../package.json" assert { type: "json"};

const start_time = Date.now();

export default {
    name: 'bot-info',
    description: 'Get information about the bot',
    async execute(interaction) {
        const { client } = interaction;

        const server_count = client.guilds.cache.size;
        const user_count = client.users.cache.size;
        const app_version = ver.version;
        const os_info = os.type();
        const node_version = process.version;
        const platform = os.platform();
        const bot_latency = Math.round(client.ws.ping);
        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        let secs = Math.floor((Date.now() - start_time) / 1000);

        const days = Math.floor(secs / (60 * 60 * 24));
        secs -= days * 3600 * 24;
        const hours = Math.floor(secs / (60 * 60));
        secs -= hours * 3600;
        const mins = Math.floor(secs / 60);
        secs -= mins * 60;

        const api_time_before = Date.now();
        await interaction.deferReply();
        const api_latency = Date.now() - api_time_before;

        const cpu_use = await si.currentLoad();
        const cpu_usage = cpu_use.currentLoad.toFixed(2);

        const embed = new EmbedBuilder()
            .setTitle("Bot Information")
            .setDescription(`\`\`\`yml\nName: ${client.user.tag}\nBot Latency: ${bot_latency}ms \nAPI Latency: ${api_latency}ms \nRuntime: ${days} Days︲${hours} Hrs︲${mins} Mins︲${secs} Secs \`\`\``)
            .addFields(
                { name: "<a:arrow:1003994520901386281> General -- Stats", value: `\`\`\`yml\nServers: ${server_count} \nUsers: ${user_count}\`\`\``, inline: true },
                { name: "<a:arrow:1003994520901386281> Bot -- Stats", value: `\`\`\`yml\nApp Version: v${app_version} \nNode.js: ${node_version}\`\`\``, inline: true },
                { name: "<a:arrow:1003994520901386281> System -- Stats", value: `\`\`\`yml\nOS: ${os_info} \nPlatform: ${platform} \nCPU Usage: ${cpu_usage} % \nRAM Usage: ${ramUsage} MB\`\`\``, inline: false },
                { name: "<a:arrow:1003994520901386281> Developer", value: `\`\`\`yml\nName: Xenon Colt \nUsername: xenoncolt\`\`\` [Website](https://xenoncolt.me)`, inline: false }
            );

        await interaction.editReply( { embeds: [embed] });
    }
}