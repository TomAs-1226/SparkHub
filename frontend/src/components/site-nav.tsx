"use client";

import Link from "next/link";
import SparkHubLogo from "@/components/SparkHubLogo";
import { useState } from "react";

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <SparkHubLogo className="h-8 w-auto text-slate-900" />
                </Link>

                <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
                    <Link href="/courses" className="hover:text-slate-900">Courses</Link>
                    <Link href="/resources" className="hover:text-slate-900">Resources</Link>
                    <Link href="/opportunities" className="hover:text-slate-900">Opportunities</Link>
                    <Link href="/about" className="hover:text-slate-900">About</Link>
                </nav>

                <div className="hidden items-center gap-2 md:flex">
                    <Link href="/register" className="rounded-full border px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign up</Link>
                    <Link href="/login" className="rounded-full bg-[var(--sh-accent)] px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110">Log in</Link>
                </div>

                <button
                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 md:hidden"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle menu"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {open && (
                <div className="border-t border-slate-200/60 bg-white md:hidden">
                    <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            <Link href="/courses">Courses</Link>
                            <Link href="/dashboard">Dashboard</Link>
                            <Link href="/resources">Resources</Link>
                            <Link href="/opportunities">Opportunities</Link>
                            <Link href="/about">About</Link>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Link href="/signup" className="rounded-full border px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign up</Link>
                            <Link href="/login" className="rounded-full bg-[var(--sh-accent)] px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110">Log in</Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}