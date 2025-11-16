import { api } from "@/lib/api";
import type { CourseDetail, ViewerState, EnrollmentRecord } from "./types";

export async function fetchCourseWorkspace(courseId: string) {
    const res = await api(`/courses/${courseId}`, { method: "GET" });
    const json = await res.json();
    if (!res.ok || json?.ok === false) {
        throw new Error(json?.msg || "Unable to load course");
    }
    return {
        detail: json.course as CourseDetail,
        viewer: json.viewer as ViewerState,
        enrollments: Array.isArray(json?.enrollments) ? (json.enrollments as EnrollmentRecord[]) : [],
    };
}
