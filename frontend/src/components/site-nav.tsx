"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import SparkHubLogo from "@/components/SparkHubLogo";
import { clearToken } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ACCENT_OPTIONS, AccentOption, applyAccent, loadAccent } from "@/lib/accent-theme";

type RoleAwareLink = { href: string; label: string; roles?: string[] };

const NAV_LINKS: RoleAwareLink[] = [
    { href: "/courses", label: "Courses" },
    { href: "/courses/join", label: "Join with code" },
    { href: "/events", label: "Events" },
    { href: "/tutors", label: "Find a tutor", roles: ["ANON", "STUDENT"] },
    { href: "/resources", label: "Resources" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
];

const ROLE_LINKS: Record<string, RoleAwareLink[]> = {
    ADMIN: [
        { href: "/admin", label: "Admin" },
        { href: "/courses/studio", label: "Course studio" },
        { href: "/tutors/dashboard", label: "Publishing" },
    ],
    TUTOR: [
        { href: "/tutors/dashboard", label: "Tutor workspace" },
        { href: "/courses/studio", label: "Course studio" },
    ],
    CREATOR: [
        { href: "/tutors/dashboard", label: "Creator workspace" },
        { href: "/courses/studio", label: "Course studio" },
    ],
    STUDENT: [
        { href: "/courses#catalog", label: "My courses" },
        { href: "/courses#assignments", label: "Assignments" },
    ],
    RECRUITER: [
        { href: "/opportunities", label: "Hire students" },
    ],
};

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { user, setUser } = useCurrentUser();
    const [clientReady, setClientReady] = useState(false);
    const [accent, setAccent] = useState<AccentOption | null>(null);

    useEffect(() => {
        setClientReady(true);
        const saved = loadAccent();
        if (saved) {
            applyAccent(saved);
            setAccent(saved);
        } else {
            applyAccent(ACCENT_OPTIONS[0]);
            setAccent(ACCENT_OPTIONS[0]);
        }
    }, []);

    const resolvedUser = clientReady ? user : null;
    const role = resolvedUser?.role;
    const showTutorWorkspace = Boolean(role && ["TUTOR", "ADMIN", "CREATOR"].includes(role));
    const desktopLinks = useMemo(() => {
        const base = NAV_LINKS.filter((link) => {
            if (!link.roles) return true;
            if (!role) return link.roles.includes("ANON");
            return link.roles.includes(role);
        });
        if (!role) return base;
        return [...base, ...(ROLE_LINKS[role] || [])];
    }, [role]);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-3 z-50 w-full px-3 sm:px-4">
            <div className="relative mx-auto flex max-w-[1180px] items-center gap-3 rounded-full border border-white/70 bg-[color:rgba(255,255,255,0.76)] px-3 py-2 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl ring-1 ring-[var(--sh-accent-soft)]">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_20%_30%,var(--sh-accent-soft)_0,transparent_38%),radial-gradient(circle_at_80%_40%,var(--sh-accent-glass)_0,transparent_32%)] pointer-events-none" aria-hidden />
                <Link href="/" className="relative z-10 flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/70">
                    <SparkHubLogo className="h-8 w-auto text-slate-900" />
                </Link>

                <div className="relative z-10 hidden flex-1 md:flex">
                    <div className="relative w-full rounded-full border border-white/60 bg-white/70 px-1 py-1 shadow-inner shadow-white/30 backdrop-blur">
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-12 rounded-l-full bg-gradient-to-r from-white/90 via-white/60 to-transparent" />
                        <nav className="no-scrollbar relative flex items-center gap-1.5 overflow-x-auto px-2 text-sm font-semibold text-slate-700">
                            {desktopLinks.map((link) => {
                                const isActive = pathname?.startsWith(link.href);
                                return (
                                    <motion.div key={link.href} whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                                        <Link
                                            href={link.href}
                                            className={`rounded-full px-3 py-1.5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--sh-accent)] ${
                                                isActive
                                                    ? "bg-[var(--sh-accent-soft)] text-slate-900 shadow-sm shadow-[var(--sh-card-glow)]"
                                                    : "hover:bg-white/80"
                                            }`}
                                        >
                                            {link.label}
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </nav>
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-12 rounded-r-full bg-gradient-to-l from-white/90 via-white/60 to-transparent" />
                    </div>
                </div>

                <div className="relative z-10 hidden items-center gap-2 md:flex">
                    {resolvedUser ? (
                        <ProfileMenu
                            user={resolvedUser}
                            onSignOut={() => {
                                clearToken();
                                setUser(null);
                                router.push("/");
                            }}
                            showTutorWorkspace={showTutorWorkspace}
                            accent={accent}
                            onAccentChange={(option) => {
                                applyAccent(option);
                                setAccent(option);
                            }}
                        />
                    ) : (
                        <>
                            <Link href="/register" className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-[var(--sh-accent-soft)] hover:text-slate-900">Sign up</Link>
                            <Link href="/login" className="rounded-full bg-[var(--sh-accent)] px-4 py-1.5 text-sm font-semibold text-[var(--sh-accent-contrast)] shadow-[var(--sh-card-glow)] hover:brightness-110">Log in</Link>
                        </>
                    )}
                </div>

                <div className="relative z-10 flex flex-1 items-center justify-end gap-2 md:hidden">
                    <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto rounded-full border border-white/70 bg-white/80 px-2 py-1 text-xs font-semibold text-slate-700 shadow-inner shadow-white/40">
                        {desktopLinks.slice(0, 5).map((link) => {
                            const isActive = pathname?.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`rounded-full px-2.5 py-1 transition ${
                                        isActive ? "bg-[var(--sh-accent-soft)] text-slate-900" : "hover:bg-white/70"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                    <button
                        className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-2 text-slate-700 shadow-sm shadow-white/40"
                        onClick={() => setOpen((v) => !v)}
                        aria-label="Toggle menu"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="mx-auto mt-2 max-w-[1180px] rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_22px_60px_-30px_rgba(15,23,42,0.4)] backdrop-blur md:hidden"
                    >
                        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            {desktopLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="rounded-xl px-3 py-2 hover:bg-[var(--sh-accent-soft)] hover:text-slate-900"
                                    onClick={() => setOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {resolvedUser ? (
                                <>
                                    <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-[var(--sh-accent-soft)]">
                                        Dashboard
                                    </Link>
                                    {resolvedUser.role === "ADMIN" && (
                                        <Link href="/admin" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-[var(--sh-accent-soft)]">
                                            Admin panel
                                        </Link>
                                    )}
                                    {showTutorWorkspace && (
                                        <Link href="/tutors/dashboard" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-[var(--sh-accent-soft)]">
                                            Publishing workspace
                                        </Link>
                                    )}
                                    <Link href="/settings" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-[var(--sh-accent-soft)]">
                                        Profile settings
                                    </Link>
                                </>
                            ) : (
                                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-[var(--sh-accent-soft)]">
                                    Dashboard
                                </Link>
                            )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {!resolvedUser ? (
                                <>
                                    <Link
                                        href="/register"
                                        className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-[var(--sh-accent-soft)]"
                                        onClick={() => setOpen(false)}
                                    >
                                        Sign up
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="rounded-full bg-[var(--sh-accent)] px-4 py-1.5 text-sm font-semibold text-[var(--sh-accent-contrast)] shadow-[var(--sh-card-glow)] hover:brightness-110"
                                        onClick={() => setOpen(false)}
                                    >
                                        Log in
                                    </Link>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        clearToken();
                                        setUser(null);
                                        router.push("/");
                                    }}
                                    className="flex-1 rounded-full bg-[var(--sh-accent)] px-4 py-2 text-sm font-semibold text-[var(--sh-accent-contrast)] shadow-[var(--sh-card-glow)] hover:brightness-110"
                                >
                                    Sign out
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

function ProfileMenu({
    user,
    onSignOut,
    showTutorWorkspace,
    accent,
    onAccentChange,
}: {
    user: { id: string; name?: string | null; avatarUrl?: string | null; role: string };
    onSignOut: () => void;
    showTutorWorkspace: boolean;
    accent: AccentOption | null;
    onAccentChange: (option: AccentOption) => void;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const flyoutRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClick(event: MouseEvent) {
            if (!flyoutRef.current) return;
            if (!flyoutRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("click", handleClick);
        }
        return () => document.removeEventListener("click", handleClick);
    }, [open]);

    const avatar = user.avatarUrl
        ? `${user.avatarUrl}${user.avatarUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(user.id)}`
        : `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(user.name || "SparkHub")}`;
    const go = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    const menuItems = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Profile settings", href: "/settings" },
        user.role === "ADMIN" ? { label: "Admin control", href: "/admin" } : null,
        showTutorWorkspace ? { label: "Course studio", href: "/courses/studio" } : null,
        showTutorWorkspace ? { label: "Publishing workspace", href: "/tutors/dashboard" } : null,
    ].filter(Boolean) as { label: string; href: string }[];

    return (
        <div className="relative" ref={flyoutRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-2 py-1 text-left shadow-sm shadow-[var(--sh-card-glow)] backdrop-blur hover:border-[var(--sh-accent-soft)]"
            >
                <span className="hidden text-sm font-semibold text-slate-700 lg:inline">{user.name || "Account"}</span>
                <span
                    key={avatar}
                    className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100"
                    aria-label="Profile menu"
                >
                    <Image src={avatar} alt="Profile avatar" width={36} height={36} className="h-full w-full object-cover" />
                </span>
            </button>
            {open && (
                <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-white/70 bg-white/90 p-3 text-sm shadow-2xl ring-1 ring-[var(--sh-accent-soft)] backdrop-blur">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick access</p>
                    <div className="mt-2 flex flex-col gap-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => go(item.href)}
                                className="rounded-xl px-3 py-2 text-left font-semibold text-slate-700 transition hover:bg-[var(--sh-accent-soft)] hover:text-slate-900"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-[var(--sh-accent-soft)] bg-white/70 px-3 py-2 text-xs text-slate-500 shadow-inner shadow-white/40">
                        <div>
                            Signed in as <span className="font-semibold text-slate-800">{user.name || "SparkHub"}</span>
                            <div className="text-[11px] uppercase tracking-wide text-[color:var(--sh-accent-ink)]">Role: {user.role}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <span>Accent</span>
                                <span className="rounded-full bg-[var(--sh-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--sh-accent)]">Live</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ACCENT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => onAccentChange(option)}
                                        className={`h-8 w-8 rounded-full border-2 transition shadow-[var(--sh-card-glow)] ${
                                            accent?.value === option.value
                                                ? "border-[var(--sh-accent)] ring-2 ring-[var(--sh-accent)] ring-offset-1"
                                                : "border-transparent"
                                        }`}
                                        style={{ backgroundColor: option.value }}
                                        aria-label={`Use ${option.label}`}
                                    />
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500">Glass pill nav and action buttons will instantly pick up your accent.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onSignOut();
                        }}
                        className="mt-3 w-full rounded-full bg-[var(--sh-accent)] px-4 py-2 text-sm font-semibold text-[var(--sh-accent-contrast)] shadow-[var(--sh-card-glow)] hover:brightness-110"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}