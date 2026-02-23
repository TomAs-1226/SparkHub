import { getToken } from "@/lib/auth";

const BACKEND_URL = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
).replace(/\/$/, "");

export async function uploadAsset(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    // Post directly to the backend — bypasses all Next.js body-size limits
    const res = await fetch(`${BACKEND_URL}/upload`, {
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
