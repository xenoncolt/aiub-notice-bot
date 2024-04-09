import sqlite3 from "sqlite3";
import { open } from "sqlite";

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
            channel_id TEXT
        )
    `);
})();

export default {
    name: 'setup',
    description: 'Setup or reset a channel',
    options: [
        {
            name: 'set',
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

        if (sub_cmd === 'set') {
            await db.run('INSERT INTO channel (guild_id, channel_id) VALUES (?, ?)', [interaction.guild.id, channelId]);
            await interaction.editReply('Channel has been set!');
        } else if (sub_cmd === 'reset') {
            await db.run('DELETE FROM channel WHERE guild_id = ? AND channel_id = ?', [interaction.guild.id, channelId]);
            await interaction.editReply('Channel has been reset!');
        }
    } catch (error) {
        console.error('Something went wrong: ', error);
    }
    },
};