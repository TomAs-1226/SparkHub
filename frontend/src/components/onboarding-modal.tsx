"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap,
    BookOpen,
    Users,
    Calendar,
    Briefcase,
    Sparkles,
    Library,
    MessageCircle,
    BarChart2,
    ArrowRight,
    ArrowLeft,
    GraduationCap,
    LayoutDashboard,
    Palette,
    Shield,
    X,
    Bell,
    BellOff,
    Check,
    Code2,
    FlaskConical,
    Smartphone,
    Cpu,
    TrendingUp,
    Globe,
    Stethoscope,
    Pencil,
    Target,
    ChevronRight,
    Inbox,
} from "lucide-react";

interface OnboardingModalProps {
    user: { name?: string; role: string } | null;
    open?: boolean;
    onDismiss: () => void;
}

interface FeatureTile {
    icon: React.ReactNode;
    label: string;
    color: string;
}

interface InterestChip {
    icon: React.ReactNode;
    label: string;
    key: string;
}

interface StartOption {
    icon: React.ReactNode;
    label: string;
    description: string;
    href: string;
    color: string;
}

const FEATURES: FeatureTile[] = [
    { icon: <BookOpen className="h-4 w-4" />, label: "Courses", color: "from-blue-400 to-blue-600" },
    { icon: <Users className="h-4 w-4" />, label: "Tutoring", color: "from-purple-400 to-purple-600" },
    { icon: <Calendar className="h-4 w-4" />, label: "Events", color: "from-orange-400 to-orange-600" },
    { icon: <Briefcase className="h-4 w-4" />, label: "Opportunities", color: "from-green-400 to-green-600" },
    { icon: <Sparkles className="h-4 w-4" />, label: "AI Assistant", color: "from-pink-400 to-pink-600" },
    { icon: <Library className="h-4 w-4" />, label: "Resources", color: "from-yellow-400 to-yellow-600" },
    { icon: <MessageCircle className="h-4 w-4" />, label: "Discussions", color: "from-teal-400 to-teal-600" },
    { icon: <BarChart2 className="h-4 w-4" />, label: "Progress", color: "from-indigo-400 to-indigo-600" },
    { icon: <Inbox className="h-4 w-4" />, label: "Inbox", color: "from-cyan-400 to-cyan-600" },
];

const INTEREST_CHIPS: InterestChip[] = [
    { icon: <Code2 className="h-4 w-4" />, label: "Web Development", key: "webdev" },
    { icon: <FlaskConical className="h-4 w-4" />, label: "Data Science", key: "datascience" },
    { icon: <Pencil className="h-4 w-4" />, label: "UI/UX Design", key: "design" },
    { icon: <Smartphone className="h-4 w-4" />, label: "Mobile Apps", key: "mobile" },
    { icon: <Cpu className="h-4 w-4" />, label: "AI & Machine Learning", key: "aiml" },
    { icon: <TrendingUp className="h-4 w-4" />, label: "Finance & Business", key: "finance" },
    { icon: <Globe className="h-4 w-4" />, label: "Marketing", key: "marketing" },
    { icon: <Sparkles className="h-4 w-4" />, label: "Creative Arts", key: "arts" },
    { icon: <Stethoscope className="h-4 w-4" />, label: "Health & Science", key: "health" },
    { icon: <BookOpen className="h-4 w-4" />, label: "Languages", key: "languages" },
];

const LEARNING_GOALS = [
    { key: "exploring", label: "Just Exploring", description: "Curious about what's here" },
    { key: "skill", label: "Building a New Skill", description: "Learning something specific" },
    { key: "career", label: "Career Change", description: "Transitioning to a new field" },
    { key: "professional", label: "Professional Growth", description: "Advancing in my current role" },
    { key: "academic", label: "Academic Study", description: "Supporting coursework or research" },
];

function getRoleStartOptions(role: string): StartOption[] {
    const normalised = role.toUpperCase();
    switch (normalised) {
        case "CREATOR":
            return [
                {
                    icon: <Palette className="h-5 w-5" />,
                    label: "Open Creator Studio",
                    description: "Build and publish your first course.",
                    href: "/courses/studio",
                    color: "from-purple-500 to-purple-700",
                },
                {
                    icon: <BookOpen className="h-5 w-5" />,
                    label: "Browse Courses",
                    description: "See what others have built for inspiration.",
                    href: "/courses",
                    color: "from-blue-500 to-blue-700",
                },
                {
                    icon: <BarChart2 className="h-5 w-5" />,
                    label: "View Dashboard",
                    description: "Track your stats and student progress.",
                    href: "/dashboard",
                    color: "from-teal-500 to-teal-700",
                },
            ];
        case "TUTOR":
            return [
                {
                    icon: <LayoutDashboard className="h-5 w-5" />,
                    label: "Set Up Your Profile",
                    description: "Get discovered by students looking for help.",
                    href: "/tutors/dashboard",
                    color: "from-orange-500 to-orange-700",
                },
                {
                    icon: <Users className="h-5 w-5" />,
                    label: "Browse Tutors",
                    description: "See how other tutors present themselves.",
                    href: "/tutors",
                    color: "from-purple-500 to-purple-700",
                },
                {
                    icon: <BookOpen className="h-5 w-5" />,
                    label: "Browse Courses",
                    description: "Explore learning resources on the platform.",
                    href: "/courses",
                    color: "from-blue-500 to-blue-700",
                },
            ];
        case "ADMIN":
            return [
                {
                    icon: <Shield className="h-5 w-5" />,
                    label: "Admin Panel",
                    description: "Manage users, content, and platform settings.",
                    href: "/admin",
                    color: "from-red-500 to-red-700",
                },
                {
                    icon: <Palette className="h-5 w-5" />,
                    label: "Creator Studio",
                    description: "Create and manage educational content.",
                    href: "/courses/studio",
                    color: "from-purple-500 to-purple-700",
                },
                {
                    icon: <BarChart2 className="h-5 w-5" />,
                    label: "View Dashboard",
                    description: "Overview of platform activity and metrics.",
                    href: "/dashboard",
                    color: "from-teal-500 to-teal-700",
                },
            ];
        default: // STUDENT
            return [
                {
                    icon: <BookOpen className="h-5 w-5" />,
                    label: "Browse Courses",
                    description: "Discover courses tailored to your interests.",
                    href: "/courses",
                    color: "from-blue-500 to-blue-700",
                },
                {
                    icon: <Users className="h-5 w-5" />,
                    label: "Find a Tutor",
                    description: "Connect with expert tutors one-on-one.",
                    href: "/tutors",
                    color: "from-purple-500 to-purple-700",
                },
                {
                    icon: <Library className="h-5 w-5" />,
                    label: "Explore Resources",
                    description: "Access study guides, slides, and materials.",
                    href: "/resources",
                    color: "from-orange-500 to-orange-700",
                },
            ];
    }
}

function getRoleStartHref(role: string): string {
    const normalised = role.toUpperCase();
    switch (normalised) {
        case "CREATOR": return "/courses/studio";
        case "TUTOR": return "/tutors/dashboard";
        case "ADMIN": return "/admin";
        default: return "/courses";
    }
}

function getRoleBadgeLabel(role: string): { label: string; gradient: string } {
    const map: Record<string, { label: string; gradient: string }> = {
        STUDENT: { label: "Student", gradient: "from-blue-500 to-teal-500" },
        LEARNER: { label: "Student", gradient: "from-blue-500 to-teal-500" },
        CREATOR: { label: "Creator", gradient: "from-purple-500 to-pink-500" },
        TUTOR: { label: "Tutor", gradient: "from-orange-500 to-amber-500" },
        ADMIN: { label: "Admin", gradient: "from-red-500 to-rose-500" },
    };
    return map[role.toUpperCase()] ?? { label: role, gradient: "from-teal-500 to-cyan-500" };
}

const TOTAL_STEPS = 6;

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 70 : -70,
        opacity: 0,
        scale: 0.97,
    }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (direction: number) => ({
        x: direction < 0 ? 70 : -70,
        opacity: 0,
        scale: 0.97,
    }),
};

const slideTransition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

export default function OnboardingModal({ user, open = true, onDismiss }: OnboardingModalProps) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);

    // Customization state
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [selectedGoal, setSelectedGoal] = useState<string>("");
    const [weeklyDigest, setWeeklyDigest] = useState(true);
    const [newNotifs, setNewNotifs] = useState(true);

    const startOptions = getRoleStartOptions(user?.role ?? "STUDENT");

    if (!open || !user) return null;

    function toggleInterest(key: string) {
        setSelectedInterests((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    }

    function goNext() {
        if (step < TOTAL_STEPS - 1) {
            setDirection(1);
            setStep((s) => s + 1);
        } else {
            handleDone();
        }
    }

    function goBack() {
        if (step > 0) {
            setDirection(-1);
            setStep((s) => s - 1);
        }
    }

    function handleDone() {
        // Save onboarding preferences to localStorage
        try {
            localStorage.setItem("sparkhub:interests", JSON.stringify(selectedInterests));
            localStorage.setItem("sparkhub:goal", selectedGoal);
            localStorage.setItem("sparkhub:pref:weeklyDigest", String(weeklyDigest));
            localStorage.setItem("sparkhub:pref:notifications", String(newNotifs));
        } catch {
            // localStorage may not be available in some contexts
        }
        onDismiss();
        router.push(getRoleStartHref(user.role));
    }

    const roleBadge = getRoleBadgeLabel(user?.role ?? "STUDENT");

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onDismiss}
            />

            {/* Modal card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-lg rounded-[32px] bg-white dark:bg-slate-800 border border-white/60 dark:border-slate-700/60 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top gradient strip */}
                <div className="absolute top-0 inset-x-0 h-1 rounded-t-[32px] bg-gradient-to-r from-[#63C0B9] via-[#5B8FDE] to-[#A78FE0]" />

                {/* Skip button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Skip onboarding"
                >
                    <X className="h-3.5 w-3.5" />
                    Skip
                </button>

                {/* Step content */}
                <div className="overflow-hidden" style={{ minHeight: 420 }}>
                    <AnimatePresence custom={direction} mode="wait">
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTransition}
                        >
                            {step === 0 && <StepWelcome user={user} roleBadge={roleBadge} />}
                            {step === 1 && <StepFeatures />}
                            {step === 2 && (
                                <StepInterests
                                    selectedInterests={selectedInterests}
                                    toggleInterest={toggleInterest}
                                />
                            )}
                            {step === 3 && (
                                <StepGoalAndPrefs
                                    selectedGoal={selectedGoal}
                                    setSelectedGoal={setSelectedGoal}
                                    weeklyDigest={weeklyDigest}
                                    setWeeklyDigest={setWeeklyDigest}
                                    newNotifs={newNotifs}
                                    setNewNotifs={setNewNotifs}
                                />
                            )}
                            {step === 4 && (
                                <StepGetStarted
                                    startOptions={startOptions}
                                    onSelect={(href) => { onDismiss(); router.push(href); }}
                                />
                            )}
                            {step === 5 && (
                                <StepDone
                                    userName={user.name}
                                    interests={selectedInterests}
                                    goal={selectedGoal}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 flex flex-col items-center gap-4">
                    {/* Progress dots */}
                    <div className="flex items-center gap-2">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
                                className={`rounded-full transition-all duration-300 ${
                                    i === step
                                        ? "h-2.5 w-6 bg-gradient-to-r from-[#63C0B9] to-[#5B8FDE]"
                                        : i < step
                                            ? "h-2.5 w-2.5 bg-[#63C0B9]/60"
                                            : "h-2.5 w-2.5 bg-slate-200 dark:bg-slate-600 hover:bg-[#63C0B9]/50"
                                }`}
                                aria-label={`Go to step ${i + 1}`}
                            />
                        ))}
                    </div>

                    {/* Step counter */}
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 -mt-1">
                        Step {step + 1} of {TOTAL_STEPS}
                    </p>

                    {/* Navigation buttons */}
                    <div className="flex w-full items-center justify-between gap-3">
                        {step > 0 ? (
                            <button
                                onClick={goBack}
                                className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={goNext}
                            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#63C0B9] to-[#2D8F80] px-6 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-[#63C0B9]/25 hover:opacity-90 transition-opacity"
                        >
                            {step === TOTAL_STEPS - 1 ? (
                                <>Start Exploring <Sparkles className="h-4 w-4" /></>
                            ) : (
                                <>
                                    {step === 2 && selectedInterests.length === 0 ? "Skip" : "Next"}
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ── Step 1: Welcome ── */
function StepWelcome({
    user,
    roleBadge,
}: {
    user: { name?: string; role: string };
    roleBadge: { label: string; gradient: string };
}) {
    return (
        <div className="flex flex-col items-center px-8 pt-12 pb-6 text-center">
            {/* Logo mark with animated bounce */}
            <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 280, damping: 18 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#63C0B9] to-[#2D8F80] shadow-xl shadow-[#63C0B9]/30"
            >
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.7, delay: 0.8 }}
                >
                    <Zap className="h-10 w-10 text-white" fill="white" />
                </motion.div>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-3 text-2xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                Welcome to SparkHub{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </motion.h1>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.22 }}
            >
                <span className={`mb-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${roleBadge.gradient} px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm`}>
                    <GraduationCap className="h-3.5 w-3.5" />
                    {roleBadge.label}
                </span>
            </motion.div>

            <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mt-2"
            >
                We&apos;ll take you through a quick tour and help set up your experience. It takes less than a minute.
            </motion.p>

            {/* Quick stat chips */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                className="mt-5 flex gap-2 flex-wrap justify-center"
            >
                {["Courses", "Tutors", "Resources", "Events"].map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-3 py-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">
                        {item}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

/* ── Step 2: Features ── */
function StepFeatures() {
    return (
        <div className="px-8 pt-10 pb-6">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-1 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                Everything in one place
            </motion.h2>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mb-5 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                SparkHub brings your entire learning journey together.
            </motion.p>
            <div className="grid grid-cols-3 gap-3">
                {FEATURES.map(({ icon, label, color }, i) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.045 }}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 px-2 py-3 text-center"
                    >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
                            {icon}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-tight">
                            {label}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

/* ── Step 3: Interests ── */
function StepInterests({
    selectedInterests,
    toggleInterest,
}: {
    selectedInterests: string[];
    toggleInterest: (key: string) => void;
}) {
    return (
        <div className="px-8 pt-10 pb-6">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-1 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                What interests you?
            </motion.h2>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mb-5 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                Select topics you&apos;d like to explore. We&apos;ll tailor suggestions for you.
            </motion.p>

            <div className="flex flex-wrap gap-2.5 justify-center">
                {INTEREST_CHIPS.map(({ icon, label, key }, i) => {
                    const isSelected = selectedInterests.includes(key);
                    return (
                        <motion.button
                            key={key}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleInterest(key)}
                            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold border transition-all ${
                                isSelected
                                    ? "bg-gradient-to-r from-[#63C0B9] to-[#2D8F80] text-white border-transparent shadow-md shadow-[#63C0B9]/20"
                                    : "bg-white dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#63C0B9]/40 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20"
                            }`}
                        >
                            <span className={isSelected ? "text-white" : "text-[#63C0B9]"}>
                                {icon}
                            </span>
                            {label}
                            {isSelected && <Check className="h-3.5 w-3.5 ml-0.5" />}
                        </motion.button>
                    );
                })}
            </div>

            {selectedInterests.length > 0 && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-center text-[12px] text-[#2D8F80] dark:text-teal-400 font-medium"
                >
                    {selectedInterests.length} topic{selectedInterests.length !== 1 ? "s" : ""} selected
                </motion.p>
            )}
        </div>
    );
}

/* ── Step 4: Goal + Preferences ── */
function StepGoalAndPrefs({
    selectedGoal,
    setSelectedGoal,
    weeklyDigest,
    setWeeklyDigest,
    newNotifs,
    setNewNotifs,
}: {
    selectedGoal: string;
    setSelectedGoal: (g: string) => void;
    weeklyDigest: boolean;
    setWeeklyDigest: (v: boolean) => void;
    newNotifs: boolean;
    setNewNotifs: (v: boolean) => void;
}) {
    return (
        <div className="px-8 pt-10 pb-6">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-1 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                Personalize your experience
            </motion.h2>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mb-5 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                Tell us your goal and set your notification preferences.
            </motion.p>

            {/* Learning Goal */}
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Learning Goal
            </p>
            <div className="space-y-2 mb-5">
                {LEARNING_GOALS.map(({ key, label, description }, i) => (
                    <motion.button
                        key={key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedGoal(key)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left border transition-all ${
                            selectedGoal === key
                                ? "border-[#63C0B9]/60 bg-[#E9F7F5] dark:bg-teal-900/20"
                                : "border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 hover:border-[#63C0B9]/30"
                        }`}
                    >
                        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            selectedGoal === key
                                ? "border-[#63C0B9] bg-[#63C0B9]"
                                : "border-slate-300 dark:border-slate-500"
                        }`}>
                            {selectedGoal === key && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <div>
                            <p className={`text-[13px] font-semibold ${selectedGoal === key ? "text-[#2D8F80] dark:text-teal-300" : "text-slate-700 dark:text-slate-200"}`}>
                                {label}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{description}</p>
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* Notification Preferences */}
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Notifications
            </p>
            <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                        {weeklyDigest ? <Bell className="h-4 w-4 text-[#63C0B9]" /> : <BellOff className="h-4 w-4 text-slate-400" />}
                        <div>
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Weekly Digest</p>
                            <p className="text-[11px] text-slate-400">Summary of activity every Monday</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setWeeklyDigest(!weeklyDigest)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${weeklyDigest ? "bg-[#63C0B9]" : "bg-slate-200 dark:bg-slate-600"}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${weeklyDigest ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 px-4 py-3">
                    <div className="flex items-center gap-3">
                        {newNotifs ? <Bell className="h-4 w-4 text-[#63C0B9]" /> : <BellOff className="h-4 w-4 text-slate-400" />}
                        <div>
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">In-App Notifications</p>
                            <p className="text-[11px] text-slate-400">New messages and updates</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setNewNotifs(!newNotifs)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${newNotifs ? "bg-[#63C0B9]" : "bg-slate-200 dark:bg-slate-600"}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${newNotifs ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Step 5: Get Started ── */
function StepGetStarted({
    startOptions,
    onSelect,
}: {
    startOptions: StartOption[];
    onSelect: (href: string) => void;
}) {
    return (
        <div className="px-8 pt-10 pb-6">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-1 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                Where would you like to start?
            </motion.h2>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mb-5 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                Jump straight to what matters most to you.
            </motion.p>
            <div className="flex flex-col gap-3">
                {startOptions.map(({ icon, label, description, href, color }, i) => (
                    <motion.button
                        key={href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(href)}
                        className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 px-5 py-4 text-left hover:border-[#63C0B9]/40 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20 transition-all group"
                    >
                        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md group-hover:scale-105 transition-transform`}>
                            {icon}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[14px] text-slate-800 dark:text-slate-100">{label}</p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#63C0B9] group-hover:translate-x-0.5 transition-all" />
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

/* ── Step 6: Done ── */
function StepDone({
    userName,
    interests,
    goal,
}: {
    userName?: string;
    interests: string[];
    goal: string;
}) {
    const goalLabel = LEARNING_GOALS.find((g) => g.key === goal)?.label ?? "Exploring";
    const interestLabels = INTEREST_CHIPS
        .filter((c) => interests.includes(c.key))
        .map((c) => c.label)
        .slice(0, 4);

    return (
        <div className="flex flex-col items-center px-8 pt-10 pb-6 text-center">
            {/* Animated celebration icon */}
            <motion.div
                initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 14 }}
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#63C0B9] to-[#2D8F80] shadow-xl shadow-[#63C0B9]/30"
            >
                <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                    className="text-4xl leading-none"
                >
                    🎉
                </motion.span>
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                You&apos;re all set{userName ? `, ${userName.split(" ")[0]}` : ""}!
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm"
            >
                Your SparkHub experience is personalized and ready to go.
            </motion.p>

            {/* Summary of selected preferences */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="mt-5 w-full rounded-2xl bg-[#F4F7FB] dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 px-5 py-4 text-left space-y-3"
            >
                {goal && (
                    <div className="flex items-center gap-2.5">
                        <Target className="h-4 w-4 text-[#63C0B9] flex-shrink-0" />
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Goal</p>
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{goalLabel}</p>
                        </div>
                    </div>
                )}
                {interestLabels.length > 0 && (
                    <div className="flex items-start gap-2.5">
                        <Sparkles className="h-4 w-4 text-[#63C0B9] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Interests</p>
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                {interestLabels.join(", ")}
                                {interests.length > 4 ? ` +${interests.length - 4} more` : ""}
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-[#63C0B9] flex-shrink-0" />
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Notifications</p>
                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Configured and saved</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
