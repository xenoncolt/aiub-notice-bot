import { open } from "sqlite";
import sqlite3 from "sqlite3";


async function newsDatabase() {
    return open({
        filename: './database/newsEvents.sqlite',
        driver: sqlite3.Database
    });
}

export async function newsEventsDB() {
    const db = await newsDatabase();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS aiub (
            title TEXT PRIMARY KEY,
            desc TEXT,
            link_info TEXT,
            published_date TEXT
        )
    `)
    return db;
}

async function channelDatabase() {
    return open({
        filename: './database/data.sqlite',
        driver: sqlite3.Database
    });
}

export async function channelDB() {
    const db = await channelDatabase();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS aiubNewsChannel (
            guild_id TEXT,
            channel_id TEXT UNIQUE
        )
    `);
    return db;
}