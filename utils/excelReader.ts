import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate to project root (works from both src and build directories)
const projectRoot = __dirname.includes('build') 
    ? path.join(__dirname, '../../database') 
    : path.join(__dirname, '../database');

export interface CourseSchedule {
    classId: string;
    courseTitle: string;
    section: string;
    type: 'Theory' | 'Lab';
    day: string;
    startTime: string;
    endTime: string;
    room: string;
    faculty: string;
    status: string;
}

export interface CourseOption {
    courseTitle: string;
    section: string;
    label: string; // For display in select menu
    value: string; // Unique identifier
}

let cachedData: CourseSchedule[] | null = null;

export function loadExcelData(): CourseSchedule[] {
    if (cachedData) return cachedData;

    const excelPath = path.join(projectRoot, 'Offered_Course_Report.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
    
    cachedData = rawData.map(row => ({
        classId: String(row['Class ID'] || ''),
        courseTitle: String(row['Course Title'] || ''),
        section: String(row['Section'] || ''),
        type: row['Type'] === 'Lab' ? 'Lab' : 'Theory',
        day: String(row['Day'] || ''),
        startTime: String(row['Start Time'] || ''),
        endTime: String(row['End Time'] || ''),
        room: String(row['Room'] || ''),
        faculty: String(row['Faculty'] || ''),
        status: String(row['Status'] || '')
    }));

    return cachedData;
}

export function getUniqueCourses(): CourseOption[] {
    const data = loadExcelData();
    const seen = new Set<string>();
    const courses: CourseOption[] = [];

    for (const row of data) {
        // Skip cancelled courses
        if (row.status === 'Cancel') continue;
        
        const key = `${row.courseTitle}||${row.section}`;
        if (!seen.has(key)) {
            seen.add(key);
            
            // Create label (truncate if too long for Discord's 100 char limit)
            let label = `${row.courseTitle} [${row.section}]`;
            if (label.length > 100) {
                label = label.slice(0, 97) + '...';
            }
            
            courses.push({
                courseTitle: row.courseTitle,
                section: row.section,
                label,
                value: key
            });
        }
    }

    // Sort alphabetically
    courses.sort((a, b) => a.label.localeCompare(b.label));
    
    return courses;
}

// Get unique course names for autocomplete
export function getUniqueCourseNames(): string[] {
    const data = loadExcelData();
    const seen = new Set<string>();
    
    for (const row of data) {
        if (row.status !== 'Cancel' && row.courseTitle) {
            seen.add(row.courseTitle);
        }
    }
    
    return Array.from(seen).sort();
}

// Get sections for a specific course name
export function getSectionsForCourse(courseName: string): string[] {
    const data = loadExcelData();
    const sections = new Set<string>();
    const lowerCourseName = courseName.toLowerCase();
    
    for (const row of data) {
        if (row.status !== 'Cancel' && 
            row.courseTitle.toLowerCase() === lowerCourseName && 
            row.section) {
            sections.add(row.section);
        }
    }
    
    return Array.from(sections).sort();
}

// Search course names for autocomplete
export function searchCourseNames(query: string): { name: string; value: string }[] {
    const courseNames = getUniqueCourseNames();
    const lowerQuery = query.toLowerCase();
    
    return courseNames
        .filter(name => name.toLowerCase().includes(lowerQuery))
        .slice(0, 25)
        .map(name => ({ name, value: name }));
}

// Search sections for a course for autocomplete
export function searchSections(courseName: string, query: string): { name: string; value: string }[] {
    const sections = getSectionsForCourse(courseName);
    const lowerQuery = query.toLowerCase();
    
    return sections
        .filter(section => section.toLowerCase().includes(lowerQuery))
        .slice(0, 25)
        .map(section => ({ name: section, value: section }));
}

export function searchCourses(query: string): CourseOption[] {
    const allCourses = getUniqueCourses();
    const lowerQuery = query.toLowerCase();
    
    return allCourses
        .filter(c => c.label.toLowerCase().includes(lowerQuery))
        .slice(0, 25); // Discord limit
}

export function getCourseSchedule(courseTitle: string, section: string): CourseSchedule[] {
    const data = loadExcelData();
    
    return data.filter(row => 
        row.courseTitle === courseTitle && 
        row.section === section
    );
}

export function getScheduleByValues(values: string[]): CourseSchedule[] {
    const schedules: CourseSchedule[] = [];
    
    for (const value of values) {
        const [courseTitle, section] = value.split('||');
        const courseSchedules = getCourseSchedule(courseTitle, section);
        schedules.push(...courseSchedules);
    }
    
    return schedules;
}

// Find course by name and section (case insensitive)
export function findCourse(courseName: string, section: string): CourseOption | null {
    const allCourses = getUniqueCourses();
    const lowerName = courseName.toLowerCase();
    const lowerSection = section.toLowerCase();
    
    return allCourses.find(c => 
        c.courseTitle.toLowerCase() === lowerName && 
        c.section.toLowerCase() === lowerSection
    ) || null;
}

export function clearCache(): void {
    cachedData = null;
}
