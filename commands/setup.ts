import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { ChatInputCommandInteraction, Client, GuildMember, NewsChannel, PermissionFlagsBits, TextChannel } from "discord.js";
import { Command } from "../types/Command";

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

export default {
    name: 'setup',
    description: 'Setup or reset a channel',
    options: [
        {
            name: 'notice',
            type: 1,
            description: 'Setup a channel',
            options: [{
                name: 'channel',
                type: 7,
                description: 'Select a channel to setup',
                required: true,
            }],
        },
        {
            name: 'reset',
            type: 1,
            description: 'Reset a channel',
            options: [{
                name: 'channel',
                type: 7,
                description: 'Select a channel to reset',
                required: true,
            }],
        },
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
                await interaction.editReply('I can\'t access this channel\'s permissions.');
                return;
            }

            if (sub_cmd === 'notice') {
                if (!member.permissions.has([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels])) {
                    await interaction.editReply("You don't have enough permission to set up a notice channel.");
                    return;
                }

                if (!(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) {
                    await interaction.editReply('Channel is not a Text Channel Or Announcement Channel. Please select a text channel or announcement channel.');
                    return;
                }

                if (!permission.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageRoles])) {
                    await interaction.editReply('I don\'t have permission to view or manage role in this channel. If you don\'t know how to give me that permission then just invite me again (Click to my profile -> Add App -> Add to server).');
                    return;
                }

                if (!permission.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                    await channel.permissionOverwrites.create(client.user!, { SendMessages: true, EmbedLinks: true });
                    await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                }

                await db.run('INSERT OR IGNORE INTO channel (guild_id, channel_id) VALUES (?, ?)', [guild_id, channel.id]);
                await interaction.editReply('Channel has been set! <:Nice:791390203944239134> Please wait for the next notice.\nPlease review me here. <:crying_praying:791390109839654922> \n[Review](https://top.gg/bot/1123156043711651910#reviews)');
                await channel.send({ content: `New Notice will be post here.\nPlease wait for that.\nDon't delete this channel. Deleting this channel means stop posting notice in this channel.\nDon't change any permission of this channel. Change when you have knowledge about channel management.` });
            } else if (sub_cmd === 'reset') {
                if (!member.permissions.has([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels])) {
                    await interaction.editReply("You don\'t have enough permission to setup notice channel.");
                    return;
                }

                await db.run('DELETE FROM channel WHERE guild_id = ? AND channel_id = ?', [guild_id, channel.id]);
                await interaction.editReply('Channel has been reset! <:ThumbsUP:806052736089063434>\nYou can add again by using \`/setup notice\`');
            }
        } catch (error) {
            console.error('Something went wrong: ', error);
        }
    }
} as Command;