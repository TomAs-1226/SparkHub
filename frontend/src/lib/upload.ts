import { getToken } from "@/lib/auth";

/** Max file size accepted by the backend (50 MB). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Upload a file to the backend via the Next.js /api/upload route handler.
 *
 * Uses XMLHttpRequest for reliable multipart uploads and progress events.
 * No explicit timeout is set — if the network goes away onerror fires;
 * if an iCloud/network file takes a long time to read, the upload just waits
 * rather than producing a misleading "timed out" message.
 *
 * @param file        The File to upload.
 * @param onProgress  Optional callback receiving 0–100 progress percentage.
 * @returns           Relative URL of the uploaded file, e.g. /uploads/foo.pdf
 */
export function uploadAsset(
    file: File,
    onProgress?: (percent: number) => void
): Promise<string> {
    // Validate size client-side before wasting bandwidth
    if (file.size > MAX_UPLOAD_BYTES) {
        return Promise.reject(
            new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`)
        );
    }

    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        // Progress tracking (covers the upload phase; server processing is not reported)
        if (onProgress) {
            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            });
        }

        xhr.onload = () => {
            let json: { ok?: boolean; path?: string; msg?: string } | null = null;
            try {
                json = JSON.parse(xhr.responseText);
            } catch {
                return reject(new Error("Upload failed — unexpected server response"));
            }
            if (xhr.status >= 200 && xhr.status < 300 && json?.ok && json?.path) {
                resolve(json.path as string);
            } else {
                reject(new Error(json?.msg || `Upload failed (HTTP ${xhr.status})`));
            }
        };

        // onerror covers: connection refused, CORS block, network drop
        xhr.onerror = () =>
            reject(new Error("Upload failed — check that the server is running."));

        // No xhr.timeout — avoids false "timed out" errors on large files,
        // iCloud-backed files that download on demand, or slow connections.
        // The browser will naturally error if the connection is lost.

        xhr.send(form);
    });
}
