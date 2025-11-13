import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SparkHub",
    description:
        "Students’ very own development center — courses, mentors, events, and opportunities.",
};

export const viewport: Viewport = {
    themeColor: "#63C0B9",
    colorScheme: "light",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    // NOTE: do NOT add "use client" in this file
    return (
        <html lang="en" suppressHydrationWarning>
        <body className="min-h-dvh bg-white text-slate-800 antialiased">
        {children}
        </body>
        </html>
    );
}