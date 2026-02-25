import Link from "next/link";
import { Zap, ArrowLeft, Home } from "lucide-react";
import SiteNav from "@/components/site-nav";

export default function NotFound() {
    return (
        <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col">
            <SiteNav />
            <main className="flex flex-1 items-center justify-center px-4 py-20">
                <div className="text-center max-w-md">
                    {/* Logo */}
                    <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#63C0B9] to-[#2B2E83] shadow-2xl shadow-teal-500/20">
                        <Zap className="h-10 w-10 text-white" />
                    </div>

                    {/* 404 */}
                    <p className="text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#63C0B9] to-[#2B2E83] select-none">
                        404
                    </p>

                    <h1 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Page not found
                    </h1>
                    <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                        This page doesn&apos;t exist or may have been moved.
                        Check the URL or head back to safety.
                    </p>

                    {/* Actions */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#63C0B9] to-[#2B2E83] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-teal-500/25 hover:opacity-90 transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go to Dashboard
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Home className="h-4 w-4" />
                            Go Home
                        </Link>
                    </div>

                    {/* Subtle hint */}
                    <p className="mt-10 text-xs text-slate-400 dark:text-slate-600">
                        SparkHub v0.3.0
                    </p>
                </div>
            </main>
        </div>
    );
}
