import { ChatInputCommandInteraction, Client, EmbedBuilder } from 'discord.js';
import { readFile, readdir } from 'fs/promises';
import path, { basename, join } from 'path';
import { Command } from '../types/Command';
import { fileURLToPath } from 'url';
import PdfParse, {  } from "pdf-parse-new";
import { SeatPlan } from "../types/SeatPlan";
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seat_plan_dir = path.join(__dirname, '../database/seatplanPDF');

const REQUIRED_COLUMNS = ['sl', 'student id', 'student name', 'department', 'room no', 'column no'];

export default {
    name: 'exam-seat-plan',
    type: 3,
    description: 'Get exam seat plan details by providing a student ID',
    options: [
        {
            type: 3,
            name: 'student-id',
            description: 'Enter your Student ID (e.g., 23-51730-2)',
            required: true,
        },
    ],

    async execute(interaction: ChatInputCommandInteraction) {
        const student_id = interaction.options.getString('student-id');

        if (!student_id) return;

        try {

            // await processPDFs(student_id);
            // await interaction.reply({ content: 'Success', ephemeral: true});
            const student_details = await processPDFs(student_id);

            if (student_details) {
                const embed = new EmbedBuilder()
                    .setTitle('Exam Seat Plan')
                    .setDescription(`Details for student ID: ${student_id}`)
                    .setColor('Random')
                    .addFields(
                        {
                            name: '👤 Student Name',
                            value: student_details.name,
                            inline: false
                        },
                        {
                            name: '🏫 Department',
                            value: student_details.department,
                            inline: true
                        },
                        {
                            name: '🔢 Serial No.',
                            value: student_details.sl.toString(),
                            inline: false
                        },
                        {
                            name: '🚪 Room No.',
                            value: student_details.room.toString(),
                            inline: true
                        }, 
                        {
                            name: '📋 Column No.',
                            value: student_details.column.toString(),
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Collected from AIUB Notice board.' });

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: `❌ Student ID: ${student_id} not found in the seat plan.\n You have exam but not showing, report using \`/report\``, ephemeral: true });
            }
        } catch (error) {
            console.error(`Error reading PDF files: `, error);
            await interaction.reply({
                content: 'There was an error processing your request. Please try again later or report using \`/report \`.',
                ephemeral: true,
            });
        }
    },
} as Command;

async function processPDFs(student_id: string): Promise<SeatPlan | null> {
    try {
        const files = await readdir(seat_plan_dir);
        // const normalized_student_id = student_id.replace(/-/g, '').toLowerCase();

        for (const file of files) {
            if (!file.toLowerCase().endsWith('.pdf')) continue;

            try {
                const file_path = path.join(seat_plan_dir, file);
                const file_buffer = readFileSync(file_path);
                // const result = await extractPdfTable(file_buffer);

                // for (const page of result.pageTables) {
                //     for (const table of page.tables) {
                //         const headers: string[] = table[0].map(cell => 
                //             cell.toLowerCase().replace(/[^a-z ]/g, '')
                //         );

                //         const is_valid_table = REQUIRED_COLUMNS.every(col => headers.includes(col.replace(/[^a-z ]/g, '')))
                //     }
                // }
                const data = await PdfParse(file_buffer);
                    // const output_file_path = join(seat_plan_dir, `${basename(file, '.pdf')}.txt`);
                    // writeFileSync(output_file_path, data.text, 'utf-8');
                    const text = data.text;
                    if (text.includes(student_id)) {
                        console.log(`Student ID: ${student_id} found in file: ${file}`);
                        const lines = text.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].includes(student_id)) {
                                const tokens = lines[i].trim().split(/\s+/);

                                if (tokens.length < 4) continue;

                                const sl = Number(tokens[0]);
                                const department = String(tokens[tokens.length - 1]);
                                const name = tokens.slice(2, tokens.length - 1).join(' ');

                                const next_tokens = lines[i + 1].trim().split(/\s+/);
                                const room = next_tokens[0];
                                const column = Number(next_tokens[1]);
                                console.log({ name, department, sl, room, column });
                                
                                return { name, department, sl, room, column };
                            }
                        }
                    }
            } catch (e) {
                console.error(`Error processing file: ${file}`, e);
            }
        }
    } catch (error) {
        console.error(`Error reading seat plan directory: `, error);
    }
    return null;
}