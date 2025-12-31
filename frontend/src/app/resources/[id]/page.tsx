"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    BookOpen,
    Download,
    ExternalLink,
    FileText,
    Film,
    Image as ImageIcon,
    Maximize2,
    Minimize2,
    File,
    X,
} from "lucide-react";

import SiteNav from "@/components/site-nav";

interface ResourceDetail {
    id: string;
    title: string;
    kind: string;
    summary?: string | null;
    details?: string | null;
    url?: string | null;
    imageUrl?: string | null;
    attachmentUrl?: string | null;
}

type FileType = "pdf" | "image" | "video" | "audio" | "document" | "unknown";

function getFileType(url?: string | null): FileType {
    if (!url) return "unknown";
    const ext = url.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) return "pdf";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
    if (["mp4", "webm", "ogg", "mov", "avi"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) return "audio";
    if (["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "md"].includes(ext)) return "document";
    return "unknown";
}

function getFileIcon(type: FileType) {
    switch (type) {
        case "pdf":
            return <FileText className="h-6 w-6" />;
        case "image":
            return <ImageIcon className="h-6 w-6" />;
        case "video":
            return <Film className="h-6 w-6" />;
        default:
            return <File className="h-6 w-6" />;
    }
}

function ResourceViewer({
    url,
    type,
    title,
}: {
    url: string;
    type: FileType;
    title: string;
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const viewerContent = () => {
        switch (type) {
            case "pdf":
                return (
                    <iframe
                        src={`${url}#view=FitH`}
                        className="h-full w-full rounded-xl border-0"
                        title={title}
                        onLoad={() => setIsLoading(false)}
                    />
                );
            case "image":
                return (
                    <div className="relative h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                        <Image
                            src={url}
                            alt={title}
                            fill
                            className="object-contain"
                            onLoad={() => setIsLoading(false)}
                        />
                    </div>
                );
            case "video":
                return (
                    <video
                        src={url}
                        controls
                        className="h-full w-full rounded-xl bg-black"
                        onLoadedData={() => setIsLoading(false)}
                    >
                        Your browser does not support video playback.
                    </video>
                );
            case "audio":
                return (
                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#E7F6F3] to-[#F0F9FF] dark:from-slate-700 dark:to-slate-800">
                        <audio
                            src={url}
                            controls
                            className="w-full max-w-md"
                            onLoadedData={() => setIsLoading(false)}
                        >
                            Your browser does not support audio playback.
                        </audio>
                    </div>
                );
            default:
                return (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <File className="h-16 w-16 text-slate-400 dark:text-slate-500" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Preview not available for this file type
                        </p>
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white"
                        >
                            <Download className="h-4 w-4" /> Download file
                        </a>
                    </div>
                );
        }
    };

    return (
        <>
            {/* Inline viewer */}
            <div className="relative">
                <div className="absolute right-2 top-2 z-10 flex gap-2">
                    <motion.button
                        onClick={() => setIsFullscreen(true)}
                        className="rounded-full bg-white/90 dark:bg-slate-700/90 p-2 text-slate-700 dark:text-slate-200 shadow-lg hover:bg-white dark:hover:bg-slate-600"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Fullscreen"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </motion.button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-white/90 dark:bg-slate-700/90 p-2 text-slate-700 dark:text-slate-200 shadow-lg hover:bg-white dark:hover:bg-slate-600"
                        title="Open in new tab"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
                <div className="h-[400px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    {isLoading && type !== "unknown" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#63C0B9] border-t-transparent" />
                        </div>
                    )}
                    {viewerContent()}
                </div>
            </div>

            {/* Fullscreen modal */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsFullscreen(false)}
                    >
                        <motion.button
                            onClick={() => setIsFullscreen(false)}
                            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <X className="h-6 w-6" />
                        </motion.button>
                        <motion.div
                            className="h-[90vh] w-[90vw] overflow-hidden rounded-xl"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {viewerContent()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
    const [resource, setResource] = useState<ResourceDetail | null>(null);
    const [resourceId, setResourceId] = useState<string | null>(null);

    useEffect(() => {
        params.then((p) => setResourceId(p.id));
    }, [params]);

    useEffect(() => {
        if (!resourceId) return;
        let active = true;
        (async () => {
            try {
                const res = await fetch(`/api/resources/${resourceId}`, { cache: "no-store" });
                if (!res.ok) {
                    setStatus("missing");
                    return;
                }
                const json = await res.json();
                if (!active) return;
                setResource(json?.resource || null);
                setStatus(json?.resource ? "ready" : "missing");
            } catch {
                if (active) setStatus("missing");
            }
        })();
        return () => {
            active = false;
        };
    }, [resourceId]);

    const attachmentType = getFileType(resource?.attachmentUrl);
    const urlType = getFileType(resource?.url);
    const viewableUrl = resource?.attachmentUrl || resource?.url;
    const viewableType = attachmentType !== "unknown" ? attachmentType : urlType;

    return (
        <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-[32px] border border-white/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-2xl md:p-10"
                >
                    <Link href="/resources" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">
                        <ArrowLeft className="h-4 w-4" /> Back to resources
                    </Link>

                    {status === "loading" ? (
                        <div className="mt-6 h-[320px] animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-700" />
                    ) : status === "missing" || !resource ? (
                        <div className="mt-6 text-sm text-slate-600 dark:text-slate-400">This resource was not found.</div>
                    ) : (
                        <div className="mt-6 space-y-6">
                            {/* Header with type indicator */}
                            <div className="flex items-start gap-4">
                                <div className="rounded-2xl bg-gradient-to-br from-[#E7F6F3] to-[#F0F9FF] dark:from-slate-700 dark:to-slate-600 p-4 text-[#2D8F80] dark:text-[#63C0B9]">
                                    {getFileIcon(viewableType)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">{resource.kind}</p>
                                    <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{resource.title}</h1>
                                    {resource.summary && (
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{resource.summary}</p>
                                    )}
                                </div>
                            </div>

                            {/* Cover image if no viewable file */}
                            {resource.imageUrl && !viewableUrl && (
                                <div className="h-64 w-full overflow-hidden rounded-3xl">
                                    <div
                                        className="h-full w-full bg-cover bg-center"
                                        style={{ backgroundImage: `url(${resource.imageUrl})` }}
                                    />
                                </div>
                            )}

                            {/* Resource viewer for supported file types */}
                            {viewableUrl && (
                                <ResourceViewer
                                    url={viewableUrl}
                                    type={viewableType}
                                    title={resource.title}
                                />
                            )}

                            {/* Details section */}
                            {resource.details && (
                                <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5 text-sm text-slate-700 dark:text-slate-300">
                                    <BookOpen className="mb-2 h-5 w-5 text-[#2D8F80]" />
                                    <p className="whitespace-pre-wrap">{resource.details}</p>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-3 text-sm font-semibold">
                                {resource.url && (
                                    <a
                                        href={resource.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-white hover:bg-[#2D8F80] transition-colors"
                                    >
                                        <ExternalLink className="h-4 w-4" /> Open resource
                                    </a>
                                )}
                                {resource.attachmentUrl && (
                                    <a
                                        href={resource.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-[#2B2B2B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        <Download className="h-4 w-4" /> {fileName(resource.attachmentUrl)}
                                    </a>
                                )}
                                {!resource.url && !resource.attachmentUrl && (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#CFE3E0] dark:border-slate-600 px-4 py-2 text-[#7A8584] dark:text-slate-500">
                                        <File className="h-4 w-4" /> No file attached
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </motion.section>
            </main>
        </div>
    );
}

function fileName(path?: string | null) {
    if (!path) return "Download";
    const name = path.split("/").pop() || "Download";
    // Truncate long filenames
    if (name.length > 30) {
        const ext = name.split(".").pop();
        return name.slice(0, 25) + "..." + (ext ? `.${ext}` : "");
    }
    return name;
}
