import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, TextChannel, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, AttachmentBuilder } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import config from "./config.json" assert { type: "json" };
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import fs from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pdfToPng } from "pdf-to-png-converter";
dotenv.config();

// Database thing for notice channel
let db;
open({
    filename: './database/channel.sqlite',
    driver: sqlite3.Database
}).then((database) => {
    db = database;
})

// Database for all other data
let data_db;
open({
    filename: './database/data.sqlite',
    driver: sqlite3.Database
}).then((database) => {
    data_db = database;
})

// For ES6 module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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


// Used array to store commands
const cmdFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));


for (const file of cmdFiles) {
    const cmd = await import(`./commands/${file}`);
    client.commands.set(cmd.default.name, cmd.default);
}




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
    setInterval(fetchNotice, 5 * 60 * 1000);
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
                // await interaction.user.send(`Here is the PDF you selected:\n${config.url}${pdf_url}`);
                await interaction.deferReply({ ephemeral: true }); 

                const pdf_path = await downloadPDF(`${config.url}${pdf_url}`);
                const images = await convertPDFToImages(pdf_path);

                for (const image_path of images) {
                    const attachment = new AttachmentBuilder(image_path);
                    await interaction.user.send({ files: [attachment] });
                    fs.unlinkSync(image_path);
                }

                fs.unlinkSync(pdf_path);

                await interaction.editReply({ content: 'The PDF link has been sent to your DMs.', ephemeral: true });
            } catch (error) {
                console.error('Failed to send PDF link to user:', error);
                await interaction.editReply({ content: 'Failed to send the PDF link to your DMs. Please make sure you `ADD APP` as `User` and try again.', ephemeral: true });
            }
        }
    }
});

client.on("guildCreate", guild => {
    const user = client.users.cache.get("709210314230726776");
    if (!user) return;

    const embed = new EmbedBuilder()
        .setTitle("Joined a new Server")
        .setDescription(`Guild Name: **${guild.name}**`)
        .addFields(
            {
                name: "Guild Description",
                value: `${guild.description}`,
                inline: false
            },
            {
                name: "Guild Owner",
                value: `<@${guild.ownerId}>`,
                inline: true
            },
            {
                name: "Guild Total Member",
                value: `${guild.memberCount}`,
                inline: true
            },
            {
                name: "Guild Created",
                value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>}`
            }
        )
        .setThumbnail(guild.iconURL())
        .setImage(guild.bannerURL())
        .setColor("Green")
        .setTimestamp();

    user.send({ embeds: [embed] });
});

client.on('guildDelete', guild => {
    const user = client.users.cache.get("709210314230726776");
    if (!user) return;

    const embed = new EmbedBuilder()
        .setTitle("Left a Server")
        .setDescription(`Guild Name: **${guild.name}**`)
        .addFields(
            {
                name: "Guild Description",
                value: `${guild.description}`,
                inline: false
            },
            {
                name: "Guild Owner",
                value: `<@${guild.ownerId}>`,
                inline: true
            },
            {
                name: "Guild Total Member",
                value: `${guild.memberCount}`,
                inline: true
            },
            {
                name: "Guild Created",
                value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:R>`
            }
        )
        .setThumbnail(guild.iconURL())
        .setImage(guild.bannerURL())
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
                        value: `${pdf.getAttribute('href')}`.slice(0, 100)
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

                // Send to all users that have subscribed
                const user_rows = await data_db.all('SELECT notice FROM dm WHERE notice IS NOT NULL');
                if (user_rows.length > 0) {
                    for (const user_row of user_rows) {
                        const user_id = user_row.notice;
                        const user = await client.users.fetch(user_id).catch(console.error);

                        // If the user can't found, remove from the database
                        if (!user) {
                            const sql = `UPDATE dm SET notice = NULL WHERE notice = ?`;
                            await data_db.run(sql, [user_id], function(err) {
                                if (err) {
                                    return console.error(err.message);
                                }
                                console.log(`User ${user_id} unsubscribed from notice notifications.`);
                            });
                            continue;
                        }

                        const dm_channel = await user.createDM();

                        const embed = new EmbedBuilder()
                            .setTitle(title)
                            .setDescription(desc)
                            .addFields(
                                {
                                    name: `Published Date:`,
                                    value: `${day} ${month} ${year}`
                                }
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
                                .setPlaceholder('Select a PDF to get as Image')
                                .addOptions(
                                    pdf_options.map(option => new StringSelectMenuOptionBuilder(option))
                                );

                            const menu = new ActionRowBuilder().addComponents(select_menu);
                            await dm_channel.send({ embeds: [embed], components: [link_btn, menu]});
                        } else {
                            await dm_channel.send({ embeds: [embed], components: [link_btn] });
                        }
                    }
                } else {
                    console.log('No users found in the database who subscribe for notices')
                }
            }
        }

        notice_object = [...notice_object, ...new_notices];


        fs.writeFileSync('./database/notice.json', JSON.stringify(notice_object));
    } catch (error) {
        console.error('Failed to catch notice: ', error);
    }
}

async function downloadPDF(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const buffer = await response.buffer();
    const pdf_path = path.join(__dirname, 'download', path.basename(url));
    fs.writeFileSync(pdf_path, buffer);
    return pdf_path;
}

async function convertPDFToImages(pdf_path) {
    try {
        const output_dir = path.dirname(pdf_path);
        const pdf_buffer = fs.readFileSync(pdf_path);

        const images = await pdfToPng(pdf_buffer, {
            disableFontFace: true,
            useSystemFonts: true,
            pages: '1-',
            viewportScale: 2.0
        });

        const image_paths = [];

        for (const [index, image] of images.entries()) {
            const image_path = path.join(output_dir, `page-${index + 1}.png`);
            fs.writeFileSync(image_path, image.content);
            image_paths.push(image_path);
        }

        return image_paths;
    } catch (error) {
      console.error('Failed to convert PDF to images:', error);  
      throw error;
    }
    
}

client.login(process.env.TOKEN);