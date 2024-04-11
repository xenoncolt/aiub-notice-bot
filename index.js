import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import config from "./config.json" assert { type: "json" };
// const fetch = require("node-fetch");
import fetch from "node-fetch";
// const jsdom = require("jsdom");
// const { JSDOM } = jsdom;
import { JSDOM } from "jsdom";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
// const dotenv = require("dotenv");
import dotenv from "dotenv";
import { assert } from "console";
import { type } from "os";
dotenv.config();

// Database thing
let db;
open({
    filename: './database/channel.sqlite',
    driver: sqlite3.Database
}).then((database) => {
    db = database;
})


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// REST instance
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);


//load cmd
client.commands = new Map();

// without array
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// const cmdFiles = fs.readdirSync(join(__dirname, "commands")).filter(file => file.endsWith('.js'));

// Used array to store commands
const cmdFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));


for (const file of cmdFiles) {
    const cmd = await import(`./commands/${file}`);
    client.commands.set(cmd.default.name, cmd.default);
}


// Register Globally commands
// (async () => {
//     try {
//         console.log('Started refreshing application (/) commands.');

//         await rest.put(
//             Routes.applicationCommands(client.user.id),
//             {
//                 body: client.commands.map(({data}) => data)
//             },
//         );

//         console.log('Successfully reloaded application (/) commands.');
//     } catch (error) {
//         console.error('Failed to reload application (/) commands.', error);
//     }
// })();

// store last notice
let lastNotice = null;

// start bot
client.once("ready", async () => {
    console.log(`${client.user.tag} Bot is ready!`);

    // Register Globally commands
    try {
        console.log('Started refreshing application (/) commands.');

            const cmds = Array.from(client.commands.values()).map(({ name, description, options }) => ({ name, description, options }));

            await rest.put(
                Routes.applicationCommands(client.user.id),
                {
                    body: cmds
                },
            );

            await rest.put(
                Routes.applicationGuildCommands(client.user.id, config.guild_id),
                {
                    body: cmds
                },
            );
    
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to reload application (/) commands.', error);
    }

    // fetchNotice();
    setInterval(fetchNotice, 5 * 60 * 1000);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command: ${interaction.commandName} :`, error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
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

        // check last notice or not
        if (title === lastNotice) {
            return;
        }

        lastNotice = title;

        // const channel = client.channels.cache.get(config.channel_id);
        for (const guild of client.guilds.cache.values()) {
            // Fetch channel ID from database instead of config file
        const rows = await db.all('SELECT channel_id FROM channel WHERE guild_id = ?', guild.id);

        console.log(title);

        if (rows.length > 0) {
            for (const row of rows) {
                const channelId =  row.channel_id;
                const channel = client.channels.cache.get(channelId);

                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle(title)
                        .setDescription(desc)
                        .setURL(link)
                        .setColor("Green")
                        .setTimestamp();
                    await channel.send( { embeds: [embed]});
                }
            }
        } else {
            console.log('No channels found in the database for the guild')
        }
        }
    } catch (error) {
        console.error('Failed to catch notice: ', error);
    }
}

client.login(process.env.TOKEN);