"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import SparkHubLogo from "@/components/SparkHubLogo";
import { clearToken } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/use-current-user";

type RoleAwareLink = { href: string; label: string; roles?: string[] };

const NAV_LINKS: RoleAwareLink[] = [
    { href: "/courses", label: "Courses" },
    { href: "/events", label: "Events" },
    { href: "/tutors", label: "Find a tutor", roles: ["ANON", "STUDENT"] },
    { href: "/resources", label: "Resources" },
    { href: "/opportunities", label: "Opportunities" },
    { href: "/contact", label: "Contact" },
];

const ROLE_LINKS: Record<string, RoleAwareLink[]> = {
    ADMIN: [
        { href: "/admin", label: "Admin" },
        { href: "/tutors/dashboard", label: "Publishing" },
    ],
    TUTOR: [
        { href: "/tutors/dashboard", label: "Tutor workspace" },
    ],
    CREATOR: [
        { href: "/tutors/dashboard", label: "Creator workspace" },
    ],
    STUDENT: [
        { href: "/courses#catalog", label: "My courses" },
    ],
    RECRUITER: [
        { href: "/opportunities", label: "Hire students" },
    ],
};

export default function Navbar() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const { user, setUser } = useCurrentUser();
    const showTutorWorkspace = !!user && ["TUTOR", "ADMIN", "CREATOR"].includes(user.role);
    const desktopLinks = useMemo(() => {
        const role = user?.role;
        const base = NAV_LINKS.filter((link) => {
            if (!link.roles) return true;
            if (!role) return link.roles.includes("ANON");
            return link.roles.includes(role);
        });
        if (!role) return base;
        return [...base, ...(ROLE_LINKS[role] || [])];
    }, [user?.role]);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <SparkHubLogo className="h-8 w-auto text-slate-900" />
                </Link>

                <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
                    {desktopLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:text-slate-900">
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden items-center gap-2 md:flex">
                    {user ? (
                        <ProfileMenu
                            user={user}
                            onSignOut={() => {
                                clearToken();
                                setUser(null);
                                router.push("/");
                            }}
                            showTutorWorkspace={showTutorWorkspace}
                        />
                    ) : (
                        <>
                            <Link href="/register" className="rounded-full border px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign up</Link>
                            <Link href="/login" className="rounded-full bg-[var(--sh-accent)] px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110">Log in</Link>
                        </>
                    )}
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
                            {desktopLinks.map((link) => (
                                <Link key={link.href} href={link.href} className="hover:text-slate-900">
                                    {link.label}
                                </Link>
                            ))}
                            {user ? (
                                <>
                                    <Link href="/dashboard">Dashboard</Link>
                                    {user.role === "ADMIN" && <Link href="/admin">Admin panel</Link>}
                                    {showTutorWorkspace && <Link href="/tutors/dashboard">Publishing workspace</Link>}
                                    <Link href="/settings">Profile settings</Link>
                                </>
                            ) : (
                                <Link href="/dashboard">Dashboard</Link>
                            )}
                        </div>
                        {!user && (
                            <div className="mt-3 flex gap-2">
                                <Link href="/register" className="rounded-full border px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Sign up</Link>
                                <Link href="/login" className="rounded-full bg-[var(--sh-accent)] px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110">Log in</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

function ProfileMenu({
    user,
    onSignOut,
    showTutorWorkspace,
}: {
    user: { name?: string | null; avatarUrl?: string | null; role: string };
    onSignOut: () => void;
    showTutorWorkspace: boolean;
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
        : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || "SparkHub")}`;
    const go = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    const menuItems = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Profile settings", href: "/settings" },
        user.role === "ADMIN" ? { label: "Admin control", href: "/admin" } : null,
        showTutorWorkspace ? { label: "Publishing workspace", href: "/tutors/dashboard" } : null,
    ].filter(Boolean) as { label: string; href: string }[];

    return (
        <div className="relative" ref={flyoutRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-left shadow-sm hover:border-slate-300"
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
                <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-100 bg-white/95 p-3 text-sm shadow-2xl">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick access</p>
                    <div className="mt-2 flex flex-col gap-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => go(item.href)}
                                className="rounded-xl px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                        Signed in as <span className="font-semibold text-slate-800">{user.name || "SparkHub"}</span>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Role: {user.role}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onSignOut();
                        }}
                        className="mt-3 w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}