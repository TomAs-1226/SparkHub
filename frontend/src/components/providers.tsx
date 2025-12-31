"use client";

import { ThemeProvider } from "@/contexts/theme-context";
import AIAssistant from "@/components/ai-assistant";
import StudyTimer from "@/components/study-timer";
import QuickNotes from "@/components/quick-notes";
import type { ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider>
            {children}
            {/* Global floating components - persist across all pages */}
            <StudyTimer />
            <QuickNotes />
            <AIAssistant />
        </ThemeProvider>
    );
}
