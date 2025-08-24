import { ActionRowBuilder, Client, PermissionFlagsBits, StringSelectMenuBuilder, TextChannel, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuOptionBuilder, DiscordAPIError, NewsChannel, ChannelType, AttachmentBuilder, MessageFlags, ContainerBuilder } from "discord.js";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import config from "../config.json" with { type: "json" };
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { pdfToPng } from "pdf-to-png-converter";
import { fileURLToPath } from "url";
import { readdir, unlink, writeFile } from "fs/promises";
import { convertSeatPlanPDFsToJson } from "./processSeatPlan.js";
import { htmlToDiscordFormat } from "../helper/htmlToDiscordFormat.js";
import { downloadImage } from "../helper/downloadImage.js";
import { noticeComponentV2 } from "../helper/convertComponentV2.js";

// Database for notice channel only
let notice_db: Database;
open({
    filename: './database/channel.sqlite',
    driver: sqlite3.Database
}).then((database) => {
    notice_db = database;
})

// Database for all other data;
let db: Database;
open({
    filename: './database/data.sqlite',
    driver: sqlite3.Database
}).then((database) => {
    db = database;
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Seat Plan Dir
const seat_plan_dir = path.join(__dirname, '../database/seatplanPDF');

// Clear old files
async function clearDir(dir: string): Promise<void> {
    try {
        const files = await readdir(dir);
        await Promise.all(files.map(file => unlink(path.join(dir, file))));
    } catch (error) {
        console.error(`Error clearing directory ${dir}: `, error);
    }
}

export async function fetchNotice(client: Client): Promise<void> {
    try {
        const response = await fetch(config.notice_url);
        const text = await response.text();
        const dom = new JSDOM(text);
        const document = dom.window.document;

        const notices = document.querySelectorAll('.notification');
        let notice_data = readFileSync('./database/notice.json', 'utf-8');
        let notice_object = JSON.parse(notice_data) || [];

        let lastNotice: string = notice_object[notice_object.length - 1]?.title || "None";

        let new_notices = [];

        for (let i = 0; i < notices.length; i++) {
            const notice = notices[i];
            const short_title = notice.querySelector('.title')?.textContent?.trim() || "";
            const desc = notice.querySelector('.desc')?.textContent?.trim() || "";
            const link_info = notice.querySelector('.info-link')?.getAttribute('href') || "";

            // const timeElement = notice.parentElement?.querySelector('time');
            // const day = timeElement?.querySelector('.day')?.textContent || "";
            // const month = timeElement?.querySelector('.month')?.textContent || "";
            // const year = timeElement?.querySelector('.year')?.textContent || "";

            const day_month_text = notice.querySelector('.date-custom')?.childNodes[0]?.textContent?.trim() || "";
            const [day, month] = day_month_text.split("\n").map(s => s.trim());
            const year = notice.querySelector('.date-custom span:nth-child(1)')?.textContent?.trim() || "";

            const link = `${config.url}${link_info}`;

            const notice_response = await fetch(link);
            const notice_text = await notice_response.text();
            const notice_dom = new JSDOM(notice_text);
            const notice_doc = notice_dom.window.document;

            const title = notice_doc.querySelector('#dynamicHeading')?.textContent?.trim() || short_title;

            const existing_notice: boolean = notice_object.find((n: any) => n.link_info === link_info && n.title === title);

            let full_desc = undefined;
            let img_urls: string[] = [];

            const isContentDiv = notice_doc.querySelector('.question-column:not(.notice-sticky-header)');

            if (!existing_notice) {
                const pdf_links = notice_doc.querySelectorAll('a[href$=".pdf"]');

                if (isContentDiv) {
                    // const textDescContent = isContentDiv.textContent?.trim();
                    const textDescHtml = isContentDiv.innerHTML;
                    const { content: textDescContent, imageUrls } = htmlToDiscordFormat(textDescHtml);

                    // const img_paths = await downloadImage(imageUrls) as string[];

                    img_urls = imageUrls.filter(url => {
                        try {
                            new URL(url);
                            return true;
                        } catch {
                            console.log(`Invalid Url: ${url}`);
                            return false;
                        }
                    }).slice(0, 10);

                    const img_paths: string[] = await downloadImage(img_urls) as string[];

                    // for (const imgUrl of imageUrls) {
                    //     const img_path = await downloadImage(imgUrl);
                    //     imgPaths.push(img_path);
                    // }


                    // const _channel = client.channels.cache.get("1244675616306102402") as TextChannel;

                    // for (const [index, imgPath] of img_paths.entries()) {
                    //     const attachment = new AttachmentBuilder(imgPath, { name: `image-${index + 1}.png` });
                    //     const sent_msg = await _channel.send({ files: [attachment] });
                    //     img_urls.push(sent_msg.attachments.first()!.url);
                    // }

                    // if (textDescContent!.length > 100 && textDescContent!.length < 4000) {
                    //     full_desc = textDescContent;
                    // } else if (textDescContent!.length > 4000) {
                    //     full_desc = textDescContent!.slice(0, 3970) + '...Click details to see more';
                    // }

                    if (textDescContent.length > 100) {
                        full_desc = textDescContent;
                    }


                    let pdf_options: { label: string, description: string, value: string }[] = [];
                    if (pdf_links.length > 0) {
                        pdf_options = Array.from(pdf_links).map((pdf, index) => ({
                            label: `PDF ${index + 1}`.slice(0, 100),
                            description: pdf.textContent?.trim().slice(0, 100)!,
                            value: `${pdf.getAttribute('href')}`.slice(0, 100)
                        }));
                    }

                    const new_notice = {
                        title,
                        desc,
                        full_desc,
                        link_info,
                        img_urls,
                        day,
                        month,
                        year,
                        pdf_options: pdf_options
                    };

                    new_notices.push(new_notice);

                    // Save seat plan pdf
                    if (title.includes("Seat Plan") && title.includes("Exam")) {
                        console.log(`Found a seat plan notice: ${title}`);

                        await clearDir(seat_plan_dir);
                        for (const pdf of pdf_options) {
                            const pdf_url = `${config.url}${pdf.value}`;
                            try {
                                const pdf_response = await fetch(pdf_url);
                                if (!pdf_response.ok) throw new Error(`Failed to fetch PDF from ${pdf_url}`);

                                const pdf_buffer = await pdf_response.arrayBuffer();
                                const pdf_path = path.join(seat_plan_dir, path.basename(pdf.value));
                                await writeFile(pdf_path, Buffer.from(pdf_buffer));
                                console.log(`Downloaded PDF: ${pdf_path}`);
                                convertSeatPlanPDFsToJson();
                            } catch (e) {
                                console.error(`Failed to save PDF "${pdf.label}" from ${pdf_url}: `, e);
                            }
                        }
                    }

                    for (const guild of client.guilds.cache.values()) {
                        // Fetch channel ID from database
                        const rows = await notice_db.all('SELECT channel_id FROM channel WHERE guild_id = ?', guild.id);

                        console.log(title);

                        if (rows.length > 0) {
                            for (const row of rows) {
                                const channel_ID = row.channel_id;
                                const channel = client.channels.cache.get(channel_ID);

                                if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
                                    const sql = `DELETE FROM channel WHERE channel_id = ?`;
                                    try {
                                        const result = await notice_db.run(sql, [channel_ID]);

                                        // The result object contains the 'changes' property, which is the number of row affected
                                        if (result.changes! > 0) {
                                            console.log(`Row(s) deleted: ${result.changes}`);
                                        } else {
                                            console.log(`No row(s) deleted for channel ID: ${channel_ID}`);
                                        }
                                    } catch (error) {
                                        console.error(`Error deleting channel with ID ${channel_ID}: `, (error as Error).message);
                                    }
                                    continue;
                                }

                                // if (channel && channel instanceof TextChannel) {
                                const permission = channel.permissionsFor(client.user!);

                                // I have to change it later (&& to ||)
                                if (!permission?.has(PermissionFlagsBits.ViewChannel)) {
                                    const sql = `DELETE FROM channel WHERE channel_id = ?`;
                                    try {
                                        const result = await notice_db.run(sql, [channel_ID]);

                                        // The result object contains the 'changes' property, which is the number of row affected
                                        if (result.changes! > 0) {
                                            console.log(`Row(s) deleted: ${result.changes}`);
                                        } else {
                                            console.log(`No row(s) deleted for channel ID: ${channel_ID}`);
                                        }
                                    } catch (error) {
                                        console.error(`Error deleting channel with ID ${channel_ID}: `, (error as Error).message);
                                    }
                                    continue;
                                }

                                if (permission.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])) {
                                    try {
                                        if (!permission?.has(PermissionFlagsBits.SendMessages) || !permission.has(PermissionFlagsBits.EmbedLinks)) {
                                            await channel.permissionOverwrites.create(client.user!, { SendMessages: true, EmbedLinks: true });
                                            await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                                        }
                                    } catch (permError) {
                                        console.log(`Cannot update permissions in channel ${channel.name} (${channel.id}): ${permError}`)
                                    }
                                } else if (!permission.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                                    const warn_guild = client.guilds.cache.get(guild.id);
                                    if (warn_guild) {
                                        const bot = warn_guild.members.me;
                                        if (!bot) return;
                                        let default_channel = warn_guild.channels.cache.find(
                                            (target_channel) =>
                                                target_channel.type === ChannelType.GuildText && target_channel.permissionsFor(bot).has(PermissionFlagsBits.SendMessages)
                                        );

                                        if (!default_channel) return;

                                        if (default_channel && default_channel instanceof TextChannel) {
                                            default_channel.send(`I don\'t have permission to Send Message or Embed Link or Manage Role to <#${channel_ID}> channel. As a result I can't send new notice.  If you don\'t know how to give me that permission then just invite me again (Click to my profile -> Add App -> Add to server).`);
                                        }
                                    }
                                    continue;
                                }


                                // } else  {
                                //     const sql = `DELETE FROM channel WHERE channel_id = ?`;
                                //     try {
                                //         const result = await notice_db.run(sql, [channel_ID]);

                                //         // The result object contains the 'changes' property, which is the number of row affected
                                //         if (result.changes! > 0) {
                                //             console.log(`Row(s) deleted: ${result.changes}`);
                                //         } else {
                                //             console.log(`No row(s) deleted for channel ID: ${channel_ID}`);
                                //         }
                                //     } catch (error) {
                                //         console.error(`Error deleting channel with ID ${channel_ID}: `, (error as Error).message);
                                //     }
                                //     continue;
                                // }

                                if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
                                    const formatted_date = `${day} ${month} ${year}`;
                                    const { container, attachments } = await noticeComponentV2(title, desc, full_desc, img_paths, formatted_date);

                                    const link_btn = new ActionRowBuilder<ButtonBuilder>()
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

                                        const menu = new ActionRowBuilder<StringSelectMenuBuilder>()
                                            .addComponents(select_menu);

                                        if (attachments.length > 0) {
                                            await channel.send({ components: [container, link_btn, menu], flags: MessageFlags.IsComponentsV2, files: attachments });
                                        } else {
                                            await channel.send({ components: [container, link_btn, menu], flags: MessageFlags.IsComponentsV2 });
                                        }
                                    } else {
                                        if (attachments.length > 0) {
                                            await channel.send({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2, files: attachments });
                                        } else {
                                            await channel.send({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2 });
                                        }
                                    }
                                }
                            }
                        } else {
                            console.log('No channels found in the database for the guild');
                        }
                    }

                    // Send to all users that have subscribed
                    const user_rows = await db.all('SELECT notice FROM dm WHERE notice IS NOT NULL');
                    if (user_rows.length > 0) {
                        for (const user_row of user_rows) {
                            const user_id = user_row.notice;
                            const user = await client.users.fetch(user_id).catch(console.error);

                            // If the user can't found, remove from the database
                            if (!user) {
                                const sql = `UPDATE dm SET notice = NULL WHERE notice = ?`;
                                try {
                                    const result = await db.run(sql, [user_id]);

                                    if (result.changes! > 0) {
                                        console.log(`User ${user_id} unsubscribe from notice notification.`);
                                    } else {
                                        console.log(`No changes occurs for USER ID: ${user_id}`);
                                    }
                                } catch (error) {
                                    console.error(`Error while updating dm notice for ${user_id}: `, (error as Error).message);
                                }
                                continue;
                            }

                            try {
                                const dm_channel = await user.createDM();

                                if (dm_channel.isSendable()) {
                                    const formatted_date = `${day} ${month} ${year}`;

                                    const { container, attachments } = await noticeComponentV2(title, desc, full_desc, img_paths, formatted_date);

                                    const link_btn = new ActionRowBuilder<ButtonBuilder>()
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

                                        const menu = new ActionRowBuilder<StringSelectMenuBuilder>()
                                            .addComponents(select_menu);

                                        if (attachments.length > 0) {
                                            await dm_channel.send({ components: [container, link_btn, menu], flags: MessageFlags.IsComponentsV2, files: attachments });
                                        } else {
                                            await dm_channel.send({ components: [container, link_btn, menu], flags: MessageFlags.IsComponentsV2 });
                                        }
                                    } else {
                                        if (attachments.length > 0) {
                                            await dm_channel.send({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2, files: attachments });
                                        } else {
                                            await dm_channel.send({ components: [container, link_btn], flags: MessageFlags.IsComponentsV2 });
                                        }
                                    }
                                }
                            } catch (error) {
                                if (error instanceof DiscordAPIError && error.message.includes('Cannot send messages to this user')) {
                                    console.error(`Cannot send messages to user ${user_id}. Removing from notice database.`);

                                    const sql = `UPDATE dm SET notice = NULL WHERE notice = ?`;
                                    try {
                                        const result = await db.run(sql, [user_id]);

                                        if (result.changes! > 0) {
                                            console.log(`User ${user_id} unsubscribe from notice notification.`);
                                        } else {
                                            console.log(`No changes occurs for USER ID: ${user_id}`);
                                        }
                                    } catch (db_error) {
                                        console.error(`Error while updating dm notice for ${user_id}: `, (db_error as Error).message);
                                    }
                                } else {
                                    console.error(`Failed to send DM to user ${user_id}:`, error);
                                }
                            }
                        }
                    } else {
                        console.log(`No users found in the database who subscribe for notices`);
                    }
                }
            }
        }

        notice_object = [...notice_object, ...new_notices];

        writeFileSync('./database/notice.json', JSON.stringify(notice_object));
    } catch (error) {
        console.error('Failed to catch notice: ', error);
    }
}

export async function downloadPDF(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    const pdf_path = path.join(__dirname, '../download', path.basename(url));
    writeFileSync(pdf_path, new Uint8Array(buffer));
    return pdf_path;
}

export async function convertPDFToImages(pdf_path: string): Promise<string[] | string> {
    try {
        const output_dir = path.dirname(pdf_path);
        // const pdf_buffer = readFileSync(pdf_path);

        const images = await pdfToPng(pdf_path, {
            disableFontFace: true,
            useSystemFonts: false,
            viewportScale: 3.0
        });

        if (images.length > 5) return pdf_path;

        const image_paths = [];

        for (const [index, image] of images.entries()) {
            const image_path = path.join(output_dir, `page-${index + 1}.png`);
            writeFileSync(image_path, image.content);
            image_paths.push(image_path);
        }

        return image_paths;
    } catch (error) {
        console.error('Failed to convert PDF to images:', error);
        throw error;
    }
}