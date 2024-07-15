import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, TextChannel, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import config from "./config.json" assert { type: "json" };
// const fetch = require("node-fetch");
import fetch from "node-fetch";
// const jsdom = require("jsdom");
// const { JSDOM } = jsdom;
import { JSDOM } from "jsdom";
import fs from "fs";
//import { fileURLToPath } from "url";
//import { dirname, join } from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
// const dotenv = require("dotenv");
import dotenv from "dotenv";
//import { assert } from "console";
//import { type } from "os";
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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping
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

    // Set status
    let statusIndex = 0;
    setInterval(() => {
        const sts = [
            { name: `custom`, type: 4, state: `🪧Latest notice: ${lastNotice}` },
            { name: `with ${client.guilds.cache.size} servers`, type: 0 }
        ];
        client.user.setPresence({
            activities: [sts[statusIndex]],
            status: 'idle'
        });

        statusIndex = (statusIndex + 1) % sts.length;
    }, 1 * 60 * 1000);


    // fetchNotice();
    setInterval(fetchNotice, 1 * 60 * 1000);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() && !interaction.isSelectMenu()) return;

    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`Error executing command: ${interaction.commandName} :`, error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else if (interaction.isSelectMenu()) {
        if (interaction.customId === 'select-pdf') {
            const pdf_url = interaction.values[0];
            try {
                await interaction.user.send(`Here is the PDF you selected:\n${pdf_url}`);
                await interaction.reply({ content: 'The PDF link has been sent to your DMs.', ephemeral: true });
            } catch (error) {
                console.error('Failed to send PDF link to user:', error);
                await interaction.reply({ content: 'Failed to send the PDF link to your DMs. Please make sure you `ADD APP` as `User` and try again.', ephemeral: true });
            }
        }
    }
});

client.on("guildCreate", guild => {
    const user = client.users.cache.get("709210314230726776");
    if (!user) return;

    const embed = new EmbedBuilder()
        .setTitle("Joined a new Server")
        .setDescription(`Guild Name: ${guild.name}`)
        .setColor("Green")
        .setTimestamp();

    user.send({ embeds: [embed] });
});

client.on('guildDelete', guild => {
    const user = client.users.cache.get("709210314230726776");
    if (!user) return;

    const embed = new EmbedBuilder()
        .setTitle("Left a Server")
        .setDescription(`Guild Name: ${guild.name}`)
        .setColor("Red")
        .setTimestamp();

    user.send({ embeds: [embed] });
});

async function fetchNotice() {
    try {
        const response = await fetch(config.notice_url);
        const text = await response.text();
        const dom = new JSDOM(text);
        const document = dom.window.document;

        // const title = document.querySelector('.title').textContent;
        // const desc = document.querySelector('.desc').textContent;
        // const link_info = document.querySelector('.info-link').href;
        // const day = document.querySelector('time .day').textContent;
        // const month = document.querySelector('time .month').textContent;
        // const year = document.querySelector('time .year').textContent;

        // const link = `${config.url}${link_info}`;

        // lastNotice = title;
        // check last notice or not
        // if (title === lastNotice) {
        //     return;
        // }
        // let notice_data = fs.readFileSync('./database/notice.json');
        // let last_notice = JSON.parse(notice_data);

        // if (title === last_notice.title) {
        //     return;
        // }

        // last_notice.title = title;
        // fs.writeFileSync('./database/notice.json', JSON.stringify(last_notice));

        const notices = document.querySelectorAll('.event-list li .info');
        // const time_notices = document.querySelectorAll('.event-list li time')
        let notice_data = fs.readFileSync('./database/notice.json');
        let notice_object = JSON.parse(notice_data) || [];

        lastNotice = notice_object[notice_object.length - 1].title;

        let new_notices = [];

        for (let i = 0; i < notices.length; i++) {
            const notice = notices[i];
            const title = notice.querySelector('.title').textContent;
            const desc = notice.querySelector('.desc').textContent;
            const link_info = notice.querySelector('.info-link').href;
            const timeElement = notice.parentElement.querySelector('time');
            const day = timeElement.querySelector('.day').textContent;
            const month = timeElement.querySelector('.month').textContent;
            const year = timeElement.querySelector('.year').textContent;


            const link = `${config.url}${link_info}`;

            const existing_notice =  notice_object.find(n => n.title === title);

            if (!existing_notice) {
                const notice_response = await fetch(link);
                const notice_text = await notice_response.text();
                const notice_dom = new JSDOM(notice_text);
                const notice_doc = notice_dom.window.document;
                const pdf_links = notice_doc.querySelectorAll('a[href$=".pdf"]');

                let pdf_options = [];
                if (pdf_links.length > 0) {
                    pdf_options = Array.from(pdf_links).map((pdf, index) => ({
                        label: `PDF ${index + 1}`.slice(0, 100),
                        description: pdf.textContent.trim().slice(0, 100),
                        value: `${config.url}${pdf.getAttribute('href')}`.slice(0, 100)
                    }));
                }
                
                const new_notice = {
                    title: title,
                    desc: desc,
                    link: link,
                    day: day,
                    month: month,
                    year: year,
                    pdf_options: pdf_options
                };

                new_notices.push(new_notice);


                // const channel = client.channels.cache.get(config.channel_id);
                for (const guild of client.guilds.cache.values()) {
                    // Fetch channel ID from database instead of config file
                    const rows = await db.all('SELECT channel_id FROM channel WHERE guild_id = ?', guild.id);

                    console.log(title);

                    if (rows.length > 0) {
                        for (const row of rows) {
                            const channelId = row.channel_id;
                            const channel = client.channels.cache.get(channelId);

                            if (!(channel instanceof TextChannel)) {
                                const sql = `DELETE FROM channel WHERE channel_id = ?`;
                                    await db.run(sql, [channelId], function(err) {
                                    if (err) {
                                        return console.error(err.message);
                                    }
                                    console.log(`Row(s) deleted: ${this.changes}`);
                                });
                            }

                            if (channel && channel instanceof TextChannel) {
                                const permission = channel.permissionsFor(client.user);
                                if (!permission.has(PermissionFlagsBits.ViewChannel) || !permission.has(PermissionFlagsBits.ManageChannels)) {
                                    const sql = `DELETE FROM channel WHERE channel_id = ?`;
                                    await db.run(sql, [channelId], function(err) {
                                    if (err) {
                                        return console.error(err.message);
                                    }
                                    console.log(`Row(s) deleted: ${this.changes}`);
                                    });
                                }
                                

                                if (!permission.has(PermissionFlagsBits.SendMessages) || !permission.has(PermissionFlagsBits.EmbedLinks)) {
                                    await channel.permissionOverwrites.create(client.user, { SendMessages: true, EmbedLinks: true });
                                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                                }
                            } else {
                                const sql = `DELETE FROM channel WHERE channel_id = ?`;
                                await db.run(sql, [channelId], function(err) {
                                    if (err) {
                                        return console.error(err.message);
                                    }
                                    console.log(`Row(s) deleted: ${this.changes}`);
                                });
                            }

                            if (channel && channel instanceof TextChannel) {
                                const embed = new EmbedBuilder()
                                    .setTitle(title)
                                    .setDescription(desc)
                                    .addFields(
                                        { name: 'Published Date:', value: `${day} ${month} ${year}` }
                                    )
                                    .setURL(link)
                                    .setColor("Green")
                                    .setTimestamp();
                                
                                const link_btn = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setLabel('Details')
                                            .setStyle(ButtonStyle.Link)
                                            .setURL(link)
                                    );


                                if (pdf_options.length > 0) {
                                    const select_menu = new StringSelectMenuBuilder()
                                        .setCustomId('select-pdf')
                                        .setPlaceholder('Select a PDF to send to your DM')
                                        .addOptions(
                                            pdf_options.map(option => new StringSelectMenuOptionBuilder(option))
                                        );
                                    
                                    const menu = new ActionRowBuilder()
                                        .addComponents(select_menu);

                                    await channel.send({ embeds: [embed], components: [link_btn, menu] });
                                } else {
                                    await channel.send({ embeds: [embed], components: [link_btn] });
                                }

                            }
                        }
                    } else {
                        console.log('No channels found in the database for the guild');
                    }
                }
            }
        }

        notice_object = [...notice_object, ...new_notices];


        fs.writeFileSync('./database/notice.json', JSON.stringify(notice_object));

        

        // const channel = client.channels.cache.get(config.channel_id);
        // for (const guild of client.guilds.cache.values()) {
            // Fetch channel ID from database instead of config file
        //     const rows = await db.all('SELECT channel_id FROM channel WHERE guild_id = ?', guild.id);

        //     console.log(title);

        //     if (rows.length > 0) {
        //         for (const row of rows) {
        //             const channelId = row.channel_id;
        //             const channel = client.channels.cache.get(channelId);

        //             if (channel) {
        //                 const permission = channel.permissionsFor(client.user);
        //                 if (!permission.has(PermissionFlagsBits.SendMessages) || !permission.has(PermissionFlagsBits.EmbedLinks)) {
        //                     await channel.permissionOverwrites.create(client.user, { SendMessages: true, EmbedLinks: true });
        //                     await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
        //                 }
        //             }

        //             if (channel) {
        //                 const embed = new EmbedBuilder()
        //                     .setTitle(title)
        //                     .setDescription(desc)
        //                     .addFields(
        //                         { name: 'Published Date:', value: `${day} ${month} ${year}` }
        //                     )
        //                     .setURL(link)
        //                     .setColor("Green")
        //                     .setTimestamp();

        //                 const link_btn = new ActionRowBuilder()
        //                     .addComponents(
        //                         new ButtonBuilder()
        //                             .setLabel('Details')
        //                             .setStyle(ButtonStyle.Link)
        //                             .setURL(link)
        //                     );

        //                 await channel.send({ embeds: [embed], components: [link_btn] });
        //             }
        //         }
        //     } else {
        //         console.log('No channels found in the database for the guild')
        //     }
        // }
    } catch (error) {
        console.error('Failed to catch notice: ', error);
    }
}

client.login(process.env.TOKEN);