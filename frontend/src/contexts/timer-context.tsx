"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export type TimerMode = "focus" | "shortBreak" | "longBreak";

export const TIMER_MODES = {
    focus: { label: "Focus", minutes: 25, color: "from-[#63C0B9] to-[#2D8F80]" },
    shortBreak: { label: "Short Break", minutes: 5, color: "from-amber-400 to-orange-500" },
    longBreak: { label: "Long Break", minutes: 15, color: "from-purple-400 to-indigo-500" },
} as const;

const STORAGE_KEY = "sparkhub-timer-state";

interface TimerState {
    mode: TimerMode;
    timeLeft: number;
    isRunning: boolean;
    completedSessions: number;
    soundEnabled: boolean;
}

interface TimerContextValue extends TimerState {
    switchMode: (mode: TimerMode) => void;
    toggleRunning: () => void;
    reset: () => void;
    toggleSound: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<TimerState>(() => {
        // Restore from localStorage on mount
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved) as TimerState;
                    return {
                        ...parsed,
                        isRunning: false, // never auto-start on page load
                    };
                }
            } catch {}
        }
        return {
            mode: "focus",
            timeLeft: TIMER_MODES.focus.minutes * 60,
            isRunning: false,
            completedSessions: 0,
            soundEnabled: true,
        };
    });

    // Persist to localStorage whenever state changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {}
    }, [state]);

    const playNotification = useCallback(() => {
        if (!state.soundEnabled) return;
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch {}
    }, [state.soundEnabled]);

    // Tick
    useEffect(() => {
        if (!state.isRunning || state.timeLeft <= 0) return;
        const id = setInterval(() => {
            setState((prev) => {
                if (prev.timeLeft <= 1) {
                    // Session complete — auto-advance mode
                    playNotification();
                    const newSessions =
                        prev.mode === "focus" ? prev.completedSessions + 1 : prev.completedSessions;
                    const nextMode: TimerMode =
                        prev.mode === "focus"
                            ? (newSessions % 4 === 0 ? "longBreak" : "shortBreak")
                            : "focus";
                    return {
                        ...prev,
                        mode: nextMode,
                        timeLeft: TIMER_MODES[nextMode].minutes * 60,
                        isRunning: false,
                        completedSessions: newSessions,
                    };
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);
        return () => clearInterval(id);
    }, [state.isRunning, state.timeLeft, playNotification]);

    const switchMode = useCallback((mode: TimerMode) => {
        setState((prev) => ({
            ...prev,
            mode,
            timeLeft: TIMER_MODES[mode].minutes * 60,
            isRunning: false,
        }));
    }, []);

    const toggleRunning = useCallback(() => {
        setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
    }, []);

    const reset = useCallback(() => {
        setState((prev) => ({
            ...prev,
            timeLeft: TIMER_MODES[prev.mode].minutes * 60,
            isRunning: false,
        }));
    }, []);

    const toggleSound = useCallback(() => {
        setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
    }, []);

    return (
        <TimerContext.Provider value={{ ...state, switchMode, toggleRunning, reset, toggleSound }}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const ctx = useContext(TimerContext);
    if (!ctx) throw new Error("useTimer must be used within TimerProvider");
    return ctx;
}
