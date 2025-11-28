"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import SparkHubLogo from "@/components/SparkHubLogo";
import { clearToken } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ACCENT_OPTIONS, AccentOption, applyAccent, loadAccent } from "@/lib/accent-theme";
import { EASE } from "@/lib/motion-presets";

type RoleAwareLink = { href: string; label: string; roles?: string[] };

const NAV_LINKS: RoleAwareLink[] = [
    { href: "/courses", label: "Courses" },
    { href: "/courses/join", label: "Join" },
    { href: "/events", label: "Events" },
    { href: "/tutors", label: "Find a tutor", roles: ["ANON", "STUDENT"] },
    { href: "/resources", label: "Resources" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/mentors", label: "Mentors" },
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
    const [scrolled, setScrolled] = useState(false);
    const [atTop, setAtTop] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const navScrollRef = useRef<HTMLDivElement | null>(null);
    const navScrollPosition = useRef(0);
    const scrollRaf = useRef<number | null>(null);

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

    useEffect(() => {
        const updateScroll = () => {
            const scrollTop = window.scrollY;
            setScrolled(scrollTop > 10);
            setAtTop(scrollTop < 6);
            setShowScrollTop(scrollTop > 320);
            scrollRaf.current = null;
        };

        const handleScroll = () => {
            if (scrollRaf.current !== null) return;
            scrollRaf.current = window.requestAnimationFrame(updateScroll);
        };

        updateScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            if (scrollRaf.current !== null) {
                window.cancelAnimationFrame(scrollRaf.current);
            }
            window.removeEventListener("scroll", handleScroll);
        };
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
        if (navScrollRef.current) {
            navScrollRef.current.scrollLeft = navScrollPosition.current;
        }
    }, [pathname]);

    return (
        <>
            <motion.header
                className="relative sticky top-0 z-50 w-full px-2 pb-2 sm:px-4"
                animate={{
                    y: scrolled ? 2 : 0,
                    scale: scrolled ? 0.996 : 1,
                    filter: scrolled
                        ? "drop-shadow(0 16px 40px rgba(15,23,42,0.14))"
                        : "drop-shadow(0 12px 32px rgba(15,23,42,0.1))",
                }}
                transition={{ type: "spring", stiffness: 220, damping: 26, mass: 1.05 }}
            >
            <motion.div
                className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/75 via-white/40 to-transparent backdrop-blur-2xl"
                aria-hidden
                animate={{ opacity: scrolled ? 0.95 : 0.72, filter: scrolled ? "blur(7px)" : "blur(4px)" }}
                transition={{ duration: 0.6, ease: EASE.lift }}
            />
            <motion.div
                className="pointer-events-none absolute inset-x-2 top-2 h-[68px] rounded-full bg-[var(--sh-glass-edge)] blur-2xl"
                aria-hidden
                animate={{ opacity: atTop ? 0.82 : 0.96, scaleX: scrolled ? 1.02 : 1 }}
                transition={{ duration: 0.6, ease: EASE.emphasized }}
            />
            <div className="relative mx-auto flex max-w-[1220px] items-center gap-3 rounded-full border border-[color:var(--sh-glass-border)] bg-[color:rgba(255,255,255,0.78)] px-4 py-2.5 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-[color:var(--sh-accent-veil)]">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_12%_26%,var(--sh-accent-soft)_0,transparent_35%),radial-gradient(circle_at_82%_40%,var(--sh-accent-glass)_0,transparent_30%),linear-gradient(120deg,var(--sh-accent-veil),transparent_45%)] pointer-events-none" aria-hidden />
                <motion.div
                    className="pointer-events-none absolute inset-1 rounded-full border border-white/40"
                    aria-hidden
                    animate={{ opacity: scrolled ? 0.72 : 0.42, scale: scrolled ? 1.01 : 1 }}
                    transition={{ duration: 0.45, ease: EASE.emphasized }}
                />
                <Link
                    href="/"
                    className="relative z-10 flex items-center gap-2 rounded-full px-2 py-1 text-slate-900 transition hover:bg-white/80 hover:shadow-sm"
                >
                    <SparkHubLogo className="h-8 w-auto text-slate-900" />
                </Link>

                <div className="relative z-10 hidden min-w-0 flex-1 md:flex">
                    <div className="relative w-full rounded-full border border-white/60 bg-white/70 px-1 py-1 shadow-inner shadow-white/30 backdrop-blur">
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-12 rounded-l-full bg-gradient-to-r from-white/90 via-white/60 to-transparent" />
                        <nav
                            ref={navScrollRef}
                            className="no-scrollbar relative flex items-center gap-1.5 overflow-x-auto px-2 text-sm font-semibold text-slate-700"
                            onScroll={(evt) => {
                                const current = evt.currentTarget;
                                navScrollPosition.current = current.scrollLeft;
                            }}
                        >
                            {desktopLinks.map((link) => {
                                const isActive = pathname?.startsWith(link.href);
                                return (
                                    <NavLinkPill key={link.href} href={link.href} active={isActive}>
                                        {link.label}
                                    </NavLinkPill>
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
                    <button
                        className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-2 text-slate-700 shadow-sm shadow-white/40"
                        onClick={() => setOpen((v) => !v)}
                        aria-label="Toggle menu"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    {resolvedUser && (
                        <button
                            type="button"
                            onClick={() => router.push("/dashboard")}
                            className="hidden h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white/80 text-sm font-semibold text-slate-700 shadow-sm shadow-white/40 min-[380px]:inline-flex"
                            aria-label="Open profile"
                        >
                            <Image
                                src={
                                    resolvedUser.avatarUrl
                                        ? `${resolvedUser.avatarUrl}${resolvedUser.avatarUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(resolvedUser.id)}`
                                        : `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(resolvedUser.name || "SparkHub")}`
                                }
                                alt="Profile avatar"
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                            />
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: EASE.emphasized }}
                        className="mx-auto mt-2 max-w-[1180px] rounded-3xl border border-[color:var(--sh-glass-border)] bg-white/90 p-4 shadow-[0_22px_60px_-30px_rgba(15,23,42,0.45)] ring-1 ring-[color:var(--sh-accent-veil)] backdrop-blur-2xl md:hidden"
                    >
                        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto text-sm font-semibold text-slate-700">
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
                            {showTutorWorkspace && (
                                <Link
                                    href="/tutors/dashboard"
                                    className="rounded-xl px-3 py-2 hover:bg-[var(--sh-accent-soft)] hover:text-slate-900"
                                    onClick={() => setOpen(false)}
                                >
                                    Publishing workspace
                                </Link>
                            )}
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
                        <div className="mt-4 space-y-2 rounded-2xl border border-dashed border-[var(--sh-accent-soft)] bg-white/80 px-3 py-3 text-xs text-slate-500 shadow-inner shadow-white/40">
                            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <span>Accent</span>
                                <span className="rounded-full bg-[var(--sh-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--sh-accent)]">Live</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ACCENT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            applyAccent(option);
                                            setAccent(option);
                                        }}
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
                            <p className="text-[11px] text-slate-500">Pinned glass nav, quick actions, and cards all reflect your selected accent.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </motion.header>
            <ScrollToTop show={showScrollTop} />
        </>
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
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.26, ease: EASE.lift }}
                        className="absolute right-0 mt-3 w-60 rounded-2xl border border-white/70 bg-white/90 p-3 text-sm shadow-2xl ring-1 ring-[var(--sh-accent-soft)] backdrop-blur"
                    >
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ScrollToTop({ show }: { show: boolean }) {
    return (
        <AnimatePresence>
            {show && (
                    <motion.button
                        key="scrolltop"
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.9 }}
                    transition={{ duration: 0.42, ease: EASE.lift }}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="fixed bottom-6 right-4 z-[70] inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-2 text-sm font-semibold text-slate-800 shadow-lg shadow-[var(--sh-card-glow)] ring-1 ring-[color:var(--sh-accent-veil)] backdrop-blur hover:translate-y-[-2px] hover:border-[var(--sh-accent-soft)] hover:shadow-xl"
                >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sh-accent-soft)] text-[color:var(--sh-accent-ink)] shadow-inner shadow-white/60">
                        ↑
                    </span>
                    Top
                </motion.button>
            )}
        </AnimatePresence>
    );
}

function NavLinkPill({
    href,
    active,
    compact,
    children,
}: {
    href: string;
    active: boolean;
    compact?: boolean;
    children: ReactNode;
}) {
    return (
        <motion.div
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE.swift }}
        >
            <Link
                href={href}
                className={`rounded-full ${compact ? "px-2.5 py-1" : "px-3 py-1.5"} whitespace-nowrap transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--sh-accent)] ${
                    active
                        ? "bg-[var(--sh-accent-soft)] text-slate-900 shadow-sm shadow-[var(--sh-card-glow)]"
                        : "hover:bg-white/80"
                }`}
            >
                {children}
            </Link>
        </motion.div>
    );
}
