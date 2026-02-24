import { NextRequest, NextResponse } from "next/server";

const BACKEND = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
).replace(/\/$/, "");

/**
 * POST /api/upload
 *
 * Proxies multipart file uploads to the backend without parsing the body.
 *
 * Key difference from the formData() approach:
 *   req.formData() re-parses the multipart structure inside Next.js, which
 *   stalls on large or iCloud-backed files in Turbopack dev mode.
 *
 * Instead we read the raw bytes with arrayBuffer() and forward them with
 * the original Content-Type header (which already contains the multipart
 * boundary). multer on the backend receives exactly what the browser sent.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = req.headers.get("authorization") ?? "";
        // MUST forward Content-Type — it contains the multipart boundary string
        // that multer needs to split the body into fields/files.
        const contentType = req.headers.get("content-type") ?? "";

        const headers: Record<string, string> = {};
        if (auth) headers["authorization"] = auth;
        if (contentType) headers["content-type"] = contentType;

        // Read raw bytes — no multipart parsing in Next.js, no stall risk.
        const body = await req.arrayBuffer();

        const upstream = await fetch(`${BACKEND}/upload`, {
            method: "POST",
            headers,
            body,
        });

        const json = await upstream.json().catch(() => ({
            ok: false,
            msg: "Upload failed — could not parse backend response",
        }));

        return NextResponse.json(json, { status: upstream.status });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload error";
        return NextResponse.json({ ok: false, msg }, { status: 500 });
    }
}
