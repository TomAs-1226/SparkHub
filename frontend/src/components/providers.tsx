"use client";

import { ThemeProvider } from "@/contexts/theme-context";
import AIAssistant from "@/components/ai-assistant";
import FloatingToolbox from "@/components/floating-toolbox";
import type { ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider>
            {children}
            {/* Global floating components - persist across all pages */}
            <FloatingToolbox />
            <AIAssistant />
        </ThemeProvider>
    );
}
