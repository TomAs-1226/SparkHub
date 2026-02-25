"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToast } from "@/contexts/toast-context";

const TYPE_CONFIG = {
    success: {
        bg: "bg-white dark:bg-slate-800",
        border: "border-green-200 dark:border-green-700",
        icon: CheckCircle2,
        iconColor: "text-green-500",
        bar: "bg-green-500",
    },
    error: {
        bg: "bg-white dark:bg-slate-800",
        border: "border-red-200 dark:border-red-700",
        icon: AlertCircle,
        iconColor: "text-red-500",
        bar: "bg-red-500",
    },
    info: {
        bg: "bg-white dark:bg-slate-800",
        border: "border-[#63C0B9]/40 dark:border-teal-700",
        icon: Info,
        iconColor: "text-[#63C0B9]",
        bar: "bg-[#63C0B9]",
    },
};

export default function ToastContainer() {
    const { toasts, dismiss } = useToast();

    return (
        <div
            aria-live="polite"
            className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((t) => {
                    const cfg = TYPE_CONFIG[t.type];
                    const Icon = cfg.icon;
                    return (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 24, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 40, scale: 0.92 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className={`pointer-events-auto flex w-[320px] max-w-[90vw] items-start gap-3 rounded-2xl border ${cfg.bg} ${cfg.border} px-4 py-3 shadow-xl`}
                        >
                            {/* Colored left bar */}
                            <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${cfg.bar}`} />
                            <div className="ml-1 flex-shrink-0 mt-0.5">
                                <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                            </div>
                            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200 leading-snug">
                                {t.message}
                            </p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="flex-shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
