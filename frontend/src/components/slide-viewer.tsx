"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Maximize2,
    Minimize2,
    ExternalLink,
    Download,
    FileText,
    Loader2,
    AlertTriangle,
    RefreshCw,
    Presentation,
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

function googleDocsViewerUrl(fileUrl: string): string {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}

function officeOnlineUrl(fileUrl: string): string {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function getFileName(url: string): string {
    return url.split("/").pop()?.split("?")[0] || "file";
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SlideViewerProps {
    url: string;
    contentType?: string | null;
    title?: string;
    height?: number;
    allowFullscreen?: boolean;
    allowDownload?: boolean;
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
    const [viewerError, setViewerError] = useState(false);
    // When Office Online fails, try Google Docs as fallback
    const [useGoogleFallback, setUseGoogleFallback] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const type = detectContentType(url, contentType);
    const absoluteUrl = resolveAbsoluteUrl(url);
    const isLocal = isLocalhostUrl(absoluteUrl);

    const handleLoad = useCallback(() => {
        setLoading(false);
        setViewerError(false);
    }, []);

    const handleError = useCallback(() => {
        setLoading(false);
        if ((type === "pptx" || isDeck) && !useGoogleFallback && !isLocal) {
            // Office Online failed — try Google Docs viewer automatically
            setUseGoogleFallback(true);
            setLoading(true);
        } else {
            setViewerError(true);
        }
    }, [type, isDeck, useGoogleFallback, isLocal]);

    // Close fullscreen on Escape
    useEffect(() => {
        if (!isFullscreen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsFullscreen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isFullscreen]);

    // Reset state when URL changes
    useEffect(() => {
        setLoading(true);
        setViewerError(false);
        setUseGoogleFallback(false);
    }, [url]);

    // For localhost PPTX or download-only fallback: clear loading immediately
    // because no iframe will be rendered so onLoad never fires
    useEffect(() => {
        if ((type === "pptx" || isDeck) && isLocal) {
            setLoading(false);
        }
    }, [type, isDeck, isLocal]);

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

        // PDF: native browser rendering — works with any URL including localhost
        if (type === "pdf") {
            return (
                <iframe
                    ref={iframeRef}
                    src={absoluteUrl}
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
            // External viewers can't reach localhost — show a clear local-dev fallback
            if (isLocal) {
                return (
                    <div className="flex flex-col items-center justify-center gap-5 py-14 text-center px-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#63C0B9]/10 dark:bg-[#63C0B9]/20">
                            <Presentation className="h-8 w-8 text-[#63C0B9]" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200 text-[15px]">
                                {getFileName(url)}
                            </p>
                            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 max-w-xs">
                                Slide preview is available once deployed to a public URL.
                                Download to open in PowerPoint, Keynote, or Google Slides.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2.5 justify-center">
                            <a
                                href={absoluteUrl}
                                download
                                className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#2D8F80] transition-colors"
                            >
                                <Download className="h-4 w-4" /> Download file
                            </a>
                            <a
                                href={absoluteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" /> Open in browser
                            </a>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Dev environment · Office Online and Google Docs cannot access localhost URLs
                        </p>
                    </div>
                );
            }

            // Error state (both viewers failed) — show download fallback
            if (viewerError) {
                return (
                    <div className="flex flex-col items-center justify-center gap-5 py-14 text-center px-6">
                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                        <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                                Unable to display preview
                            </p>
                            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 max-w-xs">
                                Both Office Online and Google Docs failed to load this file.
                                Download to open locally.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2.5 justify-center">
                            <a
                                href={absoluteUrl}
                                download
                                className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#2D8F80] transition-colors"
                            >
                                <Download className="h-4 w-4" /> Download file
                            </a>
                            <button
                                onClick={() => {
                                    setViewerError(false);
                                    setUseGoogleFallback(false);
                                    setLoading(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <RefreshCw className="h-4 w-4" /> Retry
                            </button>
                        </div>
                    </div>
                );
            }

            // Use Office Online first; if that fails handleError switches to Google Docs fallback
            const viewerUrl = useGoogleFallback
                ? googleDocsViewerUrl(absoluteUrl)
                : officeOnlineUrl(absoluteUrl);

            return (
                <iframe
                    ref={iframeRef}
                    key={viewerUrl} // force remount when switching viewer
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
                    href={absoluteUrl}
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
            {/* Loading overlay — only shown while an iframe is actually loading */}
            {loading && !viewerError && (type === "pdf" || ((type === "pptx" || isDeck) && !isLocal)) && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-800 z-10"
                    style={{ height: viewHeight }}
                >
                    <Loader2 className="h-8 w-8 animate-spin text-[#63C0B9]" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {useGoogleFallback ? "Trying Google Docs viewer…" : "Loading presentation…"}
                    </span>
                </div>
            )}

            {renderViewer(viewHeight)}
        </div>
    );

    // ── Fullscreen modal ───────────────────────────────────────────────────────
    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[200] flex flex-col bg-black/95">
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
                <div className="flex-1 overflow-auto p-4">
                    {viewerContent(window.innerHeight - 100)}
                </div>
            </div>
        );
    }

    // ── Normal view ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-2">
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
