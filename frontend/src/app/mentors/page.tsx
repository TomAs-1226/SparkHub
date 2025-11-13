"use client";

import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, UserPlus } from "lucide-react";
import SiteNav from "@/components/site-nav";

const signupFields = [
    { label: "Student name", type: "text", placeholder: "Taylor Lee" },
    { label: "Email address", type: "email", placeholder: "taylor@sparkhub.com" },
    { label: "Academic background", type: "text", placeholder: "Product design, IBDP" },
    { label: "Area of expertise", type: "text", placeholder: "UX prototyping" },
];

const schedulingFields = [
    { label: "Preferred coaching format", type: "select", options: ["Video call", "In-person", "Async memo"] },
    { label: "Additional information", type: "textarea", placeholder: "Portfolio links, achievements, questions" },
];

const calendarWeeks = [
    ["", "", "", "1", "2", "3", "4"],
    ["5", "6", "7", "8", "9", "10", "11"],
    ["12", "13", "14", "15", "16", "17", "18"],
    ["19", "20", "21", "22", "23", "24", "25"],
    ["26", "27", "28", "29", "30", "", ""],
];

export default function MentorsPage() {
    return (
        <div className="min-h-dvh bg-[#F5F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2D8F80]">
                    <CheckCircle2 className="h-5 w-5" /> 1-On-1 Mentor Application
                </div>

                <section className="mt-6 grid gap-8 rounded-[36px] bg-white/95 p-6 shadow-2xl md:grid-cols-2 md:p-10">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                        <div className="flex items-center gap-3 text-sm font-semibold text-[#5DAA9C]">
                            <UserPlus className="h-5 w-5" /> New Student Mentor Signup
                        </div>
                        <p className="mt-4 text-sm text-slate-600">
                            Tell us about your background and areas where you’d like to mentor peers. We’ll match you with students across SparkHub cohorts.
                        </p>
                        <form className="mt-6 space-y-4">
                            {signupFields.map((field) => (
                                <label key={field.label} className="block text-sm font-medium text-slate-700">
                                    {field.label}
                                    {field.type === "textarea" ? (
                                        <textarea
                                            placeholder={field.placeholder}
                                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                                            rows={4}
                                        />
                                    ) : field.type === "select" ? (
                                        <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                                            <option value="">Select</option>
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                                        />
                                    )}
                                </label>
                            ))}
                            <label className="block text-sm font-medium text-slate-700">
                                Availability notes
                                <textarea
                                    placeholder="Weekly cadence, time zones"
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                                    rows={3}
                                />
                            </label>
                            <button
                                type="button"
                                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[#63C0B9] px-5 py-3 text-sm font-semibold text-white shadow-md"
                            >
                                Submit form
                            </button>
                        </form>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45 }}>
                        <div className="flex items-center gap-3 text-sm font-semibold text-[#5DAA9C]">
                            <CalendarDays className="h-5 w-5" /> 1-On-1 Mentoring Session Scheduling
                        </div>
                        <p className="mt-4 text-sm text-slate-600">
                            Choose a time to connect with mentors for a 1-on-1 session. Select your preferred coaching format and share context.
                        </p>
                        <div className="mt-6 rounded-3xl border border-slate-100 bg-[#F9FBFF] p-5">
                            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                                <div>
                                    <p>September 2025</p>
                                    <p className="text-xs text-slate-500">Pick a slot to confirm</p>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[#2D8F80]">
                                        <span className="h-2 w-2 rounded-full bg-[#2D8F80]" /> Available
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[#D97706]">
                                        <span className="h-2 w-2 rounded-full bg-[#FBBF24]" /> Key mentoring
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white">
                                <table className="w-full text-center text-sm text-slate-600">
                                    <thead className="bg-[#F4F7FB] text-xs uppercase text-slate-500">
                                        <tr>
                                            {"SMTWTFS".split("").map((day) => (
                                                <th key={day} className="px-2 py-2 font-semibold">
                                                    {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calendarWeeks.map((week, idx) => (
                                            <tr key={idx} className="divide-x divide-slate-50">
                                                {week.map((day) => (
                                                    <td key={`${idx}-${day}`} className="h-14 align-middle">
                                                        {day && (
                                                            <button
                                                                type="button"
                                                                className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E6F5F3] text-sm font-semibold text-[#2D8F80] shadow-sm"
                                                            >
                                                                {day}
                                                            </button>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 grid gap-4 text-sm text-slate-600">
                                {schedulingFields.map((field) => (
                                    <label key={field.label} className="block text-sm font-medium text-slate-700">
                                        {field.label}
                                        {field.type === "textarea" ? (
                                            <textarea
                                                placeholder={field.placeholder}
                                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                                                rows={4}
                                            />
                                        ) : field.type === "select" ? (
                                            <select className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                                                {field.options?.map((option) => (
                                                    <option key={option}>{option}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={field.type}
                                                placeholder={field.placeholder}
                                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                                            />
                                        )}
                                    </label>
                                ))}
                            </div>
                            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                                <p className="font-semibold text-slate-900">Session summary</p>
                                <p className="mt-1">1 hour · Creative prototyping · Mentor: Taylor</p>
                            </div>
                            <button
                                type="button"
                                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#63C0B9] px-5 py-3 text-sm font-semibold text-white shadow-md"
                            >
                                Submit schedule
                            </button>
                        </div>
                    </motion.div>
                </section>
            </main>
        </div>
    );
}
