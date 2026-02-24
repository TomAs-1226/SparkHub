import { getToken } from "@/lib/auth";

/**
 * Upload a file to the backend via the Next.js /api/upload route handler.
 *
 * Uses XMLHttpRequest instead of fetch so we get reliable upload progress
 * events and avoid the streaming/duplex issues that fetch has with multipart
 * bodies in Turbopack dev mode.
 *
 * @param file     The File to upload.
 * @param onProgress  Optional callback receiving 0–100 progress percentage.
 * @returns        The relative URL of the uploaded file, e.g. /uploads/foo.pdf
 */
export function uploadAsset(
    file: File,
    onProgress?: (percent: number) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        // Progress tracking (upload phase only — server processing not included)
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

        xhr.onerror = () => reject(new Error("Network error — upload failed. Is the server running?"));
        xhr.ontimeout = () => reject(new Error("Upload timed out — try a smaller file or check your connection."));
        xhr.timeout = 180_000; // 3-minute timeout for large files

        xhr.send(form);
    });
}
