"use client";

import { useMemo } from "react";

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

// Simple markdown parser that handles common formatting
function parseMarkdown(text: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    const lines = text.split("\n");
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = "";
    let key = 0;

    const getKey = () => `md-${key++}`;

    // Process inline formatting
    const processInline = (line: string): React.ReactNode[] => {
        const inlineElements: React.ReactNode[] = [];
        let remaining = line;
        let inlineKey = 0;

        const getInlineKey = () => `inline-${key}-${inlineKey++}`;

        // Process LaTeX block equations first ($$...$$)
        while (remaining.includes("$$")) {
            const start = remaining.indexOf("$$");
            const end = remaining.indexOf("$$", start + 2);
            if (end === -1) break;

            // Add text before equation
            if (start > 0) {
                inlineElements.push(
                    ...processInlineFormatting(remaining.slice(0, start), getInlineKey)
                );
            }

            // Add equation as styled block
            const equation = remaining.slice(start + 2, end);
            inlineElements.push(
                <span
                    key={getInlineKey()}
                    className="block my-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg font-mono text-sm text-center overflow-x-auto"
                >
                    {renderLatex(equation)}
                </span>
            );

            remaining = remaining.slice(end + 2);
        }

        // Process remaining content with inline LaTeX ($...$)
        if (remaining) {
            while (remaining.includes("$")) {
                const start = remaining.indexOf("$");
                const end = remaining.indexOf("$", start + 1);
                if (end === -1) break;

                // Add text before equation
                if (start > 0) {
                    inlineElements.push(
                        ...processInlineFormatting(remaining.slice(0, start), getInlineKey)
                    );
                }

                // Add inline equation
                const equation = remaining.slice(start + 1, end);
                inlineElements.push(
                    <span
                        key={getInlineKey()}
                        className="inline-block px-1 py-0.5 mx-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono text-[0.9em]"
                    >
                        {renderLatex(equation)}
                    </span>
                );

                remaining = remaining.slice(end + 1);
            }

            if (remaining) {
                inlineElements.push(
                    ...processInlineFormatting(remaining, getInlineKey)
                );
            }
        }

        return inlineElements.length > 0 ? inlineElements : [line];
    };

    // Process bold, italic, and code inline formatting
    const processInlineFormatting = (
        text: string,
        keyGen: () => string
    ): React.ReactNode[] => {
        const result: React.ReactNode[] = [];
        let remaining = text;

        // Pattern: **bold**, *italic*, `code`
        const patterns = [
            { regex: /\*\*([^*]+)\*\*/g, render: (t: string, k: string) => <strong key={k} className="font-semibold">{t}</strong> },
            { regex: /\*([^*]+)\*/g, render: (t: string, k: string) => <em key={k} className="italic">{t}</em> },
            { regex: /`([^`]+)`/g, render: (t: string, k: string) => <code key={k} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[0.9em] font-mono">{t}</code> },
        ];

        // Simple tokenizer approach
        let tokens: Array<{ type: "text" | "bold" | "italic" | "code"; content: string }> = [];
        let current = remaining;

        // Find all formatted sections
        let hasMatch = true;
        while (hasMatch && current.length > 0) {
            hasMatch = false;

            // Try to find the earliest match
            let earliestMatch: { index: number; length: number; content: string; type: "bold" | "italic" | "code" } | null = null;

            // Check for bold **text**
            const boldMatch = current.match(/\*\*([^*]+)\*\*/);
            if (boldMatch && boldMatch.index !== undefined) {
                if (!earliestMatch || boldMatch.index < earliestMatch.index) {
                    earliestMatch = {
                        index: boldMatch.index,
                        length: boldMatch[0].length,
                        content: boldMatch[1],
                        type: "bold",
                    };
                }
            }

            // Check for italic *text* (but not inside bold)
            const italicMatch = current.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
            if (italicMatch && italicMatch.index !== undefined) {
                if (!earliestMatch || italicMatch.index < earliestMatch.index) {
                    earliestMatch = {
                        index: italicMatch.index,
                        length: italicMatch[0].length,
                        content: italicMatch[1],
                        type: "italic",
                    };
                }
            }

            // Check for code `text`
            const codeMatch = current.match(/`([^`]+)`/);
            if (codeMatch && codeMatch.index !== undefined) {
                if (!earliestMatch || codeMatch.index < earliestMatch.index) {
                    earliestMatch = {
                        index: codeMatch.index,
                        length: codeMatch[0].length,
                        content: codeMatch[1],
                        type: "code",
                    };
                }
            }

            if (earliestMatch) {
                hasMatch = true;

                // Add text before match
                if (earliestMatch.index > 0) {
                    tokens.push({ type: "text", content: current.slice(0, earliestMatch.index) });
                }

                // Add matched content
                tokens.push({ type: earliestMatch.type, content: earliestMatch.content });

                // Continue with rest
                current = current.slice(earliestMatch.index + earliestMatch.length);
            }
        }

        // Add remaining text
        if (current.length > 0) {
            tokens.push({ type: "text", content: current });
        }

        // Convert tokens to elements
        for (const token of tokens) {
            const k = keyGen();
            switch (token.type) {
                case "bold":
                    result.push(<strong key={k} className="font-semibold">{token.content}</strong>);
                    break;
                case "italic":
                    result.push(<em key={k} className="italic">{token.content}</em>);
                    break;
                case "code":
                    result.push(
                        <code key={k} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[0.9em] font-mono">
                            {token.content}
                        </code>
                    );
                    break;
                default:
                    result.push(<span key={k}>{token.content}</span>);
            }
        }

        return result.length > 0 ? result : [<span key={keyGen()}>{text}</span>];
    };

    // Render LaTeX to readable format
    const renderLatex = (latex: string): string => {
        // Convert common LaTeX to readable format
        let readable = latex
            // Fractions
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
            // Square root
            .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
            .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, "$1√($2)")
            // Powers and subscripts
            .replace(/\^2/g, "²")
            .replace(/\^3/g, "³")
            .replace(/\^n/g, "ⁿ")
            .replace(/\^{([^}]+)}/g, "^($1)")
            .replace(/_([0-9])/g, "₀₁₂₃₄₅₆₇₈₉".charAt(parseInt("$1")))
            .replace(/_\{([^}]+)\}/g, "[$1]")
            // Greek letters
            .replace(/\\alpha/g, "α")
            .replace(/\\beta/g, "β")
            .replace(/\\gamma/g, "γ")
            .replace(/\\delta/g, "δ")
            .replace(/\\epsilon/g, "ε")
            .replace(/\\theta/g, "θ")
            .replace(/\\lambda/g, "λ")
            .replace(/\\mu/g, "μ")
            .replace(/\\pi/g, "π")
            .replace(/\\sigma/g, "σ")
            .replace(/\\omega/g, "ω")
            .replace(/\\Sigma/g, "Σ")
            .replace(/\\Pi/g, "Π")
            .replace(/\\Omega/g, "Ω")
            // Operators
            .replace(/\\pm/g, "±")
            .replace(/\\mp/g, "∓")
            .replace(/\\times/g, "×")
            .replace(/\\div/g, "÷")
            .replace(/\\cdot/g, "·")
            .replace(/\\neq/g, "≠")
            .replace(/\\leq/g, "≤")
            .replace(/\\geq/g, "≥")
            .replace(/\\approx/g, "≈")
            .replace(/\\equiv/g, "≡")
            .replace(/\\infty/g, "∞")
            // Arrows
            .replace(/\\rightarrow/g, "→")
            .replace(/\\leftarrow/g, "←")
            .replace(/\\Rightarrow/g, "⇒")
            .replace(/\\Leftarrow/g, "⇐")
            // Sets
            .replace(/\\in/g, "∈")
            .replace(/\\notin/g, "∉")
            .replace(/\\subset/g, "⊂")
            .replace(/\\cup/g, "∪")
            .replace(/\\cap/g, "∩")
            // Misc
            .replace(/\\ldots/g, "…")
            .replace(/\\cdots/g, "⋯")
            .replace(/\\sum/g, "Σ")
            .replace(/\\prod/g, "∏")
            .replace(/\\int/g, "∫")
            // Clean up remaining backslashes
            .replace(/\\/g, "");

        return readable;
    };

    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Handle code blocks
        if (trimmedLine.startsWith("```")) {
            if (inCodeBlock) {
                // End code block
                elements.push(
                    <pre
                        key={getKey()}
                        className="my-2 p-3 bg-slate-800 dark:bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto"
                    >
                        <code>{codeBlockContent.join("\n")}</code>
                    </pre>
                );
                codeBlockContent = [];
                inCodeBlock = false;
            } else {
                // Start code block
                codeBlockLang = trimmedLine.slice(3);
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }

        // Handle headers
        if (trimmedLine.startsWith("### ")) {
            elements.push(
                <h4 key={getKey()} className="font-semibold text-sm mt-3 mb-1">
                    {processInline(trimmedLine.slice(4))}
                </h4>
            );
            continue;
        }
        if (trimmedLine.startsWith("## ")) {
            elements.push(
                <h3 key={getKey()} className="font-semibold text-base mt-3 mb-1">
                    {processInline(trimmedLine.slice(3))}
                </h3>
            );
            continue;
        }
        if (trimmedLine.startsWith("# ")) {
            elements.push(
                <h2 key={getKey()} className="font-bold text-lg mt-3 mb-1">
                    {processInline(trimmedLine.slice(2))}
                </h2>
            );
            continue;
        }

        // Handle numbered lists
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
            elements.push(
                <div key={getKey()} className="flex gap-2 ml-2">
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">{numberedMatch[1]}.</span>
                    <span>{processInline(numberedMatch[2])}</span>
                </div>
            );
            continue;
        }

        // Handle bullet lists
        if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
            const indent = line.search(/\S/);
            const content = trimmedLine.slice(2);
            elements.push(
                <div
                    key={getKey()}
                    className="flex gap-2"
                    style={{ marginLeft: `${Math.min(indent, 6) * 8}px` }}
                >
                    <span className="text-[#63C0B9] shrink-0">•</span>
                    <span>{processInline(content)}</span>
                </div>
            );
            continue;
        }

        // Handle empty lines
        if (trimmedLine === "") {
            elements.push(<div key={getKey()} className="h-2" />);
            continue;
        }

        // Regular paragraph
        elements.push(
            <p key={getKey()} className="leading-relaxed">
                {processInline(line)}
            </p>
        );
    }

    // Handle unclosed code block
    if (inCodeBlock && codeBlockContent.length > 0) {
        elements.push(
            <pre
                key={getKey()}
                className="my-2 p-3 bg-slate-800 dark:bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto"
            >
                <code>{codeBlockContent.join("\n")}</code>
            </pre>
        );
    }

    return elements;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
    const rendered = useMemo(() => parseMarkdown(content), [content]);

    return <div className={`space-y-1 ${className}`}>{rendered}</div>;
}
