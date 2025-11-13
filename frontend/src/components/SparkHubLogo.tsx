// src/components/SparkHubLogo.tsx
"use client";
import * as React from "react";

type Props = {
    className?: string;        // e.g. "h-8 w-auto text-slate-900"
    accent?: string;           // diamond stroke color
    shadow?: boolean;          // subtle drop shadow on 'Spa'
};

/**
 * Wordmark: "Spa" sits over the diamond; "rkHub" sits outside to the right.
 * Text color = currentColor → controlled by parent (Tailwind `text-*`).
 */
export default function SparkHubLogo({
                                         className = "h-8 w-auto",
                                         accent = "#68E7D6",
                                         shadow = true,
                                     }: Props) {
    return (
        <svg
            className={className}
            viewBox="0 0 520 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="SparkHub logo"
        >
            {/* optional soft shadow for SPA */}
            <defs>
                <filter id="spaShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Diamond (rotated rounded square) */}
            <rect
                x="60"
                y="20"
                width="120"
                height="120"
                rx="22"
                transform="rotate(45 120 80)"
                stroke={accent}
                strokeWidth="12"
                fill="none"
            />

            {/* "Spa" over the diamond */}
            <g style={shadow ? { filter: "url(#spaShadow)" } : undefined}>
                <text
                    x="115"
                    y="110"
                    fontSize="88"
                    fontWeight="800"
                    fontFamily="Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial"
                    fill="currentColor"
                    textRendering="geometricPrecision"
                >
                    Spa
                </text>
            </g>

            {/* "rkHub" outside */}
            <text
                x="275"
                y="110"
                fontSize="84"
                fontWeight="600"
                fontFamily="Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial"
                fill="currentColor"
                textRendering="geometricPrecision"
            >
                rkHub
            </text>
        </svg>
    );
}