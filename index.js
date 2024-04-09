import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import config from "./config.json" assert { type: "json" };
// const fetch = require("node-fetch");
import fetch from "node-fetch";
// const jsdom = require("jsdom");
// const { JSDOM } = jsdom;
import { JSDOM } from "jsdom";
// const dotenv = require("dotenv");
import dotenv from "dotenv";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log(`${client.user.tag} Bot is ready!`);
    fetchNotice();
});

async function fetchNotice() {
    try {
        const response = await fetch(config.notice_url);
        const text = await response.text();
        const dom = new JSDOM(text);
        const document = dom.window.document;

        const title = document.querySelector('.title').textContent;
        const desc = document.querySelector('.desc').textContent;
        const link_info = document.querySelector('.info-link').href;

        const link = `${config.url}${link_info}`;

        const channel = client.channels.cache.get(config.channel_id);

        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(desc)
                .setURL(link)
                .setColor("Green")
                .setTimestamp();
            channel.send( { embeds: [embed]});
        }
    } catch (error) {
        console.error('Failed to catch notice: ',error);
    }
}

dotenv.config();
client.login(process.env.TOKEN);