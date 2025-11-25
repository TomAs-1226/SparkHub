import type { CourseSession } from "./types";

export function formatDate(iso?: string | null, options?: Intl.DateTimeFormatOptions) {
    if (!iso) return "TBA";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "TBA";
    return date.toLocaleDateString(undefined, options ?? { month: "short", day: "numeric", year: "numeric" });
}

export function formatTimeRange(session: CourseSession) {
    if (!session.startsAt) return "TBA";
    const start = new Date(session.startsAt);
    if (Number.isNaN(start.getTime())) return "TBA";
    const end = session.endsAt ? new Date(session.endsAt) : null;
    const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    const startLabel = formatter.format(start);
    const endLabel = end && !Number.isNaN(end.getTime()) ? formatter.format(end) : null;
    return endLabel ? `${startLabel} – ${endLabel}` : startLabel;
}

export function groupSessionsByDay(sessions: CourseSession[]) {
    const buckets = new Map<string, CourseSession[]>();
    sessions.forEach((session) => {
        if (!session.startsAt) return;
        const date = new Date(session.startsAt);
        if (Number.isNaN(date.getTime())) return;
        const key = date.toISOString().split("T")[0];
        const bucket = buckets.get(key) || [];
        bucket.push(session);
        buckets.set(key, bucket);
    });
    return Array.from(buckets.entries())
        .map(([key, rows]) => ({
            key,
            label: formatDate(rows[0]?.startsAt, { weekday: "short", month: "short", day: "numeric" }),
            sessions: rows.sort((a, b) => {
                const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
                const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
                return aTime - bTime;
            }),
        }))
        .sort((a, b) => {
            const aTime = a.sessions[0]?.startsAt ? new Date(a.sessions[0].startsAt).getTime() : 0;
            const bTime = b.sessions[0]?.startsAt ? new Date(b.sessions[0].startsAt).getTime() : 0;
            return aTime - bTime;
        })
        .slice(0, 6);
}
