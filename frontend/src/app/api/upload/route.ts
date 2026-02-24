import { NextRequest, NextResponse } from "next/server";

const BACKEND = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
).replace(/\/$/, "");

/**
 * POST /api/upload
 * Proxies multipart file uploads to the backend.
 * Using an explicit route handler (not a rewrite) so Next.js/Turbopack never
 * tries to parse or buffer the body — it reads the formData and forwards it.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = req.headers.get("authorization") ?? "";

        // Parse the incoming multipart form data
        const formData = await req.formData();

        // Forward to backend — do NOT set Content-Type; fetch sets it automatically
        // with the correct multipart boundary from the FormData object.
        const headers: Record<string, string> = {};
        if (auth) headers["authorization"] = auth;

        const upstream = await fetch(`${BACKEND}/upload`, {
            method: "POST",
            headers,
            body: formData,
        });

        const json = await upstream.json().catch(() => ({
            ok: false,
            msg: "Upload failed — could not parse response",
        }));

        return NextResponse.json(json, { status: upstream.status });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload error";
        return NextResponse.json({ ok: false, msg }, { status: 500 });
    }
}
