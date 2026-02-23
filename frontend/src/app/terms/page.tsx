"use client";

import SiteNav from "@/components/site-nav";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-dvh bg-[#F5F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-12">
                <div className="rounded-[32px] border border-white/60 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-2xl">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#E7F6F3] px-3 py-1 text-xs font-semibold text-[#2D8F80] dark:bg-teal-900/40 dark:text-teal-300">
                        Legal
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Terms of Service</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: February 2026</p>

                    <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
                            <p className="mt-2">
                                By creating an account on SparkHub, you agree to these Terms of Service. If you do not agree, please do not use the platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Account Responsibilities</h2>
                            <p className="mt-2">You are responsible for maintaining the security of your account and for all activity that occurs under your account. You must provide accurate information when registering.</p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Acceptable Use</h2>
                            <p className="mt-2">You agree not to:</p>
                            <ul className="mt-2 list-disc pl-6 space-y-1">
                                <li>Post false, misleading, or harmful content</li>
                                <li>Harass, abuse, or harm other users</li>
                                <li>Attempt to gain unauthorized access to the platform or other accounts</li>
                                <li>Use SparkHub for commercial purposes without authorization</li>
                                <li>Violate any applicable laws or regulations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Content</h2>
                            <p className="mt-2">
                                Content you post on SparkHub remains yours. By posting, you grant SparkHub a license to display it on the platform.
                                SparkHub reserves the right to remove content that violates these terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">5. Tutoring Sessions</h2>
                            <p className="mt-2">
                                SparkHub facilitates connections between tutors and students. We are not responsible for the content of tutoring sessions or disputes between users.
                                Tutors are independent and set their own rates and availability.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">6. Termination</h2>
                            <p className="mt-2">
                                We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time from Settings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">7. Disclaimer</h2>
                            <p className="mt-2">
                                SparkHub is provided "as is" without warranties of any kind. We are not liable for any indirect or consequential damages arising from use of the platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">8. Changes to Terms</h2>
                            <p className="mt-2">
                                We may update these terms. Continued use of SparkHub after changes constitutes acceptance of the new terms.
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
                            href="/privacy"
                            className="rounded-full bg-[#63C0B9] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D8F80]"
                        >
                            Privacy Policy →
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
