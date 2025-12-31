"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    StickyNote,
    X,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Pin,
} from "lucide-react";

interface Note {
    id: string;
    content: string;
    createdAt: Date;
    pinned: boolean;
    color: string;
}

const NOTE_COLORS = [
    { name: "Yellow", value: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800" },
    { name: "Green", value: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800" },
    { name: "Blue", value: "bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800" },
    { name: "Purple", value: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800" },
    { name: "Pink", value: "bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800" },
];

const STORAGE_KEY = "sparkhub-quick-notes";

export default function QuickNotes() {
    const [isOpen, setIsOpen] = useState(false);
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNoteContent, setNewNoteContent] = useState("");
    const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].value);
    const [isMinimized, setIsMinimized] = useState(false);
    const [scrollTopVisible, setScrollTopVisible] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load notes from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setNotes(parsed.map((n: Note) => ({ ...n, createdAt: new Date(n.createdAt) })));
            }
        } catch {
            // Ignore errors
        }
    }, []);

    // Save notes to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        } catch {
            // Ignore errors
        }
    }, [notes]);

    // Track scroll for button positioning
    useEffect(() => {
        const handleScroll = () => {
            setScrollTopVisible(window.scrollY > 320);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    function addNote() {
        if (!newNoteContent.trim()) return;
        const note: Note = {
            id: `note-${Date.now()}`,
            content: newNoteContent.trim(),
            createdAt: new Date(),
            pinned: false,
            color: selectedColor,
        };
        setNotes((prev) => [note, ...prev]);
        setNewNoteContent("");
        inputRef.current?.focus();
    }

    function deleteNote(id: string) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
    }

    function togglePin(id: string) {
        setNotes((prev) =>
            prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
        );
    }

    // Sort notes: pinned first, then by date
    const sortedNotes = [...notes].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const buttonBottomClass = scrollTopVisible ? "bottom-20" : "bottom-6";

    return (
        <>
            {/* Floating button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={`fixed ${buttonBottomClass} left-24 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 transition-all duration-300 ${isOpen ? "hidden" : ""}`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <StickyNote className="h-5 w-5" />
                {notes.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-amber-600 shadow">
                        {notes.length > 9 ? "9+" : notes.length}
                    </span>
                )}
            </motion.button>

            {/* Notes panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`fixed ${buttonBottomClass} left-6 z-40 w-[340px] overflow-hidden rounded-[20px] border border-amber-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300`}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-amber-100 to-orange-100 dark:from-slate-700 dark:to-slate-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                <span className="font-semibold text-slate-800 dark:text-slate-100">Quick Notes</span>
                                <span className="rounded-full bg-amber-200/70 dark:bg-amber-900/50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                    {notes.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <motion.button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="rounded-full p-1.5 text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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

                        <AnimatePresence>
                            {!isMinimized && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* New note input */}
                                    <div className="border-b border-slate-100 dark:border-slate-700 p-3">
                                        <textarea
                                            ref={inputRef}
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            placeholder="Write a quick note..."
                                            className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                                            rows={2}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    addNote();
                                                }
                                            }}
                                        />
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex gap-1">
                                                {NOTE_COLORS.map((color) => (
                                                    <button
                                                        key={color.name}
                                                        onClick={() => setSelectedColor(color.value)}
                                                        className={`h-6 w-6 rounded-full border-2 transition ${color.value.split(" ")[0]} ${
                                                            selectedColor === color.value
                                                                ? "ring-2 ring-amber-400 ring-offset-1"
                                                                : "border-transparent"
                                                        }`}
                                                        title={color.name}
                                                    />
                                                ))}
                                            </div>
                                            <motion.button
                                                onClick={addNote}
                                                disabled={!newNoteContent.trim()}
                                                className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Add
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Notes list */}
                                    <div className="max-h-[280px] overflow-y-auto p-3">
                                        {sortedNotes.length === 0 ? (
                                            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                                <StickyNote className="mx-auto mb-2 h-8 w-8 opacity-30" />
                                                <p>No notes yet</p>
                                                <p className="text-xs">Add your first note above</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {sortedNotes.map((note, idx) => (
                                                    <motion.div
                                                        key={note.id}
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        transition={{ delay: idx * 0.03 }}
                                                        className={`group relative rounded-xl border p-3 ${note.color}`}
                                                    >
                                                        {note.pinned && (
                                                            <Pin className="absolute -right-1 -top-1 h-4 w-4 rotate-45 text-amber-600 dark:text-amber-400" />
                                                        )}
                                                        <p className="pr-12 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                                            {note.content}
                                                        </p>
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                                {formatRelativeTime(note.createdAt)}
                                                            </span>
                                                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                                <button
                                                                    onClick={() => togglePin(note.id)}
                                                                    className={`rounded-full p-1 ${note.pinned ? "text-amber-600" : "text-slate-400"} hover:bg-white/50 dark:hover:bg-slate-600`}
                                                                    title={note.pinned ? "Unpin" : "Pin"}
                                                                >
                                                                    <Pin className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteNote(note.id)}
                                                                    className="rounded-full p-1 text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600 hover:text-red-500"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
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

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
