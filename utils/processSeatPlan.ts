import { readdir } from "fs/promises";
import { SeatPlan } from "../types/SeatPlan";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync } from "fs";
import PdfParse from "pdf-parse-new";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seat_plan_pdf_dir = join(__dirname, `../database/seatplanPDF`);


// TODO: From student ID, return name, department, sl, room, column
export async function convertSeatPlanPDFsToJson(): Promise<void> {
    try {
        const files = await readdir(seat_plan_pdf_dir);

        const id_pattern = /\d{2}-\d{5}-\d/;

        const seat_plan: SeatPlan[] = [];
        
        for (const file of files) {
            try {
                if (!file.toLowerCase().endsWith('.pdf')) continue;

                const file_path = join(seat_plan_pdf_dir, file);
                const file_buffer = readFileSync(file_path);

                const data = await PdfParse(file_buffer);
                const text = data.text;
                const lines = text.split('\n');
                console.log("First 5 lines:", lines.slice(0, 5));
                for (let i = 0; i < lines.length; i++) {
                    const match = lines[i].match(id_pattern);
                    if (match) {
                        // Separate each word if there is a space in between 
                        const words = lines[i].trim().split(/\s+/);

                        if (words.length < 4) continue;

                        const sl = Number(words[0]) % 8;
                        const student_id = words[1];
                        const department = String(words[words.length - 1]);
                        const name = words.slice(2, words.length - 1).join(' ');

                        const next_line_words = lines[i + 1].trim().split(/\s+/);
                        const room = next_line_words[0];
                        const column = Number(next_line_words[1]);

                        const each_student_seat: SeatPlan = {
                            name,
                            id: student_id,
                            department,
                            sl,
                            room,
                            column
                        }

                        seat_plan.push(each_student_seat);
                    }
                }
            } catch (e) {
                console.error(`Error processing PDF file ${file}: ${e}`);
            }
        }
        const seat_plan_path = join(__dirname, `../database/seat-plan.json`);
        writeFileSync(seat_plan_path, JSON.stringify(seat_plan, null, 2));

        console.log(`Successfully saved ${seat_plan.length} student's seat plan to seat_plan.json`);
    } catch (e) {
        console.error(`Error reading seat plan directory: ${e}`);
    }
}
