import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { ChatInputCommandInteraction, Client, GuildMember, NewsChannel, PermissionFlagsBits, TextChannel } from "discord.js";
import { Command } from "../types/Command";
import { channelDB } from "../schema/aiubNews.js";

let db: Database;
(async () => {
    db = await open({
        filename: './database/channel.sqlite',
        driver: sqlite3.Database
    });
    
    await db.run(`
        CREATE TABLE IF NOT EXISTS channel (
            guild_id TEXT,
            channel_id TEXT,
            UNIQUE(guild_id, channel_id)
        )
    `);
})();

const channel_db = channelDB();

export default {
    name: 'setup',
    description: 'Setup a channel',
    options: [
        {
            name: 'notice',
            type: 1,
            description: 'Setup a channel for send new notice',
            options: [{
                name: 'channel',
                type: 7,
                description: 'Select a channel to setup',
                required: true,
            }],
        },
        {
            name: 'news',
            type: 1,
            description: 'Setup a news for send new News and Events',
            options: [{
                name: 'channel',
                type: 7,
                description: 'Select a channel to setup',
                required: true,
            }]
        }
    ],
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply();

            const sub_cmd = interaction.options.getSubcommand();
            const channel = interaction.options.getChannel('channel') as TextChannel | NewsChannel;
            const guild_id = interaction.guild?.id;
            const client = interaction.client as Client;
            const member = interaction.member as GuildMember;

            if (!channel || !guild_id || !channel.id) {
                await interaction.editReply('Invalid channel or guild.');
                return;
            }

            const permission = channel.permissionsFor(client.user!);

            if (!permission) {
                await interaction.editReply(`I don't have enough permissions to access <#${channel.id}> channel's.`)
                return;
            }

            if (sub_cmd === 'notice') {
                if (!member.permissions.has([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels])) {
                    await interaction.editReply("You don't have enough permission to set up a **Notice** channel.");
                    return;
                }

                if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
                    await interaction.editReply('Channel is not a Text Channel Or Announcement Channel. Please select a text channel or announcement channel.');
                    return;
                }

                if (!permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageRoles])) {
                    await interaction.editReply(`I don\'t have permission to view or manage role in <#${channel.id}> channel. If you don\'t know how to give me that permission then just invite me again (Click to my profile -> Add App -> Add to server).`);
                    return;
                }

                if (permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
                    await channel.permissionOverwrites.create(client.user!, { SendMessages: true, EmbedLinks: true });
                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                }

                await db.run('INSERT OR IGNORE INTO channel (guild_id, channel_id) VALUES (?, ?)', [guild_id, channel.id]);
                await interaction.editReply('Channel has been set! <:Nice:791390203944239134> Please wait for the next notice.\nPlease review me here. <:crying_praying:791390109839654922> \n[Review](https://top.gg/bot/1123156043711651910#reviews)');
                await channel.send({ content: `New Notice will be post here.\nPlease wait for that.\nDon't delete this channel. Deleting this channel means stop posting notice in this channel.\nDon't change any permission of this channel. Change when you have knowledge about channel management.` });
            } else if (sub_cmd === 'news') {
                if (!member.permissions.has([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels])) {
                    await interaction.editReply("You don't have enough permission to set up **News & Events** channel.");
                    return;
                }

                if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
                    await interaction.editReply('Channel is not a Text Channel Or Announcement Channel. Please select a text channel or announcement channel.');
                    return;
                }

                if (!permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageRoles])) {
                    await interaction.editReply(`I don't have permission to view or manage role in ${channel.id} channel. If you don\'t know how to give me that permission then just invite me again (Click to my profile -> Add App -> Add to server).`);
                    return;
                }

                if (permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) {
                    await channel.permissionOverwrites.create(client.user!, { SendMessages: true, EmbedLinks: true });
                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                }

                (await channel_db).run('INSERT OR IGNORE INTO aiubNewsChannel (guild_id, channel_id) VALUES (?, ?)', guild_id, channel.id);
                await interaction.editReply('Channel has been set! <:Nice:791390203944239134> Please wait for the next AIUB News & Events.\nPlease review me here. <:crying_praying:791390109839654922> \n[Review](https://top.gg/bot/1123156043711651910#reviews)');
                await channel.send({ content: `New AIUB News & Events will be post here.\nPlease wait for that.\nDon't delete this channel. Deleting this channel means stop posting AIUB News & Events in this channel.\nDon't change any permission of this channel. Change when you have knowledge about channel management.` });
                
            }
        } catch (error) {
            console.error('Something went wrong: ', error);
        }
    }
} as Command;