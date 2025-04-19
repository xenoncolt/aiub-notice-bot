import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { readdir } from 'fs/promises';
import { dirname, join } from 'path';
import { Command } from '../types/Command';
import { fileURLToPath } from 'url';
import PdfParse, {  } from "pdf-parse-new";
import { SeatPlan } from "../types/SeatPlan";
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seat_plan_dir = join(__dirname, '../database/seatplanPDF');
const seat_plan_path = join(__dirname, '../database/seat-plan.json');


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
            autocomplete: true,
        },
    ],

    async execute(interaction: ChatInputCommandInteraction) {
        const student_id = interaction.options.getString('student-id');

        if (!student_id) return;

        try {

            const seat_plan: SeatPlan[] = JSON.parse(readFileSync(seat_plan_path, 'utf-8'));

            // await processPDFs(student_id);
            // await interaction.reply({ content: 'Success', ephemeral: true});
            // const student_details = await processPDFs(student_id);
            const student_details: SeatPlan | undefined = seat_plan.find(student => student.id === student_id);

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
                            name: '🚪 Room No.',
                            value: student_details.room.toString(),
                            inline: false
                        },
                        {
                            name: '📋 Column No.',
                            value: student_details.column.toString(),
                            inline: true
                        },
                        {
                            name: '🔢 Serial No.',
                            value: student_details.sl.toString(),
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

    async autocomplete(interaction: AutocompleteInteraction) {
        const focused_value = interaction.options.getFocused();

        const seat_plan: SeatPlan[] = JSON.parse(readFileSync(seat_plan_path, 'utf-8'));

        const student: SeatPlan[] = seat_plan.filter(student => student.id.startsWith(focused_value));
        await interaction.respond(
            student.slice(0, 25).map( student => ({
                name: student.id,
                value: student.id,
            }))
        );
    },
} as Command;

// async function processPDFs(student_id: string): Promise<SeatPlan | null> {
//     try {
//         const files = await readdir(seat_plan_dir);
//         // const normalized_student_id = student_id.replace(/-/g, '').toLowerCase();

//         for (const file of files) {
//             if (!file.toLowerCase().endsWith('.pdf')) continue;

//             try {
//                 const file_path = path.join(seat_plan_dir, file);
//                 const file_buffer = readFileSync(file_path);
//                 // const result = await extractPdfTable(file_buffer);

//                 // for (const page of result.pageTables) {
//                 //     for (const table of page.tables) {
//                 //         const headers: string[] = table[0].map(cell => 
//                 //             cell.toLowerCase().replace(/[^a-z ]/g, '')
//                 //         );

//                 //         const is_valid_table = REQUIRED_COLUMNS.every(col => headers.includes(col.replace(/[^a-z ]/g, '')))
//                 //     }
//                 // }
//                 const data = await PdfParse(file_buffer);
//                     // const output_file_path = join(seat_plan_dir, `${basename(file, '.pdf')}.txt`);
//                     // writeFileSync(output_file_path, data.text, 'utf-8');
//                     const text = data.text;
//                     if (text.includes(student_id)) {
//                         // console.log(`Student ID: ${student_id} found in file: ${file}`);
//                         const lines = text.split('\n');
//                         for (let i = 0; i < lines.length; i++) {
//                             if (lines[i].includes(student_id)) {
//                                 const tokens = lines[i].trim().split(/\s+/);

//                                 if (tokens.length < 4) continue;

//                                 const sl = Number(tokens[0]) % 8;
//                                 const department = String(tokens[tokens.length - 1]);
//                                 const name = tokens.slice(2, tokens.length - 1).join(' ');

//                                 const next_tokens = lines[i + 1].trim().split(/\s+/);
//                                 const room = next_tokens[0];
//                                 const column = Number(next_tokens[1]);
//                                 // console.log({ name, department, sl, room, column });
                                
//                                 return { name, department, sl, room, column };
//                             }
//                         }
//                     }
//             } catch (e) {
//                 console.error(`Error processing file: ${file}`, e);
//             }
//         }
//     } catch (error) {
//         console.error(`Error reading seat plan directory: `, error);
//     }
//     return null;
// }