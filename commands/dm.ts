import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { ChatInputCommandInteraction, User } from "discord.js";
import { Command } from "../types/Command";

let db : Database;

(async () => {
    db = await open({
        filename: './database/data.sqlite',
        driver: sqlite3.Database
    });

    await db.run(`
    CREATE TABLE IF NOT EXISTS dm (
        notice TEXT,
        news TEXT,
        aiub_cc TEXT,
        UNIQUE(notice, news, aiub_cc)
    )
    `)
})();

export default {
    name: 'dm',
    type: 2,
    description: 'Send or reset notice, news, aiub_cc to DM',
    options: [
        {
            name: 'setup',
            type: 1,
            description: 'Setup a notification',
            options: [
                {
                    type: 3,
                    name: 'type',
                    description: 'Choose which notification you want to receive',
                    required: true,
                    choices: [
                        {
                            name: 'Notice',
                            value: 'notice'
                        },
                        {
                            name: 'News',
                            value: 'news'
                        },
                        {
                            name: 'AIUB Computer Club',
                            value: 'aiub_cc'
                        }
                    ]
                }
            ]
        },
        {
            name: 'reset',
            type: 1,
            description: 'Reset a notification',
            options: [
                {
                    type: 3,
                    name: 'type',
                    description: 'Choose which notification you want to unsubscribe',
                    required: true,
                    choices: [
                        {
                            name: 'Notice',
                            value: 'notice'
                        },
                        {
                            name: 'News',
                            value: 'news'
                        },
                        {
                            name: 'AIUB Computer Club',
                            value: 'aiub_cc'
                        }
                    ]
                }
            ]
        }
    ],
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const sub_cmd = interaction.options.getSubcommand();
            const type = interaction.options.getString('type');

            // Validate type is one of 'notice', 'news', or 'aiub_cc'
            const valid_types = ['notice', 'news', 'aiub_cc'];
            if (type === null || !valid_types.includes(type)) {
                await interaction.editReply(`Invalid type selected. Please choose either 'notice', 'news', or 'aiub_cc'.`);
                return;
            }

            const user_id = interaction.user.id;

            if (sub_cmd === 'setup') {
                if (await checkIfUserExists(type as string, user_id)) {
                    await interaction.editReply(`You already subscribe to ${type}`);
                    return;
                }

                if (!(canSendDM(interaction.user, type))) {
                    await interaction.editReply(`I can't send you direct message. Please make sure you \`Add App\` as a user(\`Try it Now\`).\nIf you don't know how then click me and you will see a \`Add App\` button. Click that button and select \`Try it Now\` and then click \`Authorize\`.\nIf you still face problem then contact with me father [website](https://xenoncolt.me)`);
                    return;
                }

                await updateDMChannel(type as string, user_id);
                await interaction.editReply(`I will send you **${type}** notifications when they are published.\n\nIf you want to stop receiving **${type}** notifications, use\`/dm reset\` command.`);
            }

            if (sub_cmd === 'reset') {
                if (!(await checkIfUserExists(type as string, user_id))) {
                    await interaction.editReply(`You haven't set up **${type}** notifications yet.`);
                } else {
                    await resetDM(type as string, user_id);
                    await interaction.editReply(`<:ThumbsUP:806052736089063434>You have been unsubscribed from **${type}** notifications.`);
                }
            }
        } catch (error) {
            console.error('Something went wrong in DM.js: ', error);
            await interaction.editReply('An error occurred while processing your request.');
        }
    }
} as Command;

async function checkIfUserExists(column: string, user_id: string): Promise<boolean> {
    const check_if_exists_query = `SELECT 1 FROM dm WHERE ${column} = ?`;
    const exists = await db.get(check_if_exists_query, [user_id]);
    return exists ? true : false;
}

async function canSendDM(user: User, type: string | null): Promise<boolean> {
    try {
        const dm = await user.createDM();
        await dm.send(`You have successfully subscribed to ${type}`);
        return true;
    } catch (error) {
        return false;
    }
}

async function updateDMChannel(column: string, user_id: string): Promise<void> {
    const check_if_exists_query = `SELECT rowid FROM dm WHERE ${column} = ? OR ${column} IS NULL LIMIT 1`;
    const update_query = `UPDATE dm SET ${column} = ? WHERE rowid = ?`;
    const insert_query = `INSERT INTO dm (${column}) VALUES (?)`;

    try {
        const row = await db.get(check_if_exists_query, [user_id])
        if (row) {
            await db.run(update_query, [user_id, row.rowid]);
            console.log(`${user_id} has been inserted or into ${column}`);
        } else {
            await db.run(insert_query, [user_id]);
            console.log(`${user_id} has been inserted into ${column}`);
        }
    } catch (error) {
        console.error('SQL error in updateDMChannel: ', error);
        throw error;
    }
}

async function resetDM(column: string, user_id: string): Promise<void> {
    const reset_query = `UPDATE dm SET ${column} = NULL WHERE ${column} = ?`;

    try {
        await db.run(reset_query, [user_id]);
    } catch (error) {
        console.error(`SQL error in resetDM: `, error);
        throw error;
    }
}