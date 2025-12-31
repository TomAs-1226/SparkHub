"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wrench,
    X,
    Timer,
    StickyNote,
    Calculator,
    FlaskConical,
    GraduationCap,
    Layers,
    Volume2,
    VolumeX,
    Play,
    Pause,
    RotateCcw,
    Coffee,
    BookOpen,
    Plus,
    Trash2,
    Pin,
    ChevronLeft,
    ChevronRight,
    ArrowRightLeft,
    Shuffle,
    Check,
    ChevronDown,
} from "lucide-react";
import { EASE, SPRING } from "@/lib/motion-presets";

// ============== TYPES ==============
type ToolId = "timer" | "notes" | "graphing" | "converter" | "flashcards" | "grades";
type TimerMode = "focus" | "shortBreak" | "longBreak";

interface Note {
    id: string;
    content: string;
    createdAt: Date;
    pinned: boolean;
    color: string;
}

interface Flashcard {
    id: string;
    front: string;
    back: string;
}

interface GradeItem {
    id: string;
    name: string;
    score: number;
    maxScore: number;
    weight: number;
}

// ============== CONSTANTS ==============
const TOOLS: { id: ToolId; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    { id: "timer", label: "Focus Timer", icon: <Timer className="h-5 w-5" />, color: "from-[#63C0B9] to-[#2D8F80]", desc: "Pomodoro technique" },
    { id: "notes", label: "Quick Notes", icon: <StickyNote className="h-5 w-5" />, color: "from-amber-400 to-orange-500", desc: "Capture ideas" },
    { id: "graphing", label: "Graphing", icon: <Calculator className="h-5 w-5" />, color: "from-green-500 to-emerald-600", desc: "Desmos calculator" },
    { id: "converter", label: "Unit Converter", icon: <FlaskConical className="h-5 w-5" />, color: "from-blue-400 to-indigo-500", desc: "Convert units" },
    { id: "flashcards", label: "Flashcards", icon: <Layers className="h-5 w-5" />, color: "from-purple-400 to-pink-500", desc: "Study & memorize" },
    { id: "grades", label: "Grade Calc", icon: <GraduationCap className="h-5 w-5" />, color: "from-rose-400 to-red-500", desc: "Calculate grades" },
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

// Unit conversion data
const UNIT_CATEGORIES = {
    length: {
        name: "Length",
        units: {
            m: { name: "Meters", factor: 1 },
            km: { name: "Kilometers", factor: 1000 },
            cm: { name: "Centimeters", factor: 0.01 },
            mm: { name: "Millimeters", factor: 0.001 },
            mi: { name: "Miles", factor: 1609.344 },
            ft: { name: "Feet", factor: 0.3048 },
            in: { name: "Inches", factor: 0.0254 },
            yd: { name: "Yards", factor: 0.9144 },
        },
    },
    mass: {
        name: "Mass",
        units: {
            kg: { name: "Kilograms", factor: 1 },
            g: { name: "Grams", factor: 0.001 },
            mg: { name: "Milligrams", factor: 0.000001 },
            lb: { name: "Pounds", factor: 0.453592 },
            oz: { name: "Ounces", factor: 0.0283495 },
        },
    },
    temperature: {
        name: "Temperature",
        units: {
            c: { name: "Celsius", factor: 1 },
            f: { name: "Fahrenheit", factor: 1 },
            k: { name: "Kelvin", factor: 1 },
        },
    },
    volume: {
        name: "Volume",
        units: {
            l: { name: "Liters", factor: 1 },
            ml: { name: "Milliliters", factor: 0.001 },
            gal: { name: "Gallons (US)", factor: 3.78541 },
            qt: { name: "Quarts", factor: 0.946353 },
            cup: { name: "Cups", factor: 0.236588 },
        },
    },
    time: {
        name: "Time",
        units: {
            s: { name: "Seconds", factor: 1 },
            min: { name: "Minutes", factor: 60 },
            hr: { name: "Hours", factor: 3600 },
            day: { name: "Days", factor: 86400 },
            wk: { name: "Weeks", factor: 604800 },
        },
    },
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
                        className={`fixed bottom-6 left-6 z-50 overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300 ${isCollapsed ? "w-[72px]" : "w-[420px]"}`}
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
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">Student Toolbox</span>
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
                                <div className="flex-1 min-h-[360px] max-h-[440px] overflow-y-auto">
                                    <AnimatePresence mode="wait">
                                        {activeTool === "timer" && <TimerTool key="timer" />}
                                        {activeTool === "notes" && <NotesTool key="notes" />}
                                        {activeTool === "graphing" && <GraphingTool key="graphing" />}
                                        {activeTool === "converter" && <ConverterTool key="converter" />}
                                        {activeTool === "flashcards" && <FlashcardsTool key="flashcards" />}
                                        {activeTool === "grades" && <GradesTool key="grades" />}
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
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Student Toolbox</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Tools to help you study smarter
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] w-full max-w-[280px]">
                {TOOLS.map((tool) => (
                    <div key={tool.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center text-white`}>
                            {tool.icon}
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-slate-700 dark:text-slate-200">{tool.label}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-[10px]">{tool.desc}</p>
                        </div>
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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Focus Timer</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
            </div>

            <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1 mb-4">
                {(Object.keys(TIMER_MODES) as TimerMode[]).map((m) => (
                    <button key={m} onClick={() => switchMode(m)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${mode === m ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm" : "text-slate-500"}`}>
                        {TIMER_MODES[m].label}
                    </button>
                ))}
            </div>

            <div className="relative mx-auto h-36 w-36 mb-4">
                <svg className="h-full w-full -rotate-90">
                    <circle cx="72" cy="72" r="64" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                    <circle cx="72" cy="72" r="64" fill="none" stroke="url(#timerGradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 64} strokeDashoffset={2 * Math.PI * 64 * (1 - progress)} className="transition-all duration-1000" />
                    <defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#63C0B9" /><stop offset="100%" stopColor="#2D8F80" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{formatTime(timeLeft)}</span>
                    <span className="text-[10px] text-slate-500">Session {completedSessions + 1}</span>
                </div>
            </div>

            <div className="flex justify-center gap-3">
                <button onClick={() => setTimeLeft(getModeTime(mode))} className="rounded-full bg-slate-100 dark:bg-slate-700 p-2.5 text-slate-600 dark:text-slate-300"><RotateCcw className="h-4 w-4" /></button>
                <button onClick={() => setIsRunning(!isRunning)} className={`rounded-full bg-gradient-to-br ${TIMER_MODES[mode].color} p-3 text-white shadow-lg`}>{isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
            </div>

            <div className="mt-4 flex justify-center gap-1">
                {Array.from({ length: 4 }).map((_, i) => (<div key={i} className={`h-2 w-2 rounded-full ${i < completedSessions % 4 ? "bg-[#63C0B9]" : "bg-slate-200 dark:bg-slate-600"}`} />))}
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
        try { const saved = localStorage.getItem("sparkhub-toolbox-notes"); if (saved) setNotes(JSON.parse(saved).map((n: Note) => ({ ...n, createdAt: new Date(n.createdAt) }))); } catch {}
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
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write a note..." className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:border-amber-400" rows={2} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }} />
                <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">{NOTE_COLORS.map((c) => (<button key={c} onClick={() => setSelectedColor(c)} className={`h-5 w-5 rounded-full ${c.split(" ")[0]} ${selectedColor === c ? "ring-2 ring-amber-400 ring-offset-1" : ""}`} />))}</div>
                    <button onClick={addNote} disabled={!newNote.trim()} className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"><Plus className="h-3 w-3" /> Add</button>
                </div>
            </div>
            <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
                {sortedNotes.length === 0 ? (<p className="text-center text-xs text-slate-400 py-4">No notes yet</p>) : sortedNotes.map((note) => (
                    <div key={note.id} className={`group relative rounded-xl p-2.5 ${note.color} border border-transparent`}>
                        {note.pinned && <Pin className="absolute -right-1 -top-1 h-3 w-3 rotate-45 text-amber-600" />}
                        <p className="text-xs text-slate-700 dark:text-slate-200 pr-8">{note.content}</p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className="text-[9px] text-slate-500">{formatRelativeTime(note.createdAt)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => setNotes(notes.map((n) => n.id === note.id ? { ...n, pinned: !n.pinned } : n))} className="p-0.5 text-slate-400 hover:text-amber-600"><Pin className="h-3 w-3" /></button>
                                <button onClick={() => setNotes(notes.filter((n) => n.id !== note.id))} className="p-0.5 text-slate-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// ============== GRAPHING CALCULATOR (DESMOS) ==============
function GraphingTool() {
    const [showFullscreen, setShowFullscreen] = useState(false);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Graphing Calculator</span>
                <span className="text-[10px] text-slate-400">Powered by Desmos</span>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-white">
                <iframe
                    src="https://www.desmos.com/calculator"
                    className="w-full h-[280px]"
                    title="Desmos Graphing Calculator"
                    allowFullScreen
                />
            </div>

            <div className="mt-3 flex gap-2">
                <a
                    href="https://www.desmos.com/calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-xl bg-green-500 py-2 text-center text-xs font-semibold text-white"
                >
                    Open Full Calculator
                </a>
                <a
                    href="https://www.desmos.com/scientific"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                    Scientific Mode
                </a>
            </div>

            <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 text-center">
                Graph equations, plot data, evaluate functions, explore transformations, and more!
            </p>
        </motion.div>
    );
}

// ============== UNIT CONVERTER ==============
function ConverterTool() {
    const [category, setCategory] = useState<keyof typeof UNIT_CATEGORIES>("length");
    const [fromUnit, setFromUnit] = useState("m");
    const [toUnit, setToUnit] = useState("ft");
    const [fromValue, setFromValue] = useState("1");
    const [result, setResult] = useState("");

    const currentCategory = UNIT_CATEGORIES[category];
    const units = Object.entries(currentCategory.units);

    useEffect(() => {
        const firstUnit = Object.keys(currentCategory.units)[0];
        const secondUnit = Object.keys(currentCategory.units)[1] || firstUnit;
        setFromUnit(firstUnit);
        setToUnit(secondUnit);
    }, [category, currentCategory.units]);

    useEffect(() => {
        const value = parseFloat(fromValue);
        if (isNaN(value)) { setResult(""); return; }

        if (category === "temperature") {
            let celsius: number;
            if (fromUnit === "c") celsius = value;
            else if (fromUnit === "f") celsius = (value - 32) * 5/9;
            else celsius = value - 273.15;

            let converted: number;
            if (toUnit === "c") converted = celsius;
            else if (toUnit === "f") converted = celsius * 9/5 + 32;
            else converted = celsius + 273.15;

            setResult(converted.toFixed(4).replace(/\.?0+$/, ""));
        } else {
            const fromFactor = (currentCategory.units as Record<string, { factor: number }>)[fromUnit]?.factor || 1;
            const toFactor = (currentCategory.units as Record<string, { factor: number }>)[toUnit]?.factor || 1;
            const baseValue = value * fromFactor;
            const converted = baseValue / toFactor;
            setResult(converted.toFixed(6).replace(/\.?0+$/, ""));
        }
    }, [fromValue, fromUnit, toUnit, category, currentCategory.units]);

    const swapUnits = () => {
        setFromUnit(toUnit);
        setToUnit(fromUnit);
        setFromValue(result);
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Unit Converter</span>

            {/* Category selector */}
            <div className="mt-3 flex flex-wrap gap-1">
                {Object.entries(UNIT_CATEGORIES).map(([key, cat]) => (
                    <button
                        key={key}
                        onClick={() => setCategory(key as keyof typeof UNIT_CATEGORIES)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${category === key ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* From input */}
            <div className="mt-4">
                <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">From</label>
                <div className="mt-1 flex gap-2">
                    <input
                        type="number"
                        value={fromValue}
                        onChange={(e) => setFromValue(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-blue-400"
                        placeholder="Enter value"
                    />
                    <select
                        value={fromUnit}
                        onChange={(e) => setFromUnit(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                        {units.map(([key, unit]) => (<option key={key} value={key}>{unit.name}</option>))}
                    </select>
                </div>
            </div>

            {/* Swap button */}
            <div className="my-2 flex justify-center">
                <button onClick={swapUnits} className="rounded-full bg-slate-100 dark:bg-slate-700 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600">
                    <ArrowRightLeft className="h-4 w-4" />
                </button>
            </div>

            {/* To input */}
            <div>
                <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">To</label>
                <div className="mt-1 flex gap-2">
                    <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-white">
                        {result || "—"}
                    </div>
                    <select
                        value={toUnit}
                        onChange={(e) => setToUnit(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                        {units.map(([key, unit]) => (<option key={key} value={key}>{unit.name}</option>))}
                    </select>
                </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
                {fromValue && result ? `${fromValue} ${(currentCategory.units as Record<string, { name: string }>)[fromUnit]?.name} = ${result} ${(currentCategory.units as Record<string, { name: string }>)[toUnit]?.name}` : "Enter a value to convert"}
            </p>
        </motion.div>
    );
}

// ============== FLASHCARDS TOOL ==============
function FlashcardsTool() {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newFront, setNewFront] = useState("");
    const [newBack, setNewBack] = useState("");

    useEffect(() => {
        try { const saved = localStorage.getItem("sparkhub-flashcards"); if (saved) setCards(JSON.parse(saved)); } catch {}
    }, []);

    useEffect(() => {
        try { localStorage.setItem("sparkhub-flashcards", JSON.stringify(cards)); } catch {}
    }, [cards]);

    const addCard = () => {
        if (!newFront.trim() || !newBack.trim()) return;
        setCards([...cards, { id: `fc-${Date.now()}`, front: newFront.trim(), back: newBack.trim() }]);
        setNewFront("");
        setNewBack("");
        setIsAdding(false);
    };

    const deleteCard = (id: string) => {
        setCards(cards.filter((c) => c.id !== id));
        if (currentIndex >= cards.length - 1) setCurrentIndex(Math.max(0, cards.length - 2));
    };

    const shuffle = () => {
        setCards([...cards].sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    const next = () => { setCurrentIndex((i) => (i + 1) % cards.length); setIsFlipped(false); };
    const prev = () => { setCurrentIndex((i) => (i - 1 + cards.length) % cards.length); setIsFlipped(false); };

    const currentCard = cards[currentIndex];

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Flashcards</span>
                <div className="flex gap-1">
                    {cards.length > 1 && (
                        <button onClick={shuffle} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" title="Shuffle">
                            <Shuffle className="h-4 w-4" />
                        </button>
                    )}
                    <button onClick={() => setIsAdding(!isAdding)} className={`p-1.5 rounded-full ${isAdding ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {isAdding ? (
                <div className="space-y-2">
                    <input value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="Front (question)" className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-400" />
                    <input value={newBack} onChange={(e) => setNewBack(e.target.value)} placeholder="Back (answer)" className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-400" onKeyDown={(e) => e.key === "Enter" && addCard()} />
                    <div className="flex gap-2">
                        <button onClick={() => setIsAdding(false)} className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-700 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
                        <button onClick={addCard} disabled={!newFront.trim() || !newBack.trim()} className="flex-1 rounded-xl bg-purple-500 py-2 text-xs font-semibold text-white disabled:opacity-50">Add Card</button>
                    </div>
                </div>
            ) : cards.length === 0 ? (
                <div className="text-center py-8">
                    <Layers className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No flashcards yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Click + to create your first card</p>
                </div>
            ) : (
                <>
                    {/* Card display */}
                    <motion.div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="relative h-[160px] rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 p-4 cursor-pointer flex items-center justify-center text-center shadow-lg"
                        whileTap={{ scale: 0.98 }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isFlipped ? "back" : "front"}
                                initial={{ opacity: 0, rotateY: 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                exit={{ opacity: 0, rotateY: -90 }}
                                transition={{ duration: 0.2 }}
                                className="w-full"
                            >
                                <p className="text-[10px] uppercase tracking-wide text-purple-600 dark:text-purple-400 mb-2">
                                    {isFlipped ? "Answer" : "Question"}
                                </p>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {isFlipped ? currentCard.back : currentCard.front}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                        <button onClick={(e) => { e.stopPropagation(); deleteCard(currentCard.id); }} className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-white/50">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </motion.div>

                    {/* Navigation */}
                    <div className="mt-4 flex items-center justify-between">
                        <button onClick={prev} className="rounded-full bg-slate-100 dark:bg-slate-700 p-2 text-slate-600 dark:text-slate-300">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-slate-500">{currentIndex + 1} / {cards.length}</span>
                        <button onClick={next} className="rounded-full bg-slate-100 dark:bg-slate-700 p-2 text-slate-600 dark:text-slate-300">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-slate-400">Click card to flip</p>
                </>
            )}
        </motion.div>
    );
}

// ============== GRADE CALCULATOR ==============
function GradesTool() {
    const [items, setItems] = useState<GradeItem[]>([]);
    const [newName, setNewName] = useState("");
    const [newScore, setNewScore] = useState("");
    const [newMax, setNewMax] = useState("100");
    const [newWeight, setNewWeight] = useState("");

    useEffect(() => {
        try { const saved = localStorage.getItem("sparkhub-grades"); if (saved) setItems(JSON.parse(saved)); } catch {}
    }, []);

    useEffect(() => {
        try { localStorage.setItem("sparkhub-grades", JSON.stringify(items)); } catch {}
    }, [items]);

    const addItem = () => {
        if (!newName.trim() || !newScore || !newWeight) return;
        setItems([...items, {
            id: `g-${Date.now()}`,
            name: newName.trim(),
            score: parseFloat(newScore),
            maxScore: parseFloat(newMax) || 100,
            weight: parseFloat(newWeight),
        }]);
        setNewName("");
        setNewScore("");
        setNewWeight("");
    };

    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    const weightedGrade = items.length > 0
        ? items.reduce((sum, i) => sum + (i.score / i.maxScore) * i.weight, 0) / (totalWeight || 1) * 100
        : 0;

    const getLetterGrade = (pct: number) => {
        if (pct >= 93) return "A";
        if (pct >= 90) return "A-";
        if (pct >= 87) return "B+";
        if (pct >= 83) return "B";
        if (pct >= 80) return "B-";
        if (pct >= 77) return "C+";
        if (pct >= 73) return "C";
        if (pct >= 70) return "C-";
        if (pct >= 67) return "D+";
        if (pct >= 63) return "D";
        if (pct >= 60) return "D-";
        return "F";
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Grade Calculator</span>

            {/* Current grade display */}
            {items.length > 0 && (
                <div className="mt-3 rounded-2xl bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/40 dark:to-red-900/40 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-rose-600 dark:text-rose-400">Current Grade</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">{weightedGrade.toFixed(1)}%</p>
                    <p className="text-lg font-semibold text-rose-600 dark:text-rose-400">{getLetterGrade(weightedGrade)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Based on {totalWeight.toFixed(0)}% of grade entered</p>
                </div>
            )}

            {/* Add new item */}
            <div className="mt-4 space-y-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Assignment name" className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-400" />
                <div className="flex gap-2">
                    <input value={newScore} onChange={(e) => setNewScore(e.target.value)} placeholder="Score" type="number" className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none" />
                    <span className="flex items-center text-slate-400">/</span>
                    <input value={newMax} onChange={(e) => setNewMax(e.target.value)} placeholder="Max" type="number" className="w-16 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none" />
                    <input value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="Wt%" type="number" className="w-16 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none" />
                </div>
                <button onClick={addItem} disabled={!newName.trim() || !newScore || !newWeight} className="w-full rounded-xl bg-rose-500 py-2 text-xs font-semibold text-white disabled:opacity-50">Add Grade</button>
            </div>

            {/* Items list */}
            <div className="mt-4 space-y-1.5 max-h-[120px] overflow-y-auto">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2">
                        <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.score}/{item.maxScore} ({item.weight}%)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{((item.score / item.maxScore) * 100).toFixed(0)}%</span>
                            <button onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="p-0.5 text-slate-400 hover:text-red-500">
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
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
