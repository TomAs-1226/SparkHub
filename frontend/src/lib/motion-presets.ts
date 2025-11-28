export const EASE = {
    emphasized: [0.16, 1, 0.3, 1],
    lift: [0.25, 1, 0.5, 1],
    swift: [0.22, 0.61, 0.36, 1],
    drift: [0.2, 0.8, 0.3, 1],
} as const;

export const SPRING = {
    float: { type: "spring", stiffness: 120, damping: 18, mass: 0.9 },
    pop: { type: "spring", stiffness: 200, damping: 22, mass: 0.7 },
    drawer: { type: "spring", stiffness: 160, damping: 20, mass: 1 },
    sway: { type: "spring", stiffness: 150, damping: 16, mass: 1.1 },
} as const;

export const FADES = {
    gentleUp: {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.emphasized } },
    },
    floatUp: {
        initial: { opacity: 0, y: 24, scale: 0.985 },
        animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.7, ease: EASE.drift },
        },
    },
};

export const STAGGER = {
    slow: { staggerChildren: 0.08, delayChildren: 0.04 },
    brisk: { staggerChildren: 0.05, delayChildren: 0.02 },
};

export const SURFACES = {
    lift: {
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: (delay = 0) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.6, ease: EASE.emphasized, delay },
        }),
        whileHover: { y: -3, transition: { duration: 0.32, ease: EASE.swift } },
    },
    floatIn: {
        initial: { opacity: 0, y: 26, scale: 0.97 },
        animate: (delay = 0) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.7, ease: EASE.drift, delay },
        }),
    },
};
