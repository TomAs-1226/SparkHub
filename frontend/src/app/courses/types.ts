export interface CourseSession {
    id: string;
    startsAt: string;
    endsAt?: string | null;
    location?: string | null;
    mode?: string | null;
    note?: string | null;
}

export interface LiveCourse {
    id: string;
    title: string;
    summary?: string | null;
    coverUrl?: string | null;
    upcomingSessions?: CourseSession[];
}

export interface CourseLesson {
    id: string;
    title: string;
    type: string;
    body?: string | null;
    videoUrl?: string | null;
}

export interface CourseMaterial {
    id: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    attachmentUrl?: string | null;
    contentUrl?: string | null;
    contentType?: string | null;
    locked: boolean;
    visibility: string;
    createdAt: string;
    uploader?: { id: string; name?: string | null; avatarUrl?: string | null } | null;
}

export interface AssignmentSubmission {
    id: string;
    status: string;
    grade?: string | null;
    feedback?: string | null;
    attachmentUrl?: string | null;
    content?: string | null;
    submittedAt?: string | null;
}

export interface CourseAssignment {
    id: string;
    title: string;
    description?: string | null;
    dueAt?: string | null;
    resources?: string[];
    attachments?: string[];
    stats?: { submissions: number };
    submissions?: AssignmentSubmission[];
    viewerSubmission?: AssignmentSubmission;
}

export interface EnrollQuestion {
    id: string;
    label: string;
    placeholder?: string;
    type?: string;
}

export interface CourseDetail extends LiveCourse {
    lessons: CourseLesson[];
    sessions: CourseSession[];
    materials: CourseMaterial[];
    assignments: CourseAssignment[];
    enrollQuestions: EnrollQuestion[];
    joinCode?: string;
    calendarDownloadUrl?: string | null;
}

export interface ViewerState {
    canManage: boolean;
    isEnrolled: boolean;
    enrollmentStatus?: string | null;
    formAnswers?: Record<string, string> | null;
    calendarUnlocked?: boolean;
}

export interface EnrollmentRecord {
    id: string;
    status: string;
    joinedViaCode: boolean;
    createdAt: string;
    adminNote?: string | null;
    formAnswers: Record<string, string>;
    user?: { id: string; name?: string | null; email?: string | null; role?: string | null; avatarUrl?: string | null } | null;
}

export interface EnrollmentListItem {
    id: string;
    courseId: string;
    status: string;
    createdAt: string;
    course?: LiveCourse;
}
