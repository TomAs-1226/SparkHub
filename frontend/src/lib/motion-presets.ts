export const EASE = {
    emphasized: [0.16, 1, 0.3, 1],
    lift: [0.25, 1, 0.5, 1],
    swift: [0.22, 0.61, 0.36, 1],
} as const;

export const SPRING = {
    float: { type: "spring", stiffness: 120, damping: 18, mass: 0.9 },
    pop: { type: "spring", stiffness: 200, damping: 22, mass: 0.7 },
    drawer: { type: "spring", stiffness: 160, damping: 20, mass: 1 },
} as const;

export const FADES = {
    gentleUp: {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.emphasized } },
    },
};
