import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

let verificationDb: Database | null = null;

export async function verificationDB(): Promise<Database> {
    if (verificationDb) return verificationDb;
    
    verificationDb = await open({
        filename: './database/verification.sqlite',
        driver: sqlite3.Database
    });
    
    // Store server verification configuration
    await verificationDb.run(`
        CREATE TABLE IF NOT EXISTS verification_config (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            description TEXT,
            message_id TEXT
        )
    `);
    
    // Store pending verifications (codes sent but not yet verified)
    await verificationDb.run(`
        CREATE TABLE IF NOT EXISTS pending_verification (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            verification_code TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            UNIQUE(guild_id, user_id)
        )
    `);
    
    // Store verified users
    await verificationDb.run(`
        CREATE TABLE IF NOT EXISTS verified_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(guild_id, user_id)
        )
    `);
    
    return verificationDb;
}
