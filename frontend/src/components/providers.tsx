"use client";

import { ThemeProvider } from "@/contexts/theme-context";
import { TimerProvider } from "@/contexts/timer-context";
import { ToastProvider } from "@/contexts/toast-context";
import AIAssistant from "@/components/ai-assistant";
import FloatingToolbox from "@/components/floating-toolbox";
import QuickNotes from "@/components/quick-notes";
import SiteFooter from "@/components/site-footer";
import SiteAnnouncementBanner from "@/components/site-announcement-banner";
import ToastContainer from "@/components/toast-container";
import type { ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider>
            <ToastProvider>
                <TimerProvider>
                    <SiteAnnouncementBanner />
                    <div className="flex flex-col min-h-screen">
                        {children}
                        <SiteFooter />
                    </div>
                    {/* Global floating components - persist across all pages */}
                    <FloatingToolbox />
                    <QuickNotes />
                    <AIAssistant />
                    <ToastContainer />
                </TimerProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
