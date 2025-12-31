/**
 * Motion presets for SparkHub animations
 * All animations respect the user's system preference for reduced motion
 */

// Check for reduced motion preference (runs only on client)
const getReducedMotion = (): boolean => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
};

// Easing curves for smooth, natural animations
export const EASE = {
    emphasized: [0.16, 1, 0.3, 1],      // Material Design emphasized easing
    lift: [0.25, 1, 0.5, 1],             // Subtle lift effect
    swift: [0.22, 0.61, 0.36, 1],        // Quick, responsive feel
    drift: [0.2, 0.8, 0.3, 1],           // Gentle, floating motion
    standard: [0.4, 0, 0.2, 1],          // Standard Material easing
    decelerate: [0, 0, 0.2, 1],          // Entry/appear animations
    accelerate: [0.4, 0, 1, 1],          // Exit/disappear animations
} as const;

// Spring physics for natural, bouncy animations
export const SPRING = {
    float: { type: "spring" as const, stiffness: 120, damping: 18, mass: 0.9 },
    pop: { type: "spring" as const, stiffness: 200, damping: 22, mass: 0.7 },
    drawer: { type: "spring" as const, stiffness: 160, damping: 20, mass: 1 },
    sway: { type: "spring" as const, stiffness: 150, damping: 16, mass: 1.1 },
    // New refined springs
    snappy: { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 },
    gentle: { type: "spring" as const, stiffness: 100, damping: 20, mass: 1.2 },
    bouncy: { type: "spring" as const, stiffness: 300, damping: 15, mass: 0.6 },
} as const;

// Fade animations with motion preference support
export const FADES = {
    gentleUp: {
        initial: { opacity: 0, y: getReducedMotion() ? 0 : 18 },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: getReducedMotion() ? 0.15 : 0.5,
                ease: EASE.emphasized
            }
        },
    },
    floatUp: {
        initial: {
            opacity: 0,
            y: getReducedMotion() ? 0 : 24,
            scale: getReducedMotion() ? 1 : 0.985
        },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: getReducedMotion() ? 0.15 : 0.7,
                ease: EASE.drift
            },
        },
    },
    fadeIn: {
        initial: { opacity: 0 },
        animate: {
            opacity: 1,
            transition: { duration: 0.3, ease: EASE.standard }
        },
    },
    scaleIn: {
        initial: {
            opacity: 0,
            scale: getReducedMotion() ? 1 : 0.95
        },
        animate: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: getReducedMotion() ? 0.15 : 0.4,
                ease: EASE.decelerate
            }
        },
    },
};

// Stagger configurations for list animations
export const STAGGER = {
    slow: { staggerChildren: 0.08, delayChildren: 0.04 },
    brisk: { staggerChildren: 0.05, delayChildren: 0.02 },
    fast: { staggerChildren: 0.03, delayChildren: 0.01 },
    // New base stagger for resources page compatibility
    base: { staggerChildren: 0.06, delayChildren: 0.03 },
};

// Surface animations for cards and interactive elements
export const SURFACES = {
    lift: {
        initial: {
            opacity: 0,
            y: getReducedMotion() ? 0 : 18,
            scale: getReducedMotion() ? 1 : 0.98
        },
        animate: (delay = 0) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: getReducedMotion() ? 0.15 : 0.6,
                ease: EASE.emphasized,
                delay: getReducedMotion() ? 0 : delay
            },
        }),
        whileHover: getReducedMotion()
            ? {}
            : { y: -3, transition: { duration: 0.32, ease: EASE.swift } },
    },
    floatIn: {
        initial: {
            opacity: 0,
            y: getReducedMotion() ? 0 : 26,
            scale: getReducedMotion() ? 1 : 0.97
        },
        animate: (delay = 0) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: getReducedMotion() ? 0.15 : 0.7,
                ease: EASE.drift,
                delay: getReducedMotion() ? 0 : delay
            },
        }),
    },
    press: {
        whileTap: getReducedMotion() ? {} : { scale: 0.98 },
        transition: { duration: 0.15, ease: EASE.swift },
    },
};

// Transition durations for consistency
export const DURATIONS = {
    instant: 0.1,
    fast: 0.2,
    normal: 0.35,
    slow: 0.5,
    emphasis: 0.7,
} as const;

// Page transition animations
export const PAGE_TRANSITIONS = {
    fadeSlide: {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
        transition: { duration: 0.3, ease: EASE.swift },
    },
    fadeScale: {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.25, ease: EASE.emphasized },
    },
    slideUp: {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -30 },
        transition: { duration: 0.35, ease: EASE.emphasized },
    },
};

// Skeleton loading animations
export const SKELETON = {
    pulse: {
        animate: {
            opacity: [0.5, 1, 0.5],
            transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
    },
    shimmer: {
        animate: {
            backgroundPosition: ["200% 0", "-200% 0"],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "linear",
            },
        },
    },
};

// Button hover and tap animations
export const BUTTON_VARIANTS = {
    primary: {
        whileHover: getReducedMotion() ? {} : { scale: 1.02, y: -1 },
        whileTap: getReducedMotion() ? {} : { scale: 0.98 },
        transition: { duration: 0.15, ease: EASE.swift },
    },
    secondary: {
        whileHover: getReducedMotion() ? {} : { scale: 1.01 },
        whileTap: getReducedMotion() ? {} : { scale: 0.99 },
        transition: { duration: 0.12, ease: EASE.swift },
    },
    icon: {
        whileHover: getReducedMotion() ? {} : { scale: 1.1, rotate: 5 },
        whileTap: getReducedMotion() ? {} : { scale: 0.9 },
        transition: { duration: 0.15, ease: EASE.swift },
    },
};

// Card entrance animations for lists
export const LIST_ITEM = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            delay: i * 0.05,
            duration: 0.4,
            ease: EASE.emphasized,
        },
    }),
};

// Modal/dialog animations
export const MODAL = {
    overlay: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
    },
    content: {
        initial: { opacity: 0, scale: 0.95, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 20 },
        transition: { duration: 0.25, ease: EASE.emphasized },
    },
};

// Notification/toast animations
export const TOAST = {
    initial: { opacity: 0, y: -20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: { duration: 0.25, ease: EASE.swift },
};

// Confetti burst effect (for achievements)
export const CONFETTI = {
    particle: (index: number) => ({
        initial: { opacity: 1, scale: 1, x: 0, y: 0 },
        animate: {
            opacity: 0,
            scale: 0,
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720 - 360,
            transition: {
                duration: 1 + Math.random() * 0.5,
                delay: index * 0.02,
                ease: EASE.accelerate,
            },
        },
    }),
};

// Helper to create motion-safe animations
export function createMotionSafeVariants<T extends Record<string, unknown>>(
    fullMotion: T,
    reducedMotion: Partial<T>
): T {
    return getReducedMotion() ? { ...fullMotion, ...reducedMotion } : fullMotion;
}

// Hook-friendly reduced motion check (for use in components)
export function prefersReducedMotion(): boolean {
    return getReducedMotion();
}