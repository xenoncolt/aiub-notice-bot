import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { PermissionFlagsBits, TextChannel } from "discord.js";

// Database thing
let db;

// open({
//     filename: './database/channel.db',
//     driver: sqlite3.Database
// }).then((database) => {
//     db = database;
// })
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
    async execute(interaction) {
        try {
        // wait for the response
        await interaction.deferReply();


        const sub_cmd = interaction.options.getSubcommand();
        const channelId = interaction.options.getChannel('channel').id;

        const channel = interaction.options.getChannel('channel');
        const permissions = channel.permissionsFor(interaction.client.user);
        const usr = interaction.member;

        if (sub_cmd === 'notice') {

            if (!usr.permissions.has(PermissionFlagsBits.Administrator) || !usr.permissions.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.editReply("You don\'t have enough permission to setup notice channel.");
                return;
            }

            if (!(channel instanceof TextChannel)) {
                await interaction.editReply('Channel is not a Text Channel. Please select a text channel.');
                return;
            }

            if (!permissions.has(PermissionFlagsBits.ViewChannel) || !permissions.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.editReply('I don\'t have permission to view or manage this channel.');
                return;
            }

            if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                await channel.permissionOverwrites.create(client.user, { SendMessages: true, EmbedLinks: true });
                await channel.permissionOverwrites.create(channel.guild.roles.everyone, { SendMessages: false });
                return;
            }

            await db.run('INSERT OR IGNORE INTO channel (guild_id, channel_id) VALUES (?, ?)', [interaction.guild.id, channelId]);
            await interaction.editReply('Channel has been set! <:Nice:791390203944239134> Please wait for the next notice.\nPlease review me here. <:crying_praying:791390109839654922> \n[Review](https://top.gg/bot/1123156043711651910#reviews)');
        } else if (sub_cmd === 'reset') {

            if (!usr.permissions.has(PermissionFlagsBits.Administrator) || !usr.permissions.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.editReply("You don\'t have enough permission to setup notice channel.");
                return;
            }
            
            await db.run('DELETE FROM channel WHERE guild_id = ? AND channel_id = ?', [interaction.guild.id, channelId]);
            await interaction.editReply('Channel has been reset! <:ThumbsUP:806052736089063434>\nYou can add again by using \`/setup notice\`');
        }
    } catch (error) {
        console.error('Something went wrong: ', error);
    }
    },
};