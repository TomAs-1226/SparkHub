"use client";

import { useState, useCallback, useEffect } from "react";
import {
    Maximize2,
    Minimize2,
    ExternalLink,
    Download,
    FileText,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertTriangle,
} from "lucide-react";

// ─── File type detection ──────────────────────────────────────────────────────
function detectContentType(url: string, mimeHint?: string | null): "pdf" | "pptx" | "image" | "video" | "audio" | "unknown" {
    if (mimeHint) {
        if (mimeHint.startsWith("image/")) return "image";
        if (mimeHint.startsWith("video/")) return "video";
        if (mimeHint.startsWith("audio/")) return "audio";
        if (mimeHint === "application/pdf") return "pdf";
        if (
            mimeHint.includes("presentationml") ||
            mimeHint.includes("powerpoint") ||
            mimeHint.includes("ms-pps")
        )
            return "pptx";
    }
    const lower = (url || "").toLowerCase().split("?")[0];
    if (lower.endsWith(".pdf")) return "pdf";
    if (lower.match(/\.(pptx?|ppsx?|pps)$/)) return "pptx";
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)$/)) return "image";
    if (lower.match(/\.(mp4|webm|mov|mkv|avi|ogv)$/)) return "video";
    if (lower.match(/\.(mp3|ogg|wav|flac|aac|m4a)$/)) return "audio";
    return "unknown";
}

// Resolve a potentially relative URL to absolute so external viewers can fetch it
function resolveAbsoluteUrl(url: string): string {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window !== "undefined") {
        return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return url;
}

function isLocalhostUrl(url: string): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);
}

// Build Google Docs viewer URL — works for PDF, PPTX, DOCX, etc. (requires public URL)
function googleDocsViewerUrl(fileUrl: string): string {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}

// Build Office Online viewer URL — requires public URL
function officeOnlineUrl(fileUrl: string): string {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SlideViewerProps {
    /** URL to the file/presentation */
    url: string;
    /** Optional MIME type hint */
    contentType?: string | null;
    /** Display title */
    title?: string;
    /** Height of the embedded viewer (default 520px) */
    height?: number;
    /** Allow fullscreen toggle */
    allowFullscreen?: boolean;
    /** Show download button */
    allowDownload?: boolean;
    /** Whether the file is a slide deck specifically */
    isDeck?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SlideViewer({
    url,
    contentType,
    title,
    height = 520,
    allowFullscreen = true,
    allowDownload = true,
    isDeck = false,
}: SlideViewerProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const type = detectContentType(url, contentType);

    const handleLoad = useCallback(() => {
        setLoading(false);
        setError(false);
    }, []);

    const handleError = useCallback(() => {
        setLoading(false);
        setError(true);
    }, []);

    // Close fullscreen on Escape
    useEffect(() => {
        if (!isFullscreen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsFullscreen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isFullscreen]);

    // Reset loading state when URL changes
    useEffect(() => {
        setLoading(true);
        setError(false);
    }, [url]);

    // ── Render helpers ─────────────────────────────────────────────────────────
    const renderViewer = (viewHeight: number) => {
        if (type === "image") {
            return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={url}
                    alt={title || "Image"}
                    className="w-full object-contain"
                    style={{ maxHeight: viewHeight }}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            );
        }

        if (type === "video") {
            return (
                <video
                    src={url}
                    controls
                    className="w-full rounded-xl bg-black"
                    style={{ maxHeight: viewHeight }}
                    onLoadedData={handleLoad}
                    onError={handleError}
                >
                    Your browser does not support HTML5 video.
                </video>
            );
        }

        if (type === "audio") {
            return (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                    <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600" />
                    <audio
                        src={url}
                        controls
                        className="w-full max-w-md"
                        onLoadedData={handleLoad}
                        onError={handleError}
                    />
                </div>
            );
        }

        // PDF: use native iframe — browsers render PDFs natively; no external service needed
        if (type === "pdf") {
            const absolutePdfUrl = resolveAbsoluteUrl(url);
            return (
                <iframe
                    src={absolutePdfUrl}
                    title={title || "PDF Viewer"}
                    className="w-full rounded-xl border-0"
                    style={{ height: viewHeight }}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            );
        }

        // PPTX / Office presentations
        if (type === "pptx" || isDeck) {
            const absoluteUrl = resolveAbsoluteUrl(url);
            const isLocal = isLocalhostUrl(absoluteUrl);

            if (isLocal || error) {
                // External viewers can't reach localhost — show download fallback
                return (
                    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center px-4">
                        <FileText className="h-14 w-14 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                            Slide preview requires a publicly accessible URL.
                            Download to open in PowerPoint, Keynote, or Google Slides.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <a
                                href={absoluteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D8F80] transition-colors"
                            >
                                <Download className="h-4 w-4" /> Download file
                            </a>
                            <a
                                href={googleDocsViewerUrl(absoluteUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" /> Open in Google Docs
                            </a>
                        </div>
                    </div>
                );
            }

            // Try Office Online first (best quality), fall back to Google Docs viewer
            const viewerUrl = officeOnlineUrl(absoluteUrl);
            return (
                <iframe
                    src={viewerUrl}
                    title={title || "Presentation Viewer"}
                    className="w-full rounded-xl border-0"
                    style={{ height: viewHeight }}
                    onLoad={handleLoad}
                    onError={handleError}
                    allow="fullscreen"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                />
            );
        }

        // Unknown type: offer download
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
                <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    This file type cannot be previewed in-browser.
                </p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D8F80] transition-colors"
                >
                    <Download className="h-4 w-4" /> Download file
                </a>
            </div>
        );
    };

    const viewerContent = (viewHeight: number) => (
        <div className="relative w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
            {/* Loading overlay */}
            {loading && (type === "pdf" || type === "pptx" || isDeck) && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 z-10"
                    style={{ height: viewHeight }}
                >
                    <Loader2 className="h-8 w-8 animate-spin text-[#63C0B9]" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Loading presentation…</span>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800 z-10"
                    style={{ height: viewHeight }}
                >
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 text-center px-4">
                        Unable to load the file preview.
                    </p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
                    >
                        <ExternalLink className="h-3.5 w-3.5" /> Open externally
                    </a>
                </div>
            )}

            {renderViewer(viewHeight)}
        </div>
    );

    // ── Fullscreen modal ───────────────────────────────────────────────────────
    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[200] flex flex-col bg-black/95">
                {/* Topbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-700">
                    {title && (
                        <span className="text-sm font-medium text-white truncate max-w-md">{title}</span>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        {allowDownload && (
                            <a
                                href={url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                            >
                                <Download className="h-3.5 w-3.5" /> Download
                            </a>
                        )}
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                        >
                            <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-medium text-white"
                        >
                            <Minimize2 className="h-3.5 w-3.5" /> Exit fullscreen
                        </button>
                    </div>
                </div>
                {/* Viewer */}
                <div className="flex-1 overflow-auto p-4">
                    {viewerContent(window.innerHeight - 100)}
                </div>
            </div>
        );
    }

    // ── Normal view ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-2">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2">
                {title && (
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{title}</span>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                    {allowDownload && (
                        <a
                            href={url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                            <Download className="h-3 w-3" /> Download
                        </a>
                    )}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        <ExternalLink className="h-3 w-3" /> Open
                    </a>
                    {allowFullscreen && (
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                            <Maximize2 className="h-3 w-3" /> Fullscreen
                        </button>
                    )}
                </div>
            </div>

            {viewerContent(height)}
        </div>
    );
}
