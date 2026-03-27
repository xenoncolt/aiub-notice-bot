import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function routineDatabase() {
    return open({
        filename: './database/routine.sqlite',
        driver: sqlite3.Database
    });
}

export async function routineDB() {
    const db = await routineDatabase();
    
    // Create table for user routines
    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_routines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            course_title TEXT NOT NULL,
            section TEXT NOT NULL,
            course_value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME DEFAULT (datetime('now', '+5 months')),
            UNIQUE(user_id, course_value)
        )
    `);
    
    // Create index for faster lookups
    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_user_routines_user_id ON user_routines(user_id)
    `);
    
    return db;
}

// Clean up expired routines (run periodically)
export async function cleanupExpiredRoutines() {
    const db = await routineDB();
    await db.run(`DELETE FROM user_routines WHERE expires_at < datetime('now')`);
}

export interface SavedCourse {
    id: number;
    user_id: string;
    course_title: string;
    section: string;
    course_value: string;
    created_at: string;
    expires_at: string;
}
