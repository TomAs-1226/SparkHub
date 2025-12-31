"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function DashboardCard(props: {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    const { title, icon, children, className = "" } = props;

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={
                `
                relative rounded-[20px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl
                ring-1 ring-black/5 dark:ring-white/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.4)]
                p-5 sm:p-6
                ` + className
            }
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    {icon ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#63C0B9]/10 dark:bg-[#63C0B9]/20 ring-1 ring-[#63C0B9]/20 text-[#2B2B2B] dark:text-slate-200">
                            {icon}
                        </div>
                    ) : null}
                    <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                        {title}
                    </h2>
                </div>
            </div>

            <div className="mt-4 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {children}
            </div>
        </motion.section>
    );
}
