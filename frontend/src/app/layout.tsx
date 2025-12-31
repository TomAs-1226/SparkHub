import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers";

export const metadata: Metadata = {
    title: "SparkHub",
    description:
        "Students' very own development center — courses, mentors, events, and opportunities.",
};

export const viewport: Viewport = {
    themeColor: "#63C0B9",
    colorScheme: "light dark",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    // NOTE: do NOT add "use client" in this file
    return (
        <html lang="en" suppressHydrationWarning>
        <body className="min-h-dvh bg-white text-slate-800 antialiased dark:bg-slate-900 dark:text-slate-100">
        <Providers>
            {children}
        </Providers>
        </body>
        </html>
    );
}
