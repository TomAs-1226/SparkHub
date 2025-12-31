"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    X,
    Send,
    Sparkles,
    Loader2,
    RotateCcw,
    Lightbulb,
    BookOpen,
    Calendar,
    Briefcase,
} from "lucide-react";
import { api } from "@/lib/api";
import { EASE, SPRING, DURATIONS } from "@/lib/motion-presets";
import MarkdownRenderer from "@/components/markdown-renderer";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface QuickPrompt {
    icon: React.ReactNode;
    label: string;
    prompt: string;
}

const quickPrompts: QuickPrompt[] = [
    {
        icon: <Lightbulb className="h-4 w-4" />,
        label: "Study tips",
        prompt: "Give me some effective study tips for better learning",
    },
    {
        icon: <BookOpen className="h-4 w-4" />,
        label: "Course help",
        prompt: "Help me understand how to get the most out of my courses",
    },
    {
        icon: <Calendar className="h-4 w-4" />,
        label: "Event ideas",
        prompt: "What types of events would be good for my learning goals?",
    },
    {
        icon: <Briefcase className="h-4 w-4" />,
        label: "Career advice",
        prompt: "Give me advice on building skills for job opportunities",
    },
];

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPrompts, setShowPrompts] = useState(true);
    const [scrollTopVisible, setScrollTopVisible] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Track scroll position to move AI button when scroll-to-top appears
    useEffect(() => {
        const handleScroll = () => {
            setScrollTopVisible(window.scrollY > 320);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    async function sendMessage(content: string) {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: content.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setShowPrompts(false);
        setIsLoading(true);

        try {
            const res = await api("/ai/chat", {
                method: "POST",
                body: JSON.stringify({
                    message: content.trim(),
                    history: messages.slice(-10).map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            const json = await safeJson(res);

            if (!res.ok || json?.ok === false) {
                throw new Error(json?.msg || "Unable to get response");
            }

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: json?.response || "I'm here to help! What would you like to know?",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content:
                    err instanceof Error
                        ? `Sorry, I encountered an issue: ${err.message}. Please try again.`
                        : "Sorry, something went wrong. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        sendMessage(input);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    }

    function handleQuickPrompt(prompt: string) {
        sendMessage(prompt);
    }

    // Calculate bottom position based on scroll-to-top button visibility
    const buttonBottomClass = scrollTopVisible ? "bottom-20" : "bottom-6";
    const windowBottomClass = scrollTopVisible ? "bottom-20" : "bottom-6";

    return (
        <>
            {/* Floating button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className={`fixed ${buttonBottomClass} right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sh-accent,#63C0B9)] to-[#2D8F80] text-white shadow-lg shadow-[var(--sh-accent,#63C0B9)]/30 transition-all duration-300 ${isOpen ? "hidden" : ""}`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: DURATIONS.normal, ease: EASE.emphasized }}
            >
                <Sparkles className="h-6 w-6" />
            </motion.button>

            {/* Chat window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`fixed ${windowBottomClass} right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-[24px] border border-[#CFE3E0]/60 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl shadow-slate-900/10 transition-all duration-300`}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={SPRING.snappy}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-[#E7F6F3] to-[#F0F9FF] dark:from-slate-700 dark:to-slate-800 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sh-accent,#63C0B9)] to-[#2D8F80] text-white">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">SparkHub AI</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Your learning assistant</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={() => {
                                        setMessages([]);
                                        setShowPrompts(true);
                                    }}
                                    className="rounded-full p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title="Clear chat"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </motion.button>
                                <motion.button
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-full p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="h-4 w-4" />
                                </motion.button>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            {messages.length === 0 && showPrompts ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: DURATIONS.normal }}
                                    className="space-y-4"
                                >
                                    <div className="text-center">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#E7F6F3] to-[#F0F9FF] dark:from-slate-700 dark:to-slate-600">
                                            <MessageCircle className="h-6 w-6 text-[var(--sh-accent,#2D8F80)] dark:text-[var(--sh-accent,#63C0B9)]" />
                                        </div>
                                        <h4 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            How can I help you today?
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            I guide your learning - ask me anything!
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {quickPrompts.map((prompt, idx) => (
                                            <motion.button
                                                key={idx}
                                                onClick={() => handleQuickPrompt(prompt.prompt)}
                                                className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 text-left text-xs text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:border-[var(--sh-accent-soft,#CFE3E0)] dark:hover:border-slate-500 hover:bg-[#F9FEFD] dark:hover:bg-slate-600 hover:shadow"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05, duration: DURATIONS.fast }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <span className="text-[var(--sh-accent,#2D8F80)] dark:text-[var(--sh-accent,#63C0B9)]">{prompt.icon}</span>
                                                <span className="font-medium">{prompt.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: DURATIONS.fast }}
                                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                                    message.role === "user"
                                                        ? "bg-gradient-to-br from-[var(--sh-accent,#63C0B9)] to-[#2D8F80] text-white"
                                                        : "border border-slate-100 dark:border-slate-600 bg-[#F9FBFF] dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                                }`}
                                            >
                                                {message.role === "assistant" ? (
                                                    <MarkdownRenderer content={message.content} className="text-sm" />
                                                ) : (
                                                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                                )}
                                                <p
                                                    className={`mt-1 text-[10px] ${
                                                        message.role === "user" ? "text-white/70" : "text-slate-400 dark:text-slate-500"
                                                    }`}
                                                >
                                                    {message.timestamp.toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isLoading && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex justify-start"
                                        >
                                            <div className="flex items-center gap-2 rounded-2xl border border-slate-100 dark:border-slate-600 bg-[#F9FBFF] dark:bg-slate-700 px-4 py-3">
                                                <Loader2 className="h-4 w-4 animate-spin text-[var(--sh-accent,#2D8F80)] dark:text-[var(--sh-accent,#63C0B9)]" />
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Thinking...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Input area */}
                        <form onSubmit={handleSubmit} className="border-t border-slate-100 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
                            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 focus-within:border-[var(--sh-accent,#63C0B9)] focus-within:ring-2 focus-within:ring-[var(--sh-accent,#63C0B9)]/20">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask me anything..."
                                    className="max-h-24 min-h-[40px] flex-1 resize-none bg-transparent text-sm text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                                    rows={1}
                                    disabled={isLoading}
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--sh-accent,#63C0B9)] to-[#2D8F80] text-white disabled:opacity-50"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Send className="h-4 w-4" />
                                </motion.button>
                            </div>
                            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                                I guide your learning - never just give answers
                            </p>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
