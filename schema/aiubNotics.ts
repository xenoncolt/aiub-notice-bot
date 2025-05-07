import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function noticeDatabase() {
    return open({
        filename: './database/channel.sqlite',
        driver: sqlite3.Database
    });
}

export async function noticeDB() {
    const db = await noticeDatabase();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS channel (
            guild_id TEXT,
            channel_id TEXT,
            UNIQUE(guild_id, channel_id)
        )
    `)
    return db;
}