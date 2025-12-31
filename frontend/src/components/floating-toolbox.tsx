"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wrench,
    X,
    Timer,
    StickyNote,
    Calculator,
    Ruler,
    Clock,
    Target,
    Dice1,
    Volume2,
    VolumeX,
    Play,
    Pause,
    RotateCcw,
    Settings,
    Coffee,
    BookOpen,
    Plus,
    Trash2,
    Pin,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { EASE, SPRING } from "@/lib/motion-presets";

// ============== TYPES ==============
type ToolId = "timer" | "notes" | "calculator" | "stopwatch" | "goals" | "dice";
type TimerMode = "focus" | "shortBreak" | "longBreak";

interface Note {
    id: string;
    content: string;
    createdAt: Date;
    pinned: boolean;
    color: string;
}

interface Goal {
    id: string;
    text: string;
    completed: boolean;
}

// ============== CONSTANTS ==============
const TOOLS: { id: ToolId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "timer", label: "Focus Timer", icon: <Timer className="h-5 w-5" />, color: "from-[#63C0B9] to-[#2D8F80]" },
    { id: "notes", label: "Quick Notes", icon: <StickyNote className="h-5 w-5" />, color: "from-amber-400 to-orange-500" },
    { id: "stopwatch", label: "Stopwatch", icon: <Clock className="h-5 w-5" />, color: "from-blue-400 to-indigo-500" },
    { id: "calculator", label: "Calculator", icon: <Calculator className="h-5 w-5" />, color: "from-purple-400 to-pink-500" },
    { id: "goals", label: "Daily Goals", icon: <Target className="h-5 w-5" />, color: "from-emerald-400 to-teal-500" },
    { id: "dice", label: "Random Picker", icon: <Dice1 className="h-5 w-5" />, color: "from-rose-400 to-red-500" },
];

const NOTE_COLORS = [
    "bg-amber-100 dark:bg-amber-900/40",
    "bg-emerald-100 dark:bg-emerald-900/40",
    "bg-sky-100 dark:bg-sky-900/40",
    "bg-purple-100 dark:bg-purple-900/40",
    "bg-pink-100 dark:bg-pink-900/40",
];

const TIMER_MODES = {
    focus: { label: "Focus", minutes: 25, icon: BookOpen, color: "from-[#63C0B9] to-[#2D8F80]" },
    shortBreak: { label: "Short Break", minutes: 5, icon: Coffee, color: "from-amber-400 to-orange-500" },
    longBreak: { label: "Long Break", minutes: 15, icon: Timer, color: "from-purple-400 to-indigo-500" },
};

// ============== MAIN COMPONENT ==============
export default function FloatingToolbox() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<ToolId | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Floating toggle button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-900/30 ${isOpen ? "hidden" : ""}`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <Wrench className="h-6 w-6" />
            </motion.button>

            {/* Toolbox panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`fixed bottom-6 left-6 z-50 overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300 ${isCollapsed ? "w-[72px]" : "w-[380px]"}`}
                        initial={{ opacity: 0, scale: 0.9, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -20 }}
                        transition={SPRING.snappy}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 px-4 py-3">
                            {!isCollapsed && (
                                <div className="flex items-center gap-2">
                                    <Wrench className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">Toolbox</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                                <motion.button
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className="rounded-full p-1.5 text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                                </motion.button>
                                {!isCollapsed && (
                                    <motion.button
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-full p-1.5 text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <X className="h-4 w-4" />
                                    </motion.button>
                                )}
                            </div>
                        </div>

                        <div className="flex">
                            {/* Tool icons sidebar */}
                            <div className={`flex flex-col gap-1 p-2 border-r border-slate-100 dark:border-slate-700 ${isCollapsed ? "border-r-0" : ""}`}>
                                {TOOLS.map((tool) => (
                                    <motion.button
                                        key={tool.id}
                                        onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                                        className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                                            activeTool === tool.id
                                                ? `bg-gradient-to-br ${tool.color} text-white shadow-md`
                                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        }`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title={tool.label}
                                    >
                                        {tool.icon}
                                    </motion.button>
                                ))}
                            </div>

                            {/* Tool content area */}
                            {!isCollapsed && (
                                <div className="flex-1 min-h-[320px] max-h-[400px] overflow-y-auto">
                                    <AnimatePresence mode="wait">
                                        {activeTool === "timer" && <TimerTool key="timer" />}
                                        {activeTool === "notes" && <NotesTool key="notes" />}
                                        {activeTool === "stopwatch" && <StopwatchTool key="stopwatch" />}
                                        {activeTool === "calculator" && <CalculatorTool key="calculator" />}
                                        {activeTool === "goals" && <GoalsTool key="goals" />}
                                        {activeTool === "dice" && <DiceTool key="dice" />}
                                        {!activeTool && <WelcomePanel key="welcome" />}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ============== WELCOME PANEL ==============
function WelcomePanel() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center h-full p-6 text-center"
        >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mb-4">
                <Wrench className="h-8 w-8 text-slate-400 dark:text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">SparkHub Toolbox</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Select a tool from the sidebar to get started
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                {TOOLS.map((tool) => (
                    <div key={tool.id} className="flex flex-col items-center gap-1">
                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${tool.color} opacity-60 flex items-center justify-center text-white`}>
                            {tool.icon}
                        </div>
                        <span>{tool.label.split(" ")[0]}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ============== TIMER TOOL ==============
function TimerTool() {
    const [mode, setMode] = useState<TimerMode>("focus");
    const [timeLeft, setTimeLeft] = useState(TIMER_MODES.focus.minutes * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [completedSessions, setCompletedSessions] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const getModeTime = useCallback((m: TimerMode) => TIMER_MODES[m].minutes * 60, []);

    const playNotification = useCallback(() => {
        if (!soundEnabled) return;
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
    }, [soundEnabled]);

    const switchMode = useCallback((newMode: TimerMode) => {
        setMode(newMode);
        setTimeLeft(getModeTime(newMode));
        setIsRunning(false);
    }, [getModeTime]);

    useEffect(() => {
        if (!isRunning || timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    playNotification();
                    if (mode === "focus") {
                        setCompletedSessions((s) => s + 1);
                        switchMode((completedSessions + 1) % 4 === 0 ? "longBreak" : "shortBreak");
                    } else {
                        switchMode("focus");
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning, timeLeft, mode, completedSessions, playNotification, switchMode]);

    const progress = (getModeTime(mode) - timeLeft) / getModeTime(mode);
    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4"
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Focus Timer</span>
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1 mb-4">
                {(Object.keys(TIMER_MODES) as TimerMode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => switchMode(m)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                            mode === m
                                ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm"
                                : "text-slate-500 dark:text-slate-400"
                        }`}
                    >
                        {TIMER_MODES[m].label}
                    </button>
                ))}
            </div>

            {/* Timer display */}
            <div className="relative mx-auto h-36 w-36 mb-4">
                <svg className="h-full w-full -rotate-90">
                    <circle cx="72" cy="72" r="64" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                    <circle
                        cx="72" cy="72" r="64" fill="none" stroke="url(#timerGradient)" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 64} strokeDashoffset={2 * Math.PI * 64 * (1 - progress)}
                        className="transition-all duration-1000"
                    />
                    <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#63C0B9" />
                            <stop offset="100%" stopColor="#2D8F80" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{formatTime(timeLeft)}</span>
                    <span className="text-[10px] text-slate-500">Session {completedSessions + 1}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
                <button
                    onClick={() => setTimeLeft(getModeTime(mode))}
                    className="rounded-full bg-slate-100 dark:bg-slate-700 p-2.5 text-slate-600 dark:text-slate-300"
                >
                    <RotateCcw className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`rounded-full bg-gradient-to-br ${TIMER_MODES[mode].color} p-3 text-white shadow-lg`}
                >
                    {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
            </div>

            {/* Session dots */}
            <div className="mt-4 flex justify-center gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`h-2 w-2 rounded-full ${i < completedSessions % 4 ? "bg-[#63C0B9]" : "bg-slate-200 dark:bg-slate-600"}`} />
                ))}
            </div>
        </motion.div>
    );
}

// ============== NOTES TOOL ==============
function NotesTool() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState("");
    const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("sparkhub-toolbox-notes");
            if (saved) setNotes(JSON.parse(saved).map((n: Note) => ({ ...n, createdAt: new Date(n.createdAt) })));
        } catch {}
    }, []);

    useEffect(() => {
        try { localStorage.setItem("sparkhub-toolbox-notes", JSON.stringify(notes)); } catch {}
    }, [notes]);

    const addNote = () => {
        if (!newNote.trim()) return;
        setNotes([{ id: `n-${Date.now()}`, content: newNote.trim(), createdAt: new Date(), pinned: false, color: selectedColor }, ...notes]);
        setNewNote("");
    };

    const sortedNotes = [...notes].sort((a, b) => (a.pinned === b.pinned ? b.createdAt.getTime() - a.createdAt.getTime() : a.pinned ? -1 : 1));

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quick Notes</span>

            <div className="mt-3">
                <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a note..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:border-amber-400"
                    rows={2}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
                />
                <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                        {NOTE_COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setSelectedColor(c)}
                                className={`h-5 w-5 rounded-full ${c.split(" ")[0]} ${selectedColor === c ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                            />
                        ))}
                    </div>
                    <button onClick={addNote} disabled={!newNote.trim()} className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
                        <Plus className="h-3 w-3" /> Add
                    </button>
                </div>
            </div>

            <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto">
                {sortedNotes.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">No notes yet</p>
                ) : sortedNotes.map((note) => (
                    <div key={note.id} className={`group relative rounded-xl p-2.5 ${note.color} border border-transparent`}>
                        {note.pinned && <Pin className="absolute -right-1 -top-1 h-3 w-3 rotate-45 text-amber-600" />}
                        <p className="text-xs text-slate-700 dark:text-slate-200 pr-8">{note.content}</p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className="text-[9px] text-slate-500">{formatRelativeTime(note.createdAt)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => setNotes(notes.map((n) => n.id === note.id ? { ...n, pinned: !n.pinned } : n))} className="p-0.5 text-slate-400 hover:text-amber-600">
                                    <Pin className="h-3 w-3" />
                                </button>
                                <button onClick={() => setNotes(notes.filter((n) => n.id !== note.id))} className="p-0.5 text-slate-400 hover:text-red-500">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ============== STOPWATCH TOOL ==============
function StopwatchTool() {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => setTime((t) => t + 10), 10);
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const centis = Math.floor((ms % 1000) / 10);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Stopwatch</span>

            <div className="mt-6 text-center">
                <span className="text-3xl font-mono font-bold text-slate-800 dark:text-white">{formatTime(time)}</span>
            </div>

            <div className="mt-6 flex justify-center gap-3">
                <button onClick={() => { setTime(0); setLaps([]); setIsRunning(false); }} className="rounded-full bg-slate-100 dark:bg-slate-700 p-2.5 text-slate-600 dark:text-slate-300">
                    <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => setIsRunning(!isRunning)} className="rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 p-3 text-white shadow-lg">
                    {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button onClick={() => isRunning && setLaps([time, ...laps])} disabled={!isRunning} className="rounded-full bg-slate-100 dark:bg-slate-700 p-2.5 text-slate-600 dark:text-slate-300 disabled:opacity-50">
                    <Clock className="h-4 w-4" />
                </button>
            </div>

            {laps.length > 0 && (
                <div className="mt-4 max-h-[100px] overflow-y-auto space-y-1">
                    {laps.map((lap, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-400 px-2 py-1 rounded bg-slate-50 dark:bg-slate-700">
                            <span>Lap {laps.length - i}</span>
                            <span className="font-mono">{formatTime(lap)}</span>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// ============== CALCULATOR TOOL ==============
function CalculatorTool() {
    const [display, setDisplay] = useState("0");
    const [prev, setPrev] = useState<number | null>(null);
    const [op, setOp] = useState<string | null>(null);
    const [newNumber, setNewNumber] = useState(true);

    const handleNumber = (n: string) => {
        if (newNumber) { setDisplay(n); setNewNumber(false); }
        else setDisplay(display === "0" ? n : display + n);
    };

    const handleOp = (newOp: string) => {
        if (prev !== null && op && !newNumber) {
            const result = calculate(prev, parseFloat(display), op);
            setDisplay(String(result));
            setPrev(result);
        } else {
            setPrev(parseFloat(display));
        }
        setOp(newOp);
        setNewNumber(true);
    };

    const handleEquals = () => {
        if (prev === null || op === null) return;
        const result = calculate(prev, parseFloat(display), op);
        setDisplay(String(result));
        setPrev(null);
        setOp(null);
        setNewNumber(true);
    };

    const calculate = (a: number, b: number, operation: string) => {
        switch (operation) {
            case "+": return a + b;
            case "-": return a - b;
            case "×": return a * b;
            case "÷": return b !== 0 ? a / b : 0;
            default: return b;
        }
    };

    const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setNewNumber(true); };

    const buttons = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "=", "+"];

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Calculator</span>

            <div className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-700 p-3 text-right">
                <span className="text-2xl font-mono font-bold text-slate-800 dark:text-white">{display}</span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5">
                <button onClick={clear} className="col-span-2 rounded-xl bg-red-100 dark:bg-red-900/40 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400">
                    Clear
                </button>
                <button onClick={() => setDisplay(display.slice(0, -1) || "0")} className="col-span-2 rounded-xl bg-slate-100 dark:bg-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    ⌫
                </button>
                {buttons.map((btn) => (
                    <button
                        key={btn}
                        onClick={() => {
                            if ("0123456789.".includes(btn)) handleNumber(btn);
                            else if ("+-×÷".includes(btn)) handleOp(btn);
                            else if (btn === "=") handleEquals();
                        }}
                        className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                            "+-×÷=".includes(btn)
                                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                    >
                        {btn}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

// ============== GOALS TOOL ==============
function GoalsTool() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [newGoal, setNewGoal] = useState("");

    useEffect(() => {
        try {
            const saved = localStorage.getItem("sparkhub-toolbox-goals");
            if (saved) setGoals(JSON.parse(saved));
        } catch {}
    }, []);

    useEffect(() => {
        try { localStorage.setItem("sparkhub-toolbox-goals", JSON.stringify(goals)); } catch {}
    }, [goals]);

    const addGoal = () => {
        if (!newGoal.trim()) return;
        setGoals([...goals, { id: `g-${Date.now()}`, text: newGoal.trim(), completed: false }]);
        setNewGoal("");
    };

    const completedCount = goals.filter((g) => g.completed).length;
    const progress = goals.length > 0 ? (completedCount / goals.length) * 100 : 0;

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Daily Goals</span>
                <span className="text-xs text-slate-500">{completedCount}/{goals.length}</span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <div className="mt-3 flex gap-2">
                <input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Add a goal..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                    onKeyDown={(e) => e.key === "Enter" && addGoal()}
                />
                <button onClick={addGoal} disabled={!newGoal.trim()} className="rounded-xl bg-emerald-500 px-3 text-white disabled:opacity-50">
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-3 space-y-1.5 max-h-[180px] overflow-y-auto">
                {goals.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">No goals yet</p>
                ) : goals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2">
                        <button
                            onClick={() => setGoals(goals.map((g) => g.id === goal.id ? { ...g, completed: !g.completed } : g))}
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
                                goal.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-500"
                            }`}
                        >
                            {goal.completed && <span className="text-xs">✓</span>}
                        </button>
                        <span className={`flex-1 text-sm ${goal.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                            {goal.text}
                        </span>
                        <button onClick={() => setGoals(goals.filter((g) => g.id !== goal.id))} className="p-0.5 text-slate-400 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ============== DICE TOOL ==============
function DiceTool() {
    const [result, setResult] = useState<number | null>(null);
    const [rolling, setRolling] = useState(false);
    const [history, setHistory] = useState<number[]>([]);
    const [diceType, setDiceType] = useState(6);

    const roll = () => {
        setRolling(true);
        let count = 0;
        const interval = setInterval(() => {
            setResult(Math.floor(Math.random() * diceType) + 1);
            count++;
            if (count > 10) {
                clearInterval(interval);
                const final = Math.floor(Math.random() * diceType) + 1;
                setResult(final);
                setHistory([final, ...history.slice(0, 9)]);
                setRolling(false);
            }
        }, 50);
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Random Picker</span>

            {/* Dice type selector */}
            <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
                {[6, 10, 20, 100].map((d) => (
                    <button
                        key={d}
                        onClick={() => setDiceType(d)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                            diceType === d ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm" : "text-slate-500"
                        }`}
                    >
                        D{d}
                    </button>
                ))}
            </div>

            {/* Result display */}
            <motion.div
                className="mt-6 flex items-center justify-center"
                animate={rolling ? { rotate: [0, 10, -10, 5, -5, 0] } : {}}
                transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
            >
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-bold text-white">{result ?? "?"}</span>
                </div>
            </motion.div>

            <div className="mt-6 flex justify-center">
                <button onClick={roll} disabled={rolling} className="rounded-full bg-gradient-to-br from-rose-400 to-red-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-70">
                    {rolling ? "Rolling..." : "Roll"}
                </button>
            </div>

            {history.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1">
                    {history.map((h, i) => (
                        <span key={i} className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                            {h}
                        </span>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// ============== HELPERS ==============
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
}
