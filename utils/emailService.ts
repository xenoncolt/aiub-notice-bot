import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function validateStudentId(studentId: string): boolean {
    // Format: XX-XXXXX-X
    const pattern = /^\d{2}-\d{5}-\d$/;
    return pattern.test(studentId);
}

export function getStudentEmail(studentId: string): string {
    return `${studentId}@student.aiub.edu`;
}

export async function sendVerificationEmail(studentId: string, code: string): Promise<boolean> {
    const email = getStudentEmail(studentId);
    
    try {
        await transporter.sendMail({
            from: `"AIUB Bot Verification" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Discord Server Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #5865F2;">AIUB Discord Verification</h2>
                    <p>Hello Student!</p>
                    <p>Your verification code is:</p>
                    <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #5865F2;">${code}</span>
                    </div>
                    <p>This code will expire in <strong>10 minutes</strong>.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">This is an automated message from AIUB Notice Bot.</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}
