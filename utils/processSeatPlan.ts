import { readdir } from "fs/promises";
import { SeatPlan } from "../types/SeatPlan";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync } from "fs";
import PdfParse from "pdf-parse-new";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seat_plan_pdf_dir = join(__dirname, `../database/seatplanPDF`);


// PDF line format: "SL STUDENT_ID NAME DEPARTMENT ROOM_NO COLUMN_NO"
// Example: "1 26-63948-1 FARIHA FARBIN DIYA English 3120 2"
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

                for (let i = 0; i < lines.length; i++) {
                    const match = lines[i].match(id_pattern);
                    if (match) {
                        const words = lines[i].trim().split(/\s+/);

                        // Need at least: SL, ID, NAME(1+), DEPT, ROOM, COLUMN = minimum 6 words
                        if (words.length < 6) continue;

                        const sl = Number(words[0]) % 8;
                        const student_id = words[1];
                        // Last word is column, second last is room, third last is department
                        const column = Number(words[words.length - 1]);
                        const room = words[words.length - 2];
                        const department = words[words.length - 3];
                        // Name is everything between student_id and department
                        const name = words.slice(2, words.length - 3).join(' ');

                        // Validate parsed data
                        if (!student_id || !name || isNaN(column)) continue;

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
