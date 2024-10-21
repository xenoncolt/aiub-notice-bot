import { ChatInputCommandInteraction, Client, GuildMember, NewsChannel, PermissionFlagsBits, TextChannel } from "discord.js";
import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { channelDB } from "../schema/aiubNews";
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

const channel_db = channelDB();

export default {
    name: 'remove',
    description: 'Remove a channel',
    options: [
        {
            name: 'notice',
            type: 1,
            description: 'Remove a channel to stop sending new notice',
            options:[{
                name: 'channel',
                type: 7,
                description: 'Select a channel to reset',
                required: true,
            }]
        },
        {
            name: 'news',
            type: 1,
            description: 'Remove a channel to stop sending new News and Events',
            options:[{
                name: 'channel',
                type: 7,
                description: 'Select a channel to reset',
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
                await interaction.editReply(`Invalid channel or guild`);
                return;
            }

            const permission = channel.permissionsFor(client.user!);

            if (!permission) {
                await interaction.editReply(`I don't have enough permissions to access <#${channel.id}> channel's.`)
                return;
            }

            if (!member.permissions.has([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageChannels])) {
                await interaction.editReply(`You don't have enough permission to setup channels.`)
                return;
            }

            if (sub_cmd === 'notice') {
                if (!(await checkIfChannelExists('channel', channel.id))) {
                    await interaction.editReply(`You haven't set up <#${channel.id}> for notifications yet.`);
                    return;
                }

                await db.run('DELETE FROM channel WHERE guild_id = ? AND channel_id = ?', [guild_id, channel.id]);
                await interaction.editReply(`Channel has been Remove! <:ThumbsUP:806052736089063434>\nYou can add again by using \`/setup notice\``);
            } else if (sub_cmd === 'news') {
                if (!(await checkIfChannelExists('aiubNewsChannel', channel.id))) {
                    await interaction.editReply(`You haven't set up <#${channel.id}> for notifications yet.`);
                    return;
                }

                (await channel_db).run('DELETE FROM aiubNewsChannel WHERE guild_id = ? AND channel_id = ?', [guild_id, channel.id]);
                await interaction.editReply(`Channel has been Remove! <:ThumbsUP:806052736089063434>\nYou can add again by using \`/setup news\``);
            }
        } catch (error) {
            console.error('Something went wrong in remove.ts: ', error);
        }
    }
} as Command;

async function checkIfChannelExists(table: string, channel_id: string): Promise<boolean> {
    if (table === 'channel') {
        const exists = await db.get(`SELECT 1 FROM ${table} WHERE channel_id = ?`, [channel_id]);
        return exists ? true : false;
    } else if (table === 'aiubNewsChannel') {
        const exists = await (await channel_db).get(`SELECT 1 FROM ${table} WHERE channel_id = ?`, [channel_id]);
        return exists ? true : false;
    }
    return false;
}