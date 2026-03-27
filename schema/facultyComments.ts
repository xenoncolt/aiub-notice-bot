import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function facultyCommentsDatabase() {
    return open({
        filename: './database/faculty_comments.sqlite',
        driver: sqlite3.Database
    });
}

export async function facultyCommentsDB() {
    const db = await facultyCommentsDatabase();
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS faculty_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            faculty_email TEXT NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            comment TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(faculty_email, user_id)
        )
    `);
    
    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_faculty_comments_email ON faculty_comments(faculty_email)
    `);
    
    return db;
}

export interface FacultyComment {
    id: number;
    faculty_email: string;
    user_id: string;
    username: string;
    comment: string;
    created_at: string;
}

export async function getCommentsByFaculty(facultyEmail: string, page: number = 1, pageSize: number = 10): Promise<{ comments: FacultyComment[], totalPages: number, totalCount: number }> {
    const db = await facultyCommentsDB();
    
    const countResult = await db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM faculty_comments WHERE faculty_email = ?',
        [facultyEmail]
    );
    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    
    const offset = (page - 1) * pageSize;
    const comments: FacultyComment[] = await db.all(
        'SELECT * FROM faculty_comments WHERE faculty_email = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [facultyEmail, pageSize, offset]
    ) || [];
    
    return { comments, totalPages, totalCount };
}

export async function getAllCommentsByFaculty(facultyEmail: string): Promise<FacultyComment[]> {
    const db = await facultyCommentsDB();
    const comments: FacultyComment[] = await db.all(
        'SELECT * FROM faculty_comments WHERE faculty_email = ? ORDER BY created_at DESC',
        [facultyEmail]
    ) || [];
    return comments;
}

export async function addComment(facultyEmail: string, userId: string, username: string, comment: string): Promise<boolean> {
    const db = await facultyCommentsDB();
    
    try {
        await db.run(
            'INSERT OR REPLACE INTO faculty_comments (faculty_email, user_id, username, comment, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
            [facultyEmail, userId, username, comment]
        );
        return true;
    } catch (error) {
        console.error('Error adding comment:', error);
        return false;
    }
}

export async function getUserComment(facultyEmail: string, userId: string): Promise<FacultyComment | undefined> {
    const db = await facultyCommentsDB();
    return db.get<FacultyComment>(
        'SELECT * FROM faculty_comments WHERE faculty_email = ? AND user_id = ?',
        [facultyEmail, userId]
    );
}
