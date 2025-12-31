"use client";

import React, { useMemo } from "react";

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

// Render LaTeX to readable format
function renderLatex(latex: string): string {
    return latex
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
}

// Process inline formatting (bold, italic, code, latex)
function processInlineText(text: string, keyPrefix: string): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    let keyCounter = 0;
    const getKey = () => `${keyPrefix}-${keyCounter++}`;

    // Split by patterns and process
    let remaining = text;

    while (remaining.length > 0) {
        // Find the first match of any pattern
        let firstMatchIndex = remaining.length;
        let matchType: "bold" | "italic" | "code" | "latex-block" | "latex-inline" | null = null;
        let matchLength = 0;
        let matchContent = "";

        // Check for bold **text**
        const boldIdx = remaining.indexOf("**");
        if (boldIdx !== -1 && boldIdx < firstMatchIndex) {
            const endIdx = remaining.indexOf("**", boldIdx + 2);
            if (endIdx !== -1) {
                firstMatchIndex = boldIdx;
                matchType = "bold";
                matchLength = endIdx + 2 - boldIdx;
                matchContent = remaining.slice(boldIdx + 2, endIdx);
            }
        }

        // Check for code `text`
        const codeIdx = remaining.indexOf("`");
        if (codeIdx !== -1 && codeIdx < firstMatchIndex) {
            const endIdx = remaining.indexOf("`", codeIdx + 1);
            if (endIdx !== -1) {
                firstMatchIndex = codeIdx;
                matchType = "code";
                matchLength = endIdx + 1 - codeIdx;
                matchContent = remaining.slice(codeIdx + 1, endIdx);
            }
        }

        // Check for block latex $$text$$
        const latexBlockIdx = remaining.indexOf("$$");
        if (latexBlockIdx !== -1 && latexBlockIdx < firstMatchIndex) {
            const endIdx = remaining.indexOf("$$", latexBlockIdx + 2);
            if (endIdx !== -1) {
                firstMatchIndex = latexBlockIdx;
                matchType = "latex-block";
                matchLength = endIdx + 2 - latexBlockIdx;
                matchContent = remaining.slice(latexBlockIdx + 2, endIdx);
            }
        }

        // Check for inline latex $text$ (but not $$)
        if (matchType !== "latex-block") {
            let searchStart = 0;
            while (searchStart < remaining.length) {
                const dollarIdx = remaining.indexOf("$", searchStart);
                if (dollarIdx === -1 || dollarIdx >= firstMatchIndex) break;

                // Make sure it's not $$
                if (remaining[dollarIdx + 1] === "$") {
                    searchStart = dollarIdx + 2;
                    continue;
                }

                // Find closing $
                let endIdx = remaining.indexOf("$", dollarIdx + 1);
                while (endIdx !== -1 && remaining[endIdx - 1] === "\\") {
                    endIdx = remaining.indexOf("$", endIdx + 1);
                }

                if (endIdx !== -1 && endIdx < firstMatchIndex + matchLength) {
                    firstMatchIndex = dollarIdx;
                    matchType = "latex-inline";
                    matchLength = endIdx + 1 - dollarIdx;
                    matchContent = remaining.slice(dollarIdx + 1, endIdx);
                    break;
                }
                searchStart = dollarIdx + 1;
            }
        }

        // Check for italic *text* (single asterisk, not double)
        let searchStart = 0;
        while (searchStart < remaining.length) {
            const asteriskIdx = remaining.indexOf("*", searchStart);
            if (asteriskIdx === -1 || asteriskIdx >= firstMatchIndex) break;

            // Skip if it's part of **
            if (remaining[asteriskIdx + 1] === "*" || (asteriskIdx > 0 && remaining[asteriskIdx - 1] === "*")) {
                searchStart = asteriskIdx + 1;
                continue;
            }

            // Find closing * (not **)
            let endIdx = asteriskIdx + 1;
            while (endIdx < remaining.length) {
                const nextAsterisk = remaining.indexOf("*", endIdx);
                if (nextAsterisk === -1) break;

                // Check if it's a single * (not **)
                if (remaining[nextAsterisk + 1] !== "*" && remaining[nextAsterisk - 1] !== "*") {
                    if (nextAsterisk < firstMatchIndex) {
                        firstMatchIndex = asteriskIdx;
                        matchType = "italic";
                        matchLength = nextAsterisk + 1 - asteriskIdx;
                        matchContent = remaining.slice(asteriskIdx + 1, nextAsterisk);
                    }
                    break;
                }
                endIdx = nextAsterisk + 1;
            }
            break;
        }

        // Add text before match
        if (firstMatchIndex > 0) {
            result.push(<span key={getKey()}>{remaining.slice(0, firstMatchIndex)}</span>);
        }

        // Add the matched element
        if (matchType && matchContent) {
            switch (matchType) {
                case "bold":
                    result.push(
                        <strong key={getKey()} className="font-semibold">
                            {matchContent}
                        </strong>
                    );
                    break;
                case "italic":
                    result.push(
                        <em key={getKey()} className="italic">
                            {matchContent}
                        </em>
                    );
                    break;
                case "code":
                    result.push(
                        <code key={getKey()} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[0.9em] font-mono">
                            {matchContent}
                        </code>
                    );
                    break;
                case "latex-block":
                    result.push(
                        <span key={getKey()} className="block my-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg font-mono text-sm text-center overflow-x-auto">
                            {renderLatex(matchContent)}
                        </span>
                    );
                    break;
                case "latex-inline":
                    result.push(
                        <span key={getKey()} className="inline-block px-1 py-0.5 mx-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono text-[0.9em]">
                            {renderLatex(matchContent)}
                        </span>
                    );
                    break;
            }
            remaining = remaining.slice(firstMatchIndex + matchLength);
        } else {
            // No more matches, add remaining text
            if (remaining.length > 0) {
                result.push(<span key={getKey()}>{remaining}</span>);
            }
            break;
        }
    }

    return result.length > 0 ? result : [<span key={`${keyPrefix}-0`}>{text}</span>];
}

// Parse markdown into React nodes
function parseMarkdown(text: string): React.ReactNode[] {
    const elements: React.ReactNode[] = [];
    const lines = text.split("\n");
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let key = 0;

    const getKey = () => `md-${key++}`;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Handle code blocks
        if (trimmedLine.startsWith("```")) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={getKey()} className="my-2 p-3 bg-slate-800 dark:bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                        <code>{codeBlockContent.join("\n")}</code>
                    </pre>
                );
                codeBlockContent = [];
                inCodeBlock = false;
            } else {
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
                    {processInlineText(trimmedLine.slice(4), `h4-${key}`)}
                </h4>
            );
            continue;
        }
        if (trimmedLine.startsWith("## ")) {
            elements.push(
                <h3 key={getKey()} className="font-semibold text-base mt-3 mb-1">
                    {processInlineText(trimmedLine.slice(3), `h3-${key}`)}
                </h3>
            );
            continue;
        }
        if (trimmedLine.startsWith("# ")) {
            elements.push(
                <h2 key={getKey()} className="font-bold text-lg mt-3 mb-1">
                    {processInlineText(trimmedLine.slice(2), `h2-${key}`)}
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
                    <span>{processInlineText(numberedMatch[2], `num-${key}`)}</span>
                </div>
            );
            continue;
        }

        // Handle bullet lists
        if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
            const indent = line.search(/\S/);
            const content = trimmedLine.slice(2);
            elements.push(
                <div key={getKey()} className="flex gap-2" style={{ marginLeft: `${Math.min(indent, 6) * 8}px` }}>
                    <span className="text-[#63C0B9] shrink-0">•</span>
                    <span>{processInlineText(content, `bullet-${key}`)}</span>
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
                {processInlineText(line, `p-${key}`)}
            </p>
        );
    }

    // Handle unclosed code block
    if (inCodeBlock && codeBlockContent.length > 0) {
        elements.push(
            <pre key={getKey()} className="my-2 p-3 bg-slate-800 dark:bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
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