"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem("sparkhub-theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
    }
    return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        const storedTheme = getStoredTheme();
        setThemeState(storedTheme);
        setMounted(true);
    }, []);

    // Resolve the actual theme (light or dark) based on setting
    useEffect(() => {
        if (!mounted) return;

        const updateResolvedTheme = () => {
            if (theme === "system") {
                setResolvedTheme(getSystemTheme());
            } else {
                setResolvedTheme(theme);
            }
        };

        updateResolvedTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            if (theme === "system") {
                setResolvedTheme(getSystemTheme());
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme, mounted]);

    // Apply theme to document
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolvedTheme);

        // Also set color-scheme for native elements
        root.style.colorScheme = resolvedTheme;
    }, [resolvedTheme, mounted]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        if (typeof window !== "undefined") {
            localStorage.setItem("sparkhub-theme", newTheme);
        }
    }, []);

    // Always provide the context, even when not mounted
    // This prevents errors during static generation
    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Default fallback values for SSR/static generation
const defaultThemeContext: ThemeContextType = {
    theme: "system",
    resolvedTheme: "light",
    setTheme: () => {},
};

export function useTheme() {
    const context = useContext(ThemeContext);
    // Return default values during SSR if context is undefined
    if (context === undefined) {
        return defaultThemeContext;
    }
    return context;
}
