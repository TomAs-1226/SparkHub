"use client";

import SiteNav from "@/components/site-nav";
import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="min-h-dvh bg-[#F5F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-12">
                <div className="rounded-[32px] border border-white/60 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-2xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#E7F6F3] px-3 py-1 text-xs font-semibold text-[#2D8F80] dark:bg-teal-900/40 dark:text-teal-300">
                        Legal
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: February 2026</p>

                    <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Information We Collect</h2>
                            <p className="mt-2">
                                SparkHub collects information you provide directly, including your name, email address, and account preferences.
                                We also collect usage data such as pages visited, features used, and session duration to improve the platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. How We Use Your Information</h2>
                            <p className="mt-2">We use your information to:</p>
                            <ul className="mt-2 list-disc pl-6 space-y-1">
                                <li>Provide and improve SparkHub services</li>
                                <li>Send you platform notifications and weekly digests (you can opt out in Settings)</li>
                                <li>Match tutors with students based on availability and subjects</li>
                                <li>Maintain account security and prevent fraud</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Data Storage</h2>
                            <p className="mt-2">
                                Your data is stored securely on our servers. We use industry-standard encryption and security practices.
                                We do not sell your personal information to third parties.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Cookies</h2>
                            <p className="mt-2">
                                SparkHub uses local storage to maintain your session and preferences. No third-party tracking cookies are used.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">5. Your Rights</h2>
                            <p className="mt-2">
                                You can request deletion of your account and associated data at any time by contacting us.
                                You may also update or export your data from your account settings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">6. Contact</h2>
                            <p className="mt-2">
                                If you have questions about this policy, please reach out via the{" "}
                                <Link href="/contact" className="text-[#63C0B9] underline underline-offset-2 hover:brightness-110">
                                    Contact page
                                </Link>
                                .
                            </p>
                        </section>
                    </div>

                    <div className="mt-10 flex gap-3">
                        <Link
                            href="/"
                            className="rounded-full border border-[#CFE3E0] px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            ← Back to home
                        </Link>
                        <Link
                            href="/terms"
                            className="rounded-full bg-[#63C0B9] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D8F80]"
                        >
                            Terms of Service →
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
