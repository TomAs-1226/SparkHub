"use client";

import Link from "next/link";
import { Github, Mail, BookOpen, Calendar, Users, Briefcase, FileText, BookMarked, MessageSquare, Shield, FileCheck, AlertCircle, Zap, Heart, Star } from "lucide-react";

const VERSION = "0.2.5 (build 20260224.B)";

export default function SiteFooter() {
    return (
        <footer className="bg-[#0F1629] text-slate-300 mt-auto">
            {/* Main grid */}
            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">

                    {/* Brand column */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#63C0B9] to-[#4a9e97]">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">SparkHub</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                            A modern, open-source learning management system built for students, creators, and educators.
                            Everything you need to learn, teach, and grow — in one place.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <a
                                href="https://github.com/TomAs-1226/SparkHub"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                                <Github className="h-3.5 w-3.5" />
                                GitHub
                            </a>
                            <a
                                href="mailto:support@sparkhub.app"
                                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                                <Mail className="h-3.5 w-3.5" />
                                Contact
                            </a>
                            <a
                                href="https://github.com/TomAs-1226/SparkHub"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                                <Star className="h-3.5 w-3.5" />
                                Star on GitHub
                            </a>
                        </div>
                        <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                            Self-hostable · Free &amp; open-source · MIT license
                        </p>
                    </div>

                    {/* Platform column */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Platform</h3>
                        <ul className="space-y-2.5">
                            {[
                                { href: "/courses", icon: BookOpen, label: "Courses" },
                                { href: "/events", icon: Calendar, label: "Events" },
                                { href: "/tutors", icon: Users, label: "Tutoring" },
                                { href: "/resources", icon: FileText, label: "Resources" },
                                { href: "/opportunities", icon: Briefcase, label: "Opportunities" },
                                { href: "/dashboard", icon: BookMarked, label: "Dashboard" },
                            ].map(({ href, icon: Icon, label }) => (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#63C0B9] transition-colors"
                                    >
                                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* For Creators column */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">For Creators</h3>
                        <ul className="space-y-2.5">
                            {[
                                { href: "/courses/studio", label: "Create a Course" },
                                { href: "/events", label: "Host an Event" },
                                { href: "/tutors/dashboard", label: "Become a Tutor" },
                                { href: "/resources", label: "Share a Resource" },
                                { href: "/opportunities", label: "Post an Opportunity" },
                            ].map(({ href, label }) => (
                                <li key={label}>
                                    <Link
                                        href={href}
                                        className="text-sm text-slate-400 hover:text-[#63C0B9] transition-colors"
                                    >
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support / Legal column */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Support</h3>
                        <ul className="space-y-2.5">
                            {[
                                { href: "/privacy", icon: Shield, label: "Privacy Policy" },
                                { href: "/terms", icon: FileCheck, label: "Terms of Service" },
                                { href: "mailto:support@sparkhub.app", icon: MessageSquare, label: "Get Help" },
                                { href: "https://github.com/TomAs-1226/SparkHub/issues", icon: AlertCircle, label: "Report an Issue", external: true },
                            ].map(({ href, icon: Icon, label, external }) => (
                                <li key={label}>
                                    <Link
                                        href={href}
                                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#63C0B9] transition-colors"
                                    >
                                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-white mb-3">About</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                SparkHub is open-source and free to self-host.
                                Built with Next.js, Express &amp; SQLite.
                                Contributions welcome on GitHub.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-800">
                <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                        &copy; {new Date().getFullYear()} SparkHub. Built for learners everywhere.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>v{VERSION}</span>
                        <span className="flex items-center gap-1">
                            Made with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> open source
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
