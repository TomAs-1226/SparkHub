"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, AlertTriangle, AlertCircle, Wrench } from "lucide-react";

interface Announcement {
    id: string;
    message: string;
    kind: "info" | "warning" | "error" | "maintenance";
    expiresAt: string | null;
}

const KIND_CONFIG = {
    info: {
        bg: "bg-teal-600",
        text: "text-white",
        icon: Info,
        label: "Info",
    },
    warning: {
        bg: "bg-amber-500",
        text: "text-white",
        icon: AlertTriangle,
        label: "Notice",
    },
    error: {
        bg: "bg-red-600",
        text: "text-white",
        icon: AlertCircle,
        label: "Alert",
    },
    maintenance: {
        bg: "bg-purple-700",
        text: "text-white",
        icon: Wrench,
        label: "Maintenance",
    },
};

export default function SiteAnnouncementBanner() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        fetch("/api/admin/announcement")
            .then((r) => r.json())
            .then((json) => {
                if (json?.ok && json.announcement) {
                    const a: Announcement = json.announcement;
                    // Check if dismissed in this session
                    const key = `sparkhub:announcement-dismissed:${a.id}`;
                    if (!sessionStorage.getItem(key)) {
                        setAnnouncement(a);
                        setVisible(true);
                    }
                }
            })
            .catch(() => {});
    }, []);

    function dismiss() {
        if (announcement) {
            sessionStorage.setItem(`sparkhub:announcement-dismissed:${announcement.id}`, "1");
        }
        setVisible(false);
    }

    const config = KIND_CONFIG[(announcement?.kind as keyof typeof KIND_CONFIG) ?? "info"];
    const Icon = config.icon;

    return (
        <AnimatePresence>
            {visible && announcement && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className={`${config.bg} ${config.text} w-full overflow-hidden z-50`}
                >
                    <div className="mx-auto max-w-7xl px-4 py-2.5 flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Icon className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                                {config.label}
                            </span>
                        </div>
                        <p className="flex-1 text-sm font-medium text-center leading-snug">
                            {announcement.message}
                        </p>
                        <button
                            onClick={dismiss}
                            className="flex-shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
