import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, DiscordAPIError, EmbedBuilder, NewsChannel, PermissionFlagsBits, TextChannel } from "discord.js";
import { JSDOM } from "jsdom";
import config from "../config.json" with { type: "json" };
import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { channelDB, newsEventsDB } from "../schema/aiubNews.js";

// Channel id and Guild ID
const channel_db = await channelDB(); 


// User ID 
let user_db: Database;
open({
    filename: './database/data.sqlite',
    driver: sqlite3.Database
}).then((database) => {
    user_db = database;
});


// AIUB News & Events Database
const news_db = await newsEventsDB();

export async function fetchNewsEvents(client: Client): Promise<void> {
    try {
        const response = await fetch(config.event_url);
        const response_text = await response.text();
        const dom = new JSDOM(response_text);
        const document = dom.window.document;

        const news_events = document.querySelectorAll('.event-list li .info');
        const new_news_events = [];

        for(let i = 0; i < news_events.length; i++) {
            const news_event = news_events[i];
            const title = news_event.querySelector('.title')?.textContent || "";
            const desc = news_event.querySelector('.desc')?.textContent || "";
            const link_info = news_event.querySelector('.info-link')?.getAttribute('href') || "";
            const time_element = news_event.parentElement?.querySelector('time');
            const day = time_element?.querySelector('.day')?.textContent || "";
            const month = time_element?.querySelector('.month')?.textContent || "";
            const year = time_element?.querySelector('.year')?.textContent || "";

            const published_date = `${day} ${month} ${year}`;

            const link = `${config.url}${link_info}`;

            const existing_news_event = await news_db.get('SELECT title FROM aiub WHERE title = ?', [title]);
            
            if (!existing_news_event) {
                const all_deliveries_successful = [];

                for(const guild of client.guilds.cache.values()) {
                    const rows = await channel_db.all('SELECT channel_id FROM aiubNewsChannel WHERE guild_id = ?', guild.id);

                    if (rows.length > 0) {
                        for (const row of rows) {
                            const channel = guild.channels.cache.get(row.channel_id);

                            if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
                                try {
                                    const result  = await channel_db.run(`DELETE FROM aiubNewsChannel WHERE channel_id = ?`, [row.channel_id]);

                                    if (result.changes! > 0) {
                                        console.log(`Row(s) deleted: ${result.changes}`);
                                    } else {
                                        console.log(`No row(s) deleted for channel ID: ${row.channel_id}`);
                                    }
                                } catch (error) {
                                    console.error(`Error deleting channel with ID ${row.channel_id}: `, (error as Error).message);
                                }
                                continue;
                            }

                            const permission  = channel.permissionsFor(client.user!);

                            if (!permission?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageRoles])) {
                                try {
                                    const result = await channel_db.run(`DELETE FROM aiubNewsChannel WHERE channel_id = ?`, [row.channel_id]);

                                    if (result.changes! > 0) {
                                        console.log(`Row(s) deleted: ${result.changes}`);
                                    } else {
                                        console.log(`No row(s) deleted for channel ID: ${row.channel_id}`);
                                    }
                                } catch (error) {
                                    console.error(`Error setting permissions for channel with ID ${channel.id}: `, (error as Error).message);
                                }
                                continue;
                            }

                            if (permission.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ViewChannel])) {
                                if (!permission.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                                    await channel.permissionOverwrites.create(client.user!, { SendMessages: true, EmbedLinks: true });
                                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
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
                                        default_channel.send(`I don\'t have permission to Send Message or Embed Link or Manage Role to <#${row.channel_id}> channel. As a result I can't send new AIUB News and Events.  If you don\'t know how to give me that permission then just invite me again (Click to my profile -> Add App -> Add to server).`)
                                    }
                                }
                                continue;
                            }

                            if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
                                const embed = new EmbedBuilder()
                                    .setTitle(title)
                                    .setDescription(desc)
                                    .setColor("Random")
                                    .addFields(
                                        {
                                            name: "Published Date:",
                                            value: published_date
                                        }
                                    )
                                    .setURL(link)
                                    .setTimestamp()

                                const link_btn = new ActionRowBuilder<ButtonBuilder>()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setLabel('Details')
                                            .setStyle(ButtonStyle.Link)
                                            .setURL(link)
                                            .setEmoji("📰")
                                    );

                                try {
                                    await channel.send({ embeds: [embed], components: [link_btn] });
                                    all_deliveries_successful.push(true);
                                } catch (error) {
                                    all_deliveries_successful.push(false);
                                    console.error(`Failed to send message to channel ${channel.id}: `, (error as Error).message);
                                }
                            }
                        }
                    } else {
                        console.log(`No channel found for guild ID: ${guild.id}`);
                    }
                }


                // Send to all users that have subscribed
                const user_rows = await user_db.all('SELECT news FROM dm WHERE news IS NOT NULL');
                if (user_rows.length > 0) {
                    for (const user_row of user_rows) {
                        const user_id = user_row.news
                        const user = await client.users.fetch(user_id).catch(console.error);

                        if (user) {
                            try {
                                const dm_channel = await user.createDM();

                                if (dm_channel.isSendable()) {
                                    const embed = new EmbedBuilder()
                                        .setTitle(title)
                                        .setDescription(desc)
                                        .setColor('Random')
                                        .addFields(
                                            {
                                                name: 'Published Date:',
                                                value: published_date
                                            }
                                        )
                                        .setTimestamp()
                                        .setURL(link)
                                        .setFooter({ text: `\'/dm reset\' to stop sending notice` });

                                    const link_btn = new ActionRowBuilder<ButtonBuilder>()
                                        .addComponents(
                                            new ButtonBuilder()
                                                .setLabel('Details')
                                                .setStyle(ButtonStyle.Link)
                                                .setURL(link)
                                                .setEmoji("📰")
                                        );

                                    await dm_channel.send({ embeds: [embed], components: [link_btn] });
                                    all_deliveries_successful.push(true);
                                }
                            } catch (error) {
                                if (error instanceof DiscordAPIError && error.message.includes('Cannot send messages to this user')) {
                                    console.error(`Cannot send messages to user ${user_id}. Removing from notice database.`);

                                    try {
                                        const result = await user_db.run('UPDATE dm SET news = NULL WHERE news = ?', [user_id]);

                                        if (result.changes! > 0) {
                                            console.log(`User ${user_id} unsubscribe from news notification.`);
                                        } else {
                                            console.log(`No changes occurs for USER ID: ${user_id}`);
                                        }
                                    } catch (error) {
                                        console.error(`Error while updating dm news for ${user_id}: `, (error as Error).message);
                                    }
                                } else {
                                    all_deliveries_successful.push(false);
                                    console.error(`Failed to send DM to user ${user_id}`, error);
                                }
                            }
                        }
                    }
                } else {
                    console.log('No user found for news notification.');
                }

                if (all_deliveries_successful.every(success => success)) {
                    await news_db.run(`
                    INSERT INTO aiub (title, desc, link_info, published_date) 
                    VALUES (?, ?, ?, ?)
                `, [title, desc, link_info, published_date]);

                new_news_events.push({ title, desc, link_info, published_date });
                console.log(`News "${title}" saved successfully.`);
                } else {
                    console.error(`Failed to deliver notice "${title}" to all recipients, not saving to database.`);
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch notices:', error)
    }    
}