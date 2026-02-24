import { getToken } from "@/lib/auth";

export async function uploadAsset(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    // Route through the Next.js /api/upload rewrite — same-origin, no CORS.
    // The rewrite is a stream passthrough so there is no body-size limit from Next.js.
    const res = await fetch("/api/upload", {
        method: "POST",
        headers,
        body: form,
        cache: "no-store",
    });
    const json = await safeJson(res);
    if (!res.ok || json?.ok !== true || !json?.path) {
        throw new Error(json?.msg || "Upload failed");
    }
    return json.path as string;
}

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}
