"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Shield, UploadCloud } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { uploadAsset } from "@/lib/upload";

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading } = useCurrentUser();
    const [name, setName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login?from=/settings");
        }
    }, [loading, user, router]);

    useEffect(() => {
        setName(user?.name || "");
        setAvatarUrl(user?.avatarUrl || "");
    }, [user]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const res = await api("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({ name, avatarUrl }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to update profile");
            setStatus("Profile updated successfully.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to update profile.");
        } finally {
            setSaving(false);
        }
    }

    if (loading || !user) {
        return (
            <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
                <SiteNav />
                <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
                    <div className="h-[360px] animate-pulse rounded-[32px] bg-white" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">
                        <CheckCircle2 className="h-5 w-5" /> Profile settings
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold">Fine tune your SparkHub identity</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Update your profile photo, display name, and jump into admin or tutor spaces from one floating workspace.
                    </p>

                    {status && (
                        <div className="mt-4 rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700">
                            {status}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-sm">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Display name
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                required
                            />
                        </label>
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-[#F9FBFF] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avatar</p>
                            <div className="mt-3 flex items-center gap-4">
                                <div
                                    className="h-16 w-16 rounded-full border border-slate-200 bg-slate-100"
                                    style={{ backgroundImage: `url(${avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(name || "SparkHub")})`, backgroundSize: "cover" }}
                                />
                                <div className="flex flex-col gap-2 text-xs text-slate-500">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700"
                                        onClick={async () => {
                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.accept = "image/*";
                                            input.onchange = async () => {
                                                if (input.files && input.files[0]) {
                                                    const url = await uploadAsset(input.files[0]);
                                                    setAvatarUrl(url);
                                                }
                                            };
                                            input.click();
                                        }}
                                    >
                                        <UploadCloud className="h-4 w-4" /> Upload photo
                                    </button>
                                    {avatarUrl && (
                                        <span className="text-[11px] text-slate-500">{avatarUrl}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {saving ? "Saving..." : "Save profile"}
                        </button>
                    </form>

                    <div className="mt-8 rounded-3xl border border-slate-100 bg-[#F9FBFF] p-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] p-3 text-[#2D8F80]">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Role shortcuts</p>
                                <p className="text-sm text-slate-500">Hop directly into admin or tutor workspaces.</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                            <Link
                                href="/dashboard"
                                className="rounded-full border border-slate-200 px-4 py-1 text-slate-700 hover:bg-white"
                            >
                                Dashboard
                            </Link>
                            {user.role === "ADMIN" && (
                                <Link
                                    href="/admin"
                                    className="rounded-full border border-slate-200 px-4 py-1 text-slate-700 hover:bg-white"
                                >
                                    Admin control panel
                                </Link>
                            )}
                            {user.role === "TUTOR" && (
                                <Link
                                    href="/tutors/dashboard"
                                    className="rounded-full border border-slate-200 px-4 py-1 text-slate-700 hover:bg-white"
                                >
                                    Tutor workspace
                                </Link>
                            )}
                        </div>
                    </div>
                </motion.section>
            </main>
        </div>
    );
}
