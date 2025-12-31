"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    RotateCcw,
    Settings,
    X,
    Coffee,
    BookOpen,
    Timer,
    Volume2,
    VolumeX,
} from "lucide-react";

type TimerMode = "focus" | "shortBreak" | "longBreak";

interface TimerSettings {
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    sessionsUntilLongBreak: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4,
};

const MODE_CONFIG = {
    focus: {
        label: "Focus Time",
        icon: BookOpen,
        color: "from-[#63C0B9] to-[#2D8F80]",
        bgColor: "bg-[#E7F6F3] dark:bg-slate-700",
    },
    shortBreak: {
        label: "Short Break",
        icon: Coffee,
        color: "from-amber-400 to-orange-500",
        bgColor: "bg-amber-50 dark:bg-slate-700",
    },
    longBreak: {
        label: "Long Break",
        icon: Timer,
        color: "from-purple-400 to-indigo-500",
        bgColor: "bg-purple-50 dark:bg-slate-700",
    },
};

export default function StudyTimer() {
    const [isOpen, setIsOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<TimerMode>("focus");
    const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focusMinutes * 60);
    const [completedSessions, setCompletedSessions] = useState(0);
    const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
    const [showSettings, setShowSettings] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const getModeTime = useCallback(
        (m: TimerMode) => {
            switch (m) {
                case "focus":
                    return settings.focusMinutes * 60;
                case "shortBreak":
                    return settings.shortBreakMinutes * 60;
                case "longBreak":
                    return settings.longBreakMinutes * 60;
            }
        },
        [settings]
    );

    const playNotification = useCallback(() => {
        if (!soundEnabled) return;
        // Simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch {
            // Audio not supported
        }
    }, [soundEnabled]);

    const switchMode = useCallback(
        (newMode: TimerMode) => {
            setMode(newMode);
            setTimeLeft(getModeTime(newMode));
            setIsRunning(false);
        },
        [getModeTime]
    );

    const handleTimerComplete = useCallback(() => {
        playNotification();

        if (mode === "focus") {
            const newCompletedSessions = completedSessions + 1;
            setCompletedSessions(newCompletedSessions);

            if (newCompletedSessions % settings.sessionsUntilLongBreak === 0) {
                switchMode("longBreak");
            } else {
                switchMode("shortBreak");
            }
        } else {
            switchMode("focus");
        }
    }, [mode, completedSessions, settings.sessionsUntilLongBreak, playNotification, switchMode]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTimerComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft, handleTimerComplete]);

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(getModeTime(mode));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = (getModeTime(mode) - timeLeft) / getModeTime(mode);
    const config = MODE_CONFIG[mode];
    const Icon = config.icon;

    return (
        <>
            {/* Floating timer button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${config.color} text-white shadow-lg ${isOpen ? "hidden" : ""}`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                {isRunning ? (
                    <span className="text-sm font-bold">{formatTime(timeLeft)}</span>
                ) : (
                    <Timer className="h-6 w-6" />
                )}
            </motion.button>

            {/* Timer panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed bottom-6 left-6 z-40 w-[320px] overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between px-4 py-3 ${config.bgColor}`}>
                            <div className="flex items-center gap-2">
                                <Icon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{config.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    className="rounded-full p-1.5 text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                </motion.button>
                                <motion.button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="rounded-full p-1.5 text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Settings className="h-4 w-4" />
                                </motion.button>
                                <motion.button
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-full p-1.5 text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="h-4 w-4" />
                                </motion.button>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {showSettings ? (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="p-4 space-y-4"
                                >
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Focus Duration (min)</label>
                                        <input
                                            type="number"
                                            value={settings.focusMinutes}
                                            onChange={(e) => setSettings({ ...settings, focusMinutes: Math.max(1, parseInt(e.target.value) || 25) })}
                                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-100"
                                            min="1"
                                            max="120"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Short Break (min)</label>
                                        <input
                                            type="number"
                                            value={settings.shortBreakMinutes}
                                            onChange={(e) => setSettings({ ...settings, shortBreakMinutes: Math.max(1, parseInt(e.target.value) || 5) })}
                                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-100"
                                            min="1"
                                            max="30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Long Break (min)</label>
                                        <input
                                            type="number"
                                            value={settings.longBreakMinutes}
                                            onChange={(e) => setSettings({ ...settings, longBreakMinutes: Math.max(1, parseInt(e.target.value) || 15) })}
                                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-100"
                                            min="1"
                                            max="60"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sessions until Long Break</label>
                                        <input
                                            type="number"
                                            value={settings.sessionsUntilLongBreak}
                                            onChange={(e) => setSettings({ ...settings, sessionsUntilLongBreak: Math.max(1, parseInt(e.target.value) || 4) })}
                                            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm dark:text-slate-100"
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowSettings(false);
                                            resetTimer();
                                        }}
                                        className="w-full rounded-xl bg-[#63C0B9] py-2 text-sm font-semibold text-white"
                                    >
                                        Apply Changes
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="timer"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-4"
                                >
                                    {/* Mode selector */}
                                    <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
                                        {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => switchMode(m)}
                                                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                                                    mode === m
                                                        ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                }`}
                                            >
                                                {m === "focus" ? "Focus" : m === "shortBreak" ? "Short" : "Long"}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Timer display */}
                                    <div className="relative mx-auto h-40 w-40">
                                        <svg className="h-full w-full -rotate-90 transform">
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                className="text-slate-100 dark:text-slate-700"
                                            />
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                fill="none"
                                                stroke="url(#gradient)"
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 70}
                                                strokeDashoffset={2 * Math.PI * 70 * (1 - progress)}
                                                className="transition-all duration-1000"
                                            />
                                            <defs>
                                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#63C0B9" />
                                                    <stop offset="100%" stopColor="#2D8F80" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                                                {formatTime(timeLeft)}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                Session {completedSessions + 1}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="mt-4 flex justify-center gap-3">
                                        <motion.button
                                            onClick={resetTimer}
                                            className="rounded-full bg-slate-100 dark:bg-slate-700 p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <RotateCcw className="h-5 w-5" />
                                        </motion.button>
                                        <motion.button
                                            onClick={() => setIsRunning(!isRunning)}
                                            className={`rounded-full bg-gradient-to-br ${config.color} p-4 text-white shadow-lg`}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                                        </motion.button>
                                    </div>

                                    {/* Session counter */}
                                    <div className="mt-4 flex justify-center gap-1">
                                        {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-2 w-2 rounded-full ${
                                                    i < completedSessions % settings.sessionsUntilLongBreak
                                                        ? "bg-[#63C0B9]"
                                                        : "bg-slate-200 dark:bg-slate-600"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
