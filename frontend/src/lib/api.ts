import { getToken } from "@/lib/auth";

export async function api(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
    }
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    // We proxy through Next: call /api/... and let next.config.ts rewrite to the backend
    const url = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await fetch(url, { ...init, headers, cache: init.cache ?? "no-store" });
    return res;
}