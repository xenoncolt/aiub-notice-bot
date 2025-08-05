export interface FacultyProfile {
    CvPersonal: {
        Name: string;
        Email: string;
    };
    Faculty?: string;
    Designation?: string;
    Position?: string;
    HrDepartment?: string;
    PersonalOtherInfo: {
        RoomNo?: string;
        BuildingNo?: string;
        SecondProfilePhoto: string;
    }
}

export interface tempFP {
    "Room No": string;
    Email: string;
}