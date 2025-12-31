"use client";

import { ThemeProvider } from "@/contexts/theme-context";
import type { ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider>
            {children}
        </ThemeProvider>
    );
}
