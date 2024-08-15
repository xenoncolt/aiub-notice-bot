import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { DMChannel } from "discord.js";

let db;

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
    `);
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
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const sub_cmd = interaction.options.getSubcommand();
            const type = interaction.options.getString('type');

            const user_id = interaction.user.id;

            const exists = await checkIfUserExists(type, user_id);

            if (sub_cmd === 'setup') {
                const can_dm = await canSendDM(interaction.user, type);

                if (exists) {
                    await interaction.editReply(`You already subscribe to ${type}.`);
                    return;
                }

                if (!can_dm) {
                    await interaction.editReply("I can't send you direct message. Please make sure you `Add App` as a user(`Try it Now`).\nIf you don't know how then click me and you will see a `Add App` button. Click that button and select `Try it Now` and then click `Authorize`.\nIf you still face problem then contact with me father [website](https://xenoncolt.me)")
                    return;
                }

                await updateDMChannel(type, user_id);
                await interaction.editReply(`I will send you **${type}** notifications when they are published.\n\nIf you want to stop receiving **${type}** notifications, type \`/dm reset\`.`);
            }

            if (sub_cmd === 'reset') {
                
                
                if (!exists) {
                    await interaction.editReply(`You haven't set up **${type}** notifications yet.`);
                } else {
                    await resetDM(type, user_id);
                    await interaction.editReply(`You have been unsubscribed from **${type}** notifications.`);
                }
            }
        }catch (error) {
            console.error('Something went wrong in DM.js: ', error);
            await interaction.editReply('An error occurred while processing your request.');
        }
    } 
}

async function canSendDM(user, type) {
    try {
        const dm = await user.createDM();
        await dm.send(`I will be send all new ${type} here.`);
        return true;
    } catch (error) {
        return false;
    }
}

async function updateDMChannel(column, user_id) {
    // const check_if_exists_query = `SELECT 1 FROM dm WHERE ${column} = ?`;
    // const empty_slot_query = `SELECT rowid FROM dm WHERE ${column} IS NULL LIMIT 1`;
    // const insert_query = `INSERT INTO dm (${column}) VALUES (?)`;
    // const update_query = `UPDATE dm SET ${column} = ? WHERE rowid = ?`;

    // const exists = await db.get(check_if_exists_query, [userId]);

    // try {
    //     if (exists) {
    //         console.log(`${userId} already exists in ${column}`);
    //         return;
    //     }
    
    //     const row = await db.get(empty_slot_query);
    
    //     if (row) {
    //         await db.run(update_query, [userId, row.rowid]);
    //     } else {
    //         const columns = ['notice', 'news', 'aiub_cc'].filter(col => col !== column);
    //         const values = await db.get(`SELECT ${columns.join(', ')} FROM dm ORDER BY rowid DESC LIMIT 1`);

    //         if (values) {
    //             const column_values = columns.map(col => values[col]);
    //             await db.run(`INSERT INTO dm (${columns.join(', ')}, ${column}) VALUES (${column_values.map(() => '?').join(', ')}, ?)`, [...column_values, userId]);
    //         } else {
    //             await db.run(insert_query, [userId]);
    //         }
    //         // await db.run(insert_query, [userId]);
    //     }

    
    // } catch (error) {
    //     console.error('SQL error in updateDMChannel:', error);
    //     throw error;
    // }

    const check_if_exists_query = `SELECT rowid FROM dm WHERE ${column} = ? OR ${column} IS NULL LIMIT 1`;
    const update_query = `UPDATE dm SET ${column} = ? WHERE rowid = ?`;
    const insert_query = `INSERT INTO dm (${column}) VALUES (?)`;

    try {
        const row = await db.get(check_if_exists_query, [user_id]);

        if (row) {
            await db.run(update_query, [user_id, row.rowid]);
            console.log(`${user_id} has been update or inserted into ${column}`);
        } else {
            await db.run(insert_query, [user_id]);
            console.log(`${user_id} has been inserted into ${column}`);
        }
    } catch (error) {
        console.error('SQL error in updateDMChannel:', error);
        throw error;
    }
}

async function checkIfUserExists(column, user_id) {
    const check_if_exists_query = `SELECT 1 FROM dm WHERE ${column} = ?`;
    const exists = await db.get(check_if_exists_query, [user_id]);
    return exists ? true : false;
}

async function resetDM(column, user_id) {
    const reset_query = `UPDATE dm SET ${column} = NULL WHERE ${column} = ?`;
    
    try {
        await db.run(reset_query, [user_id]);
    } catch (error) {
        console.error(`SQL error in resetDM: `, error);
        throw error;
    }
}

