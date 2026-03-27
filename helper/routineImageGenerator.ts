import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { CourseSchedule } from '../utils/excelReader.js';

// Color palette for different courses
const COURSE_COLORS = [
    { bg: '#4A90D9', text: '#FFFFFF' }, // Blue
    { bg: '#50C878', text: '#FFFFFF' }, // Green
    { bg: '#FF6B6B', text: '#FFFFFF' }, // Red
    { bg: '#9B59B6', text: '#FFFFFF' }, // Purple
    { bg: '#F39C12', text: '#FFFFFF' }, // Orange
    { bg: '#1ABC9C', text: '#FFFFFF' }, // Teal
    { bg: '#E91E63', text: '#FFFFFF' }, // Pink
    { bg: '#00BCD4', text: '#FFFFFF' }, // Cyan
    { bg: '#8BC34A', text: '#FFFFFF' }, // Light Green
    { bg: '#FF5722', text: '#FFFFFF' }, // Deep Orange
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

interface TimeSlot {
    start: number; // Minutes from midnight
    end: number;
    course: CourseSchedule;
    colorIndex: number;
}

function timeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

export async function generateRoutineImage(schedules: CourseSchedule[]): Promise<Buffer> {
    // Assign colors to each unique course
    const courseColors = new Map<string, number>();
    let colorIndex = 0;
    for (const schedule of schedules) {
        const key = `${schedule.courseTitle}||${schedule.section}`;
        if (!courseColors.has(key)) {
            courseColors.set(key, colorIndex % COURSE_COLORS.length);
            colorIndex++;
        }
    }

    // Organize schedules by day
    const daySchedules = new Map<string, TimeSlot[]>();
    for (const day of DAYS) {
        daySchedules.set(day, []);
    }

    for (const schedule of schedules) {
        const daySlots = daySchedules.get(schedule.day);
        if (daySlots) {
            const key = `${schedule.courseTitle}||${schedule.section}`;
            daySlots.push({
                start: timeToMinutes(schedule.startTime),
                end: timeToMinutes(schedule.endTime),
                course: schedule,
                colorIndex: courseColors.get(key) || 0
            });
        }
    }

    // Sort each day's slots by start time
    for (const slots of daySchedules.values()) {
        slots.sort((a, b) => a.start - b.start);
    }

    // Find time range
    let minTime = 24 * 60;
    let maxTime = 0;
    for (const slots of daySchedules.values()) {
        for (const slot of slots) {
            minTime = Math.min(minTime, slot.start);
            maxTime = Math.max(maxTime, slot.end);
        }
    }

    // Add padding
    minTime = Math.floor(minTime / 60) * 60; // Round down to hour
    maxTime = Math.ceil(maxTime / 60) * 60;  // Round up to hour

    // Canvas dimensions
    const padding = 20;
    const headerHeight = 60;
    const dayHeaderHeight = 40;
    const timeColumnWidth = 90;
    const dayColumnWidth = 200;
    const hourHeight = 80; // Increased for better visibility
    const footerHeight = 40; // Added footer space
    
    const totalHours = (maxTime - minTime) / 60;
    const canvasWidth = padding * 2 + timeColumnWidth + (dayColumnWidth * DAYS.length);
    const canvasHeight = padding * 2 + headerHeight + dayHeaderHeight + (hourHeight * totalHours) + footerHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Header
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvasWidth, headerHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📅 Weekly Class Routine', canvasWidth / 2, 40);

    // Day headers
    const gridStartY = headerHeight + dayHeaderHeight;
    const gridStartX = padding + timeColumnWidth;

    ctx.fillStyle = '#0f3460';
    ctx.fillRect(gridStartX, headerHeight, dayColumnWidth * DAYS.length, dayHeaderHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    for (let i = 0; i < DAYS.length; i++) {
        const x = gridStartX + (i * dayColumnWidth) + (dayColumnWidth / 2);
        ctx.fillText(DAY_SHORT[i], x, headerHeight + 26);
    }

    // Time column and grid lines
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= totalHours; i++) {
        const y = gridStartY + (i * hourHeight);
        const time = minutesToTime(minTime + i * 60);
        
        // Time label
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(time, padding + timeColumnWidth - 10, y + 15);
        
        // Grid line
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gridStartX, y);
        ctx.lineTo(canvasWidth - padding, y);
        ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= DAYS.length; i++) {
        const x = gridStartX + (i * dayColumnWidth);
        ctx.strokeStyle = '#333355';
        ctx.beginPath();
        ctx.moveTo(x, gridStartY);
        ctx.lineTo(x, canvasHeight - padding);
        ctx.stroke();
    }

    // Draw course blocks
    for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex++) {
        const day = DAYS[dayIndex];
        const slots = daySchedules.get(day) || [];
        
        for (const slot of slots) {
            const x = gridStartX + (dayIndex * dayColumnWidth) + 4;
            const startY = gridStartY + ((slot.start - minTime) / 60) * hourHeight;
            const height = ((slot.end - slot.start) / 60) * hourHeight;
            const width = dayColumnWidth - 8;

            // Course block background
            const color = COURSE_COLORS[slot.colorIndex];
            ctx.fillStyle = color.bg;
            roundRect(ctx, x, startY + 2, width, height - 4, 6);
            ctx.fill();

            // Course text
            ctx.fillStyle = color.text;
            ctx.textAlign = 'center';
            
            // Use full course name and wrap it properly
            const courseName = slot.course.courseTitle;
            
            ctx.font = 'bold 12px Arial';
            const textX = x + width / 2;
            let textY = startY + 18;
            
            // Smart word wrapping for course name
            const words = courseName.split(' ');
            let line = '';
            const lines: string[] = [];
            const maxWidth = width - 14;
            
            for (const word of words) {
                const testLine = line + (line ? ' ' : '') + word;
                if (ctx.measureText(testLine).width > maxWidth && line) {
                    lines.push(line);
                    line = word;
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            // Calculate content height
            const lineHeight = 14;
            const infoHeight = 38; // Time + Room (increased)
            const labBadgeHeight = slot.course.type === 'Lab' ? 16 : 0;
            const totalTextHeight = (lines.length * lineHeight) + infoHeight + labBadgeHeight + 10;
            const availableHeight = height - 4;
            
            if (totalTextHeight <= availableHeight) {
                // Full view - show all lines
                for (const textLine of lines) {
                    ctx.fillText(textLine, textX, textY);
                    textY += lineHeight;
                }
                
                // Time - BIGGER font
                ctx.font = 'bold 12px Arial';
                textY += 6;
                ctx.fillText(`${slot.course.startTime} - ${slot.course.endTime}`, textX, textY);
                
                // Room - BIGGER font
                textY += 16;
                ctx.font = 'bold 12px Arial';
                ctx.fillText(`📍 ${slot.course.room}`, textX, textY);
                
                // Type badge for Lab
                if (slot.course.type === 'Lab') {
                    textY += 14;
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    roundRect(ctx, textX - 18, textY - 10, 36, 14, 3);
                    ctx.fill();
                    ctx.fillStyle = color.text;
                    ctx.font = 'bold 10px Arial';
                    ctx.fillText('LAB', textX, textY);
                }
            } else {
                // Compact view - show as many lines as fit, then time and room
                const maxLines = Math.max(1, Math.floor((availableHeight - infoHeight - 12) / lineHeight));
                const displayLines = lines.slice(0, maxLines);
                
                // If we had to cut lines, add "..." to the last line
                if (lines.length > maxLines && displayLines.length > 0) {
                    const lastIdx = displayLines.length - 1;
                    let lastLine = displayLines[lastIdx];
                    while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 3) {
                        lastLine = lastLine.slice(0, -1);
                    }
                    displayLines[lastIdx] = lastLine + '...';
                }
                
                ctx.font = 'bold 11px Arial';
                for (const textLine of displayLines) {
                    ctx.fillText(textLine, textX, textY);
                    textY += lineHeight;
                }
                
                // Always show time and room - BIGGER
                ctx.font = 'bold 11px Arial';
                textY += 4;
                ctx.fillText(`${slot.course.startTime} - ${slot.course.endTime}`, textX, textY);
                textY += 14;
                ctx.fillText(slot.course.room, textX, textY);
            }
        }
    }

    // Legend at bottom - positioned with proper footer space
    const legendY = canvasHeight - 15;
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Generated by AIUB Notice Bot', padding, legendY);

    return canvas.toBuffer('image/png');
}

// Generate a blank routine image when no courses are added
export async function generateBlankRoutineImage(): Promise<Buffer> {
    const padding = 20;
    const headerHeight = 60;
    const dayHeaderHeight = 40;
    const timeColumnWidth = 90;
    const dayColumnWidth = 200;
    const hourHeight = 80;
    const footerHeight = 40;
    
    // Default time range: 8 AM to 6 PM (600 minutes)
    const minTime = 8 * 60;  // 8:00 AM
    const maxTime = 18 * 60; // 6:00 PM
    const totalHours = (maxTime - minTime) / 60;
    
    const canvasWidth = padding * 2 + timeColumnWidth + (dayColumnWidth * DAYS.length);
    const canvasHeight = padding * 2 + headerHeight + dayHeaderHeight + (hourHeight * totalHours) + footerHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Header
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvasWidth, headerHeight);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📅 Weekly Class Routine', canvasWidth / 2, 40);

    // Day headers
    const gridStartY = headerHeight + dayHeaderHeight;
    const gridStartX = padding + timeColumnWidth;

    ctx.fillStyle = '#1f4068';
    ctx.fillRect(gridStartX, headerHeight, canvasWidth - gridStartX - padding, dayHeaderHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    DAYS.forEach((day, i) => {
        const x = gridStartX + (i * dayColumnWidth) + (dayColumnWidth / 2);
        ctx.fillText(day, x, headerHeight + 26);
    });

    // Time labels and grid lines
    for (let minutes = minTime; minutes <= maxTime; minutes += 60) {
        const y = gridStartY + ((minutes - minTime) / 60) * hourHeight;
        
        // Time label
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(minutesToTime(minutes), padding + timeColumnWidth - 10, y + 5);
        
        // Grid line
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gridStartX, y);
        ctx.lineTo(canvasWidth - padding, y);
        ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= DAYS.length; i++) {
        const x = gridStartX + (i * dayColumnWidth);
        ctx.strokeStyle = '#333355';
        ctx.beginPath();
        ctx.moveTo(x, gridStartY);
        ctx.lineTo(x, canvasHeight - padding - footerHeight);
        ctx.stroke();
    }

    // "No courses" message in center
    ctx.fillStyle = '#666688';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    const centerY = gridStartY + (totalHours * hourHeight) / 2;
    ctx.fillText('No courses added yet', canvasWidth / 2, centerY);
    ctx.font = '14px Arial';
    ctx.fillText('Use /routine-add to add courses', canvasWidth / 2, centerY + 25);

    // Legend at bottom
    const legendY = canvasHeight - 15;
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Generated by AIUB Notice Bot', padding, legendY);

    return canvas.toBuffer('image/png');
}

function roundRect(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
