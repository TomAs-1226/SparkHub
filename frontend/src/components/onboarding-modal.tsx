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
    Camera,
    UploadCloud,
    Video,
    Award,
    Megaphone,
    Star,
    Radio,
    Clock,
    Activity,
    Lock,
    FileText,
    UserCheck,
    Layers,
} from "lucide-react";
import { uploadAsset } from "@/lib/upload";
import { api } from "@/lib/api";

/* ─────────────────────── Types ─────────────────────── */

interface OnboardingModalProps {
    user: { id?: string; name?: string; role: string; avatarUrl?: string } | null;
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

interface GoalOption {
    key: string;
    label: string;
    description: string;
}

/* ─────────────────────── Role-specific data ─────────────────────── */

const ROLE_FEATURES: Record<string, FeatureTile[]> = {
    STUDENT: [
        { icon: <BookOpen className="h-4 w-4" />, label: "Courses", color: "from-blue-500 to-blue-700" },
        { icon: <Users className="h-4 w-4" />, label: "Tutoring", color: "from-purple-500 to-purple-700" },
        { icon: <Calendar className="h-4 w-4" />, label: "Events", color: "from-orange-500 to-orange-700" },
        { icon: <Briefcase className="h-4 w-4" />, label: "Opportunities", color: "from-green-500 to-green-700" },
        { icon: <Sparkles className="h-4 w-4" />, label: "AI Assistant", color: "from-pink-500 to-pink-700" },
        { icon: <Library className="h-4 w-4" />, label: "Resources", color: "from-yellow-500 to-yellow-700" },
        { icon: <MessageCircle className="h-4 w-4" />, label: "Discussions", color: "from-teal-500 to-teal-700" },
        { icon: <BarChart2 className="h-4 w-4" />, label: "Progress Tracking", color: "from-indigo-500 to-indigo-700" },
        { icon: <Inbox className="h-4 w-4" />, label: "Your Inbox", color: "from-cyan-500 to-cyan-700" },
    ],
    CREATOR: [
        { icon: <Palette className="h-4 w-4" />, label: "Creator Studio", color: "from-purple-500 to-purple-700" },
        { icon: <Video className="h-4 w-4" />, label: "Lesson Builder", color: "from-blue-500 to-blue-700" },
        { icon: <UploadCloud className="h-4 w-4" />, label: "Materials Upload", color: "from-green-500 to-green-700" },
        { icon: <Radio className="h-4 w-4" />, label: "Live Sessions", color: "from-red-500 to-red-700" },
        { icon: <Award className="h-4 w-4" />, label: "Certificates", color: "from-yellow-500 to-yellow-700" },
        { icon: <Users className="h-4 w-4" />, label: "Student Roster", color: "from-teal-500 to-teal-700" },
        { icon: <Megaphone className="h-4 w-4" />, label: "Announcements", color: "from-orange-500 to-orange-700" },
        { icon: <BarChart2 className="h-4 w-4" />, label: "Analytics", color: "from-indigo-500 to-indigo-700" },
        { icon: <Sparkles className="h-4 w-4" />, label: "AI Assistant", color: "from-pink-500 to-pink-700" },
    ],
    TUTOR: [
        { icon: <UserCheck className="h-4 w-4" />, label: "My Profile", color: "from-blue-500 to-blue-700" },
        { icon: <Zap className="h-4 w-4" />, label: "Smart Matching", color: "from-purple-500 to-purple-700" },
        { icon: <Calendar className="h-4 w-4" />, label: "Availability", color: "from-orange-500 to-orange-700" },
        { icon: <Clock className="h-4 w-4" />, label: "Session History", color: "from-green-500 to-green-700" },
        { icon: <Star className="h-4 w-4" />, label: "Reviews & Ratings", color: "from-yellow-500 to-yellow-700" },
        { icon: <BookOpen className="h-4 w-4" />, label: "Subject Expertise", color: "from-teal-500 to-teal-700" },
        { icon: <MessageCircle className="h-4 w-4" />, label: "Messaging", color: "from-pink-500 to-pink-700" },
        { icon: <TrendingUp className="h-4 w-4" />, label: "Earnings Track", color: "from-indigo-500 to-indigo-700" },
        { icon: <Sparkles className="h-4 w-4" />, label: "AI Assistant", color: "from-cyan-500 to-cyan-700" },
    ],
    ADMIN: [
        { icon: <Users className="h-4 w-4" />, label: "User Management", color: "from-blue-500 to-blue-700" },
        { icon: <Shield className="h-4 w-4" />, label: "Moderation", color: "from-red-500 to-red-700" },
        { icon: <BarChart2 className="h-4 w-4" />, label: "Analytics", color: "from-green-500 to-green-700" },
        { icon: <Megaphone className="h-4 w-4" />, label: "Broadcast", color: "from-orange-500 to-orange-700" },
        { icon: <Inbox className="h-4 w-4" />, label: "Inbox Digest", color: "from-teal-500 to-teal-700" },
        { icon: <Activity className="h-4 w-4" />, label: "Health Monitor", color: "from-yellow-500 to-yellow-700" },
        { icon: <Lock className="h-4 w-4" />, label: "Roles & Perms", color: "from-purple-500 to-purple-700" },
        { icon: <FileText className="h-4 w-4" />, label: "Audit Logs", color: "from-indigo-500 to-indigo-700" },
        { icon: <Layers className="h-4 w-4" />, label: "Platform Config", color: "from-cyan-500 to-cyan-700" },
    ],
};

const ROLE_INTEREST_LABEL: Record<string, string> = {
    STUDENT: "What topics interest you?",
    CREATOR: "What subjects do you create content for?",
    TUTOR: "What subjects do you specialize in?",
    ADMIN: "What are your platform priorities?",
};

const ROLE_INTEREST_SUB: Record<string, string> = {
    STUDENT: "We'll tailor course and resource suggestions for you.",
    CREATOR: "Help students find your courses through better discovery.",
    TUTOR: "Get matched with students looking for your expertise.",
    ADMIN: "Focus your dashboard around what matters most.",
};

const LEARNING_INTERESTS: InterestChip[] = [
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

const ADMIN_PRIORITIES: InterestChip[] = [
    { icon: <Users className="h-4 w-4" />, label: "User Growth", key: "growth" },
    { icon: <Shield className="h-4 w-4" />, label: "Content Quality", key: "quality" },
    { icon: <Activity className="h-4 w-4" />, label: "Performance", key: "performance" },
    { icon: <MessageCircle className="h-4 w-4" />, label: "Community Building", key: "community" },
    { icon: <Lock className="h-4 w-4" />, label: "Security", key: "security" },
    { icon: <BarChart2 className="h-4 w-4" />, label: "Analytics", key: "analytics" },
    { icon: <Zap className="h-4 w-4" />, label: "Integrations", key: "integrations" },
    { icon: <FileText className="h-4 w-4" />, label: "Documentation", key: "docs" },
];

const ROLE_GOALS: Record<string, GoalOption[]> = {
    STUDENT: [
        { key: "exploring", label: "Just Exploring", description: "Curious about what's here" },
        { key: "skill", label: "Building a New Skill", description: "Learning something specific" },
        { key: "career", label: "Career Change", description: "Transitioning to a new field" },
        { key: "professional", label: "Professional Growth", description: "Advancing in my role" },
        { key: "academic", label: "Academic Study", description: "Supporting coursework" },
    ],
    CREATOR: [
        { key: "share", label: "Share My Knowledge", description: "Teach what I know best" },
        { key: "audience", label: "Build an Audience", description: "Grow my following" },
        { key: "revenue", label: "Generate Revenue", description: "Monetize my expertise" },
        { key: "supplement", label: "Supplement Teaching", description: "Extend classroom learning" },
        { key: "business", label: "Launch a Course Business", description: "Full-time creator" },
    ],
    TUTOR: [
        { key: "help", label: "Help Students Succeed", description: "Make a difference" },
        { key: "income", label: "Earn Extra Income", description: "Tutoring as a side income" },
        { key: "reputation", label: "Build My Reputation", description: "Establish expertise" },
        { key: "fulltime", label: "Full-time Tutoring", description: "Make it my main work" },
        { key: "niche", label: "Find Niche Students", description: "Specialised one-to-one" },
    ],
    ADMIN: [
        { key: "new", label: "Set Up a New Platform", description: "Fresh deployment" },
        { key: "manage", label: "Manage a Community", description: "Existing user base" },
        { key: "scale", label: "Scale Up Users", description: "Growing the platform" },
        { key: "quality", label: "Improve Content Quality", description: "Raise standards" },
        { key: "monitor", label: "Monitor Platform Health", description: "Ops & reliability" },
    ],
};

function getRoleStartOptions(role: string): StartOption[] {
    const normalised = role.toUpperCase();
    switch (normalised) {
        case "CREATOR":
            return [
                { icon: <Palette className="h-5 w-5" />, label: "Open Creator Studio", description: "Build and publish your first course.", href: "/courses/studio", color: "from-purple-500 to-purple-700" },
                { icon: <BookOpen className="h-5 w-5" />, label: "Browse Courses", description: "See what others have built.", href: "/courses", color: "from-blue-500 to-blue-700" },
                { icon: <BarChart2 className="h-5 w-5" />, label: "View Dashboard", description: "See your stats and progress.", href: "/dashboard", color: "from-teal-500 to-teal-700" },
            ];
        case "TUTOR":
            return [
                { icon: <LayoutDashboard className="h-5 w-5" />, label: "Set Up Your Profile", description: "Get discovered by students.", href: "/tutors/dashboard", color: "from-orange-500 to-orange-700" },
                { icon: <Users className="h-5 w-5" />, label: "Browse Tutors", description: "See how others present themselves.", href: "/tutors", color: "from-purple-500 to-purple-700" },
                { icon: <Calendar className="h-5 w-5" />, label: "Set Availability", description: "When are you available to tutor?", href: "/tutors/dashboard", color: "from-green-500 to-green-700" },
            ];
        case "ADMIN":
            return [
                { icon: <Shield className="h-5 w-5" />, label: "Admin Panel", description: "Manage users and platform content.", href: "/admin", color: "from-red-500 to-red-700" },
                { icon: <Palette className="h-5 w-5" />, label: "Creator Studio", description: "Create and manage courses.", href: "/courses/studio", color: "from-purple-500 to-purple-700" },
                { icon: <BarChart2 className="h-5 w-5" />, label: "View Dashboard", description: "Platform overview and metrics.", href: "/dashboard", color: "from-teal-500 to-teal-700" },
            ];
        default:
            return [
                { icon: <BookOpen className="h-5 w-5" />, label: "Browse Courses", description: "Discover courses for your interests.", href: "/courses", color: "from-blue-500 to-blue-700" },
                { icon: <Users className="h-5 w-5" />, label: "Find a Tutor", description: "Connect with expert tutors.", href: "/tutors", color: "from-purple-500 to-purple-700" },
                { icon: <Library className="h-5 w-5" />, label: "Explore Resources", description: "Access study guides and materials.", href: "/resources", color: "from-orange-500 to-orange-700" },
            ];
    }
}

function getRoleStartHref(role: string): string {
    const n = role.toUpperCase();
    if (n === "CREATOR") return "/courses/studio";
    if (n === "TUTOR") return "/tutors/dashboard";
    if (n === "ADMIN") return "/admin";
    return "/courses";
}

function getRoleBadge(role: string): { label: string; gradient: string } {
    const map: Record<string, { label: string; gradient: string }> = {
        STUDENT: { label: "Student", gradient: "from-blue-500 to-teal-500" },
        LEARNER: { label: "Student", gradient: "from-blue-500 to-teal-500" },
        CREATOR: { label: "Creator", gradient: "from-purple-500 to-pink-500" },
        TUTOR: { label: "Tutor", gradient: "from-orange-500 to-amber-500" },
        ADMIN: { label: "Admin", gradient: "from-red-500 to-rose-500" },
    };
    return map[role.toUpperCase()] ?? { label: role, gradient: "from-teal-500 to-cyan-500" };
}

function getRoleWelcomeMessage(role: string): string {
    const n = role.toUpperCase();
    if (n === "CREATOR") return "Your teaching studio is ready — let's get you set up.";
    if (n === "TUTOR") return "Connect with students who need your expertise.";
    if (n === "ADMIN") return "You have full platform control. Let's configure your experience.";
    return "Your learning journey starts here. Let's personalize it for you.";
}

/* ─────────────────────── Slide animation ─────────────────────── */

const TOTAL_STEPS = 6;

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 60 : -60, opacity: 0, scale: 0.97 }),
};
const slideTx = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

/* ─────────────────────── Main component ─────────────────────── */

export default function OnboardingModal({ user, open = true, onDismiss }: OnboardingModalProps) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [dir, setDir] = useState(1);
    const [saving, setSaving] = useState(false);

    // Profile step state — init from user prop
    // Init from displayName if set, fall back to name
    const [profileName, setProfileName] = useState((user as any)?.displayName ?? user?.name ?? "");
    const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl ?? "");
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Interest/customization state
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [selectedGoal, setSelectedGoal] = useState("");
    const [weeklyDigest, setWeeklyDigest] = useState(true);
    const [inAppNotifs, setInAppNotifs] = useState(true);

    if (!open || !user) return null;

    const role = user.role?.toUpperCase() ?? "STUDENT";
    const roleBadge = getRoleBadge(role);
    const startOptions = getRoleStartOptions(role);
    const features = ROLE_FEATURES[role] ?? ROLE_FEATURES.STUDENT;
    const interestChips = role === "ADMIN" ? ADMIN_PRIORITIES : LEARNING_INTERESTS;
    const goalOptions = ROLE_GOALS[role] ?? ROLE_GOALS.STUDENT;

    function toggleInterest(key: string) {
        setSelectedInterests((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    }

    async function handleAvatarUpload() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
            if (!input.files?.[0]) return;
            setAvatarUploading(true);
            try {
                const url = await uploadAsset(input.files[0]);
                setProfileAvatar(url);
            } catch {
                // non-blocking
            } finally {
                setAvatarUploading(false);
            }
        };
        input.click();
    }

    async function saveProfile() {
        if (!profileName.trim()) return;
        setSaving(true);
        try {
            await api("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({ displayName: profileName.trim(), avatarUrl: profileAvatar }),
            });
        } catch {
            // non-blocking — don't block progression
        } finally {
            setSaving(false);
        }
    }

    async function goNext() {
        // Save profile when leaving step 1
        if (step === 1) await saveProfile();

        if (step < TOTAL_STEPS - 1) {
            setDir(1);
            setStep((s) => s + 1);
        } else {
            handleDone();
        }
    }

    function goBack() {
        if (step > 0) {
            setDir(-1);
            setStep((s) => s - 1);
        }
    }

    function handleDone() {
        try {
            localStorage.setItem("sparkhub:interests", JSON.stringify(selectedInterests));
            localStorage.setItem("sparkhub:goal", selectedGoal);
            localStorage.setItem("sparkhub:pref:weeklyDigest", String(weeklyDigest));
            localStorage.setItem("sparkhub:pref:notifications", String(inAppNotifs));
        } catch { /* noop */ }
        onDismiss();
        router.push(getRoleStartHref(role));
    }

    const nextLabel = step === TOTAL_STEPS - 1
        ? "Start Exploring"
        : step === 1
            ? saving ? "Saving…" : "Save & Continue"
            : step === 2 && selectedInterests.length === 0 ? "Skip"
                : "Next";

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

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-lg rounded-[32px] bg-white dark:bg-slate-800 border border-white/60 dark:border-slate-700/60 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress bar — fixed at top, no layout shift */}
                <div className="absolute top-0 inset-x-0 h-1 bg-slate-100 dark:bg-slate-700">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[#63C0B9] to-[#5B8FDE]"
                        animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                </div>

                {/* Skip */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <X className="h-3.5 w-3.5" /> Skip
                </button>

                {/* Step content */}
                <div className="overflow-hidden" style={{ minHeight: 440 }}>
                    <AnimatePresence custom={dir} mode="wait">
                        <motion.div
                            key={step}
                            custom={dir}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTx}
                        >
                            {step === 0 && <StepWelcome user={user} roleBadge={roleBadge} message={getRoleWelcomeMessage(role)} />}
                            {step === 1 && (
                                <StepProfile
                                    profileName={profileName}
                                    setProfileName={setProfileName}
                                    profileAvatar={profileAvatar}
                                    handleAvatarUpload={handleAvatarUpload}
                                    avatarUploading={avatarUploading}
                                    userName={user.name}
                                />
                            )}
                            {step === 2 && <StepFeatures features={features} role={role} />}
                            {step === 3 && (
                                <StepInterests
                                    chips={interestChips}
                                    selected={selectedInterests}
                                    toggle={toggleInterest}
                                    title={ROLE_INTEREST_LABEL[role] ?? ROLE_INTEREST_LABEL.STUDENT}
                                    subtitle={ROLE_INTEREST_SUB[role] ?? ROLE_INTEREST_SUB.STUDENT}
                                />
                            )}
                            {step === 4 && (
                                <StepGoalAndPrefs
                                    goalOptions={goalOptions}
                                    selectedGoal={selectedGoal}
                                    setSelectedGoal={setSelectedGoal}
                                    weeklyDigest={weeklyDigest}
                                    setWeeklyDigest={setWeeklyDigest}
                                    inAppNotifs={inAppNotifs}
                                    setInAppNotifs={setInAppNotifs}
                                />
                            )}
                            {step === 5 && (
                                <StepDone
                                    userName={profileName || user.name}
                                    profileAvatar={profileAvatar}
                                    interests={selectedInterests}
                                    interestChips={interestChips}
                                    goal={selectedGoal}
                                    goalOptions={goalOptions}
                                    role={role}
                                    startOptions={startOptions}
                                    onSelect={(href) => { onDismiss(); router.push(href); }}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-8 pb-7 pt-2 flex flex-col items-center gap-3">
                    {/* Step dots — fixed size, no layout shift */}
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setDir(i > step ? 1 : -1); setStep(i); }}
                                aria-label={`Step ${i + 1}`}
                                className={`rounded-full transition-colors duration-300 h-2 w-2 ${
                                    i === step
                                        ? "bg-[#63C0B9] scale-125"
                                        : i < step
                                            ? "bg-[#63C0B9]/50"
                                            : "bg-slate-200 dark:bg-slate-600"
                                }`}
                            />
                        ))}
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Step {step + 1} of {TOTAL_STEPS}
                    </p>

                    {/* Nav buttons */}
                    <div className="flex w-full items-center justify-between gap-3">
                        {step > 0 ? (
                            <button
                                onClick={goBack}
                                className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-[14px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                        ) : <div />}

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={goNext}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#63C0B9] to-[#2D8F80] px-6 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-[#63C0B9]/25 hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {nextLabel}
                            {step === TOTAL_STEPS - 1
                                ? <Sparkles className="h-4 w-4" />
                                : <ArrowRight className="h-4 w-4" />}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ─────────────────────── Step 0: Welcome ─────────────────────── */
function StepWelcome({
    user,
    roleBadge,
    message,
}: {
    user: { name?: string };
    roleBadge: { label: string; gradient: string };
    message: string;
}) {
    return (
        <div className="flex flex-col items-center px-8 pt-12 pb-4 text-center">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 280, damping: 18 }}
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#63C0B9] to-[#2D8F80] shadow-xl shadow-[#63C0B9]/30"
            >
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.7, delay: 1 }}
                >
                    <Zap className="h-10 w-10 text-white" fill="white" />
                </motion.div>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="mb-2.5 text-2xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                Welcome to SparkHub{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </motion.h1>

            <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.22 }}
                className={`mb-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${roleBadge.gradient} px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm`}
            >
                <GraduationCap className="h-3.5 w-3.5" />
                {roleBadge.label}
            </motion.span>

            <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm"
            >
                {message}
            </motion.p>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42 }}
                className="mt-3 text-[12px] text-slate-400 dark:text-slate-500"
            >
                Quick 6-step setup — under 2 minutes
            </motion.p>
        </div>
    );
}

/* ─────────────────────── Step 1: Profile Setup ─────────────────────── */
function StepProfile({
    profileName,
    setProfileName,
    profileAvatar,
    handleAvatarUpload,
    avatarUploading,
    userName,
}: {
    profileName: string;
    setProfileName: (v: string) => void;
    profileAvatar: string;
    handleAvatarUpload: () => void;
    avatarUploading: boolean;
    userName?: string;
}) {
    const avatarSrc = profileAvatar ||
        `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(profileName || userName || "S")}`;

    return (
        <div className="px-8 pt-10 pb-4">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-1 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                Set up your profile
            </motion.h2>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mb-6 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                Choose a photo and confirm your display name.
            </motion.p>

            {/* Avatar picker */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-5 flex flex-col items-center gap-3"
            >
                <div className="relative">
                    <div
                        className="h-20 w-20 rounded-full border-2 border-white dark:border-slate-600 bg-slate-100 dark:bg-slate-700 shadow-lg overflow-hidden"
                        style={{
                            backgroundImage: `url(${avatarSrc})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={avatarUploading}
                        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#63C0B9] text-white shadow-md hover:bg-[#2D8F80] transition-colors disabled:opacity-60"
                    >
                        {avatarUploading
                            ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            : <Camera className="h-3.5 w-3.5" />}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={avatarUploading}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#63C0B9] hover:text-[#2D8F80] transition-colors"
                >
                    <UploadCloud className="h-3.5 w-3.5" />
                    {avatarUploading ? "Uploading…" : profileAvatar ? "Change photo" : "Upload photo"}
                </button>
            </motion.div>

            {/* Display name input */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Display Name
                </label>
                <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your name"
                    maxLength={60}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-[#F4F7FB] dark:bg-slate-700 px-4 py-3 text-[14px] font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#63C0B9]/50 focus:border-[#63C0B9] transition-all"
                />
                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    This is how you'll appear across SparkHub. You can change it anytime in settings.
                </p>
            </motion.div>
        </div>
    );
}

/* ─────────────────────── Step 2: Platform Features (role-specific) ─────────────────────── */
function StepFeatures({ features, role }: { features: FeatureTile[]; role: string }) {
    const titles: Record<string, string> = {
        STUDENT: "Everything you need to learn",
        CREATOR: "Your complete creator toolkit",
        TUTOR: "Tools built for tutors",
        ADMIN: "Full platform control",
    };
    const subs: Record<string, string> = {
        STUDENT: "Explore courses, connect with tutors, and track your growth.",
        CREATOR: "Build, publish, and manage courses from one studio.",
        TUTOR: "Get matched with students and grow your tutoring business.",
        ADMIN: "Manage users, content, health, and platform settings.",
    };

    return (
        <div className="px-8 pt-10 pb-4">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-1 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                {titles[role] ?? titles.STUDENT}
            </motion.h2>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.07 }}
                className="mb-5 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                {subs[role] ?? subs.STUDENT}
            </motion.p>
            <div className="grid grid-cols-3 gap-2.5">
                {features.map(({ icon, label, color }, i) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
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

/* ─────────────────────── Step 3: Interests / Specialization ─────────────────────── */
function StepInterests({
    chips,
    selected,
    toggle,
    title,
    subtitle,
}: {
    chips: InterestChip[];
    selected: string[];
    toggle: (key: string) => void;
    title: string;
    subtitle: string;
}) {
    return (
        <div className="px-8 pt-10 pb-4">
            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-1 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                {title}
            </motion.h2>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.07 }}
                className="mb-5 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                {subtitle}
            </motion.p>

            <div className="flex flex-wrap gap-2.5 justify-center">
                {chips.map(({ icon, label, key }, i) => {
                    const isSel = selected.includes(key);
                    return (
                        <motion.button
                            key={key}
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.038 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggle(key)}
                            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold border transition-all ${
                                isSel
                                    ? "bg-gradient-to-r from-[#63C0B9] to-[#2D8F80] text-white border-transparent shadow-md"
                                    : "bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#63C0B9]/40 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20"
                            }`}
                        >
                            <span className={isSel ? "text-white" : "text-[#63C0B9]"}>{icon}</span>
                            {label}
                            {isSel && <Check className="h-3.5 w-3.5 ml-0.5" />}
                        </motion.button>
                    );
                })}
            </div>

            {selected.length > 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-4 text-center text-[12px] text-[#2D8F80] dark:text-teal-400 font-medium"
                >
                    {selected.length} selected
                </motion.p>
            )}
        </div>
    );
}

/* ─────────────────────── Step 4: Goal + Prefs ─────────────────────── */
function StepGoalAndPrefs({
    goalOptions,
    selectedGoal,
    setSelectedGoal,
    weeklyDigest,
    setWeeklyDigest,
    inAppNotifs,
    setInAppNotifs,
}: {
    goalOptions: GoalOption[];
    selectedGoal: string;
    setSelectedGoal: (g: string) => void;
    weeklyDigest: boolean;
    setWeeklyDigest: (v: boolean) => void;
    inAppNotifs: boolean;
    setInAppNotifs: (v: boolean) => void;
}) {
    return (
        <div className="px-8 pt-10 pb-4 overflow-y-auto" style={{ maxHeight: 440 }}>
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
                transition={{ delay: 0.07 }}
                className="mb-4 text-center text-[13px] text-slate-500 dark:text-slate-400"
            >
                Set your primary goal and notification preferences.
            </motion.p>

            {/* Goal selector */}
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Primary Goal</p>
            <div className="space-y-1.5 mb-4">
                {goalOptions.map(({ key, label, description }, i) => (
                    <motion.button
                        key={key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.045 }}
                        onClick={() => setSelectedGoal(key)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left border transition-all ${
                            selectedGoal === key
                                ? "border-[#63C0B9]/60 bg-[#E9F7F5] dark:bg-teal-900/20"
                                : "border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 hover:border-[#63C0B9]/30"
                        }`}
                    >
                        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            selectedGoal === key ? "border-[#63C0B9] bg-[#63C0B9]" : "border-slate-300 dark:border-slate-500"
                        }`}>
                            {selectedGoal === key && <Check className="h-2.5 w-2.5 text-white" />}
                        </span>
                        <div>
                            <p className={`text-[13px] font-semibold ${selectedGoal === key ? "text-[#2D8F80] dark:text-teal-300" : "text-slate-700 dark:text-slate-200"}`}>
                                {label}
                            </p>
                            <p className="text-[11px] text-slate-400">{description}</p>
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* Notification toggles */}
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Notifications</p>
            <div className="space-y-2">
                {[
                    { key: "digest", label: "Weekly digest", sub: "AI summary every Monday in your inbox", state: weeklyDigest, set: setWeeklyDigest },
                    { key: "notifs", label: "In-app alerts", sub: "Messages and platform updates", state: inAppNotifs, set: setInAppNotifs },
                ].map(({ key, label, sub, state, set }) => (
                    <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 px-4 py-2.5">
                        <div>
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                            <p className="text-[11px] text-slate-400">{sub}</p>
                        </div>
                        <button
                            onClick={() => set(!state)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${state ? "bg-[#63C0B9]" : "bg-slate-200 dark:bg-slate-600"}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${state ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────── Step 5: Done ─────────────────────── */
function StepDone({
    userName,
    profileAvatar,
    interests,
    interestChips,
    goal,
    goalOptions,
    role,
    startOptions,
    onSelect,
}: {
    userName?: string;
    profileAvatar: string;
    interests: string[];
    interestChips: InterestChip[];
    goal: string;
    goalOptions: GoalOption[];
    role: string;
    startOptions: StartOption[];
    onSelect: (href: string) => void;
}) {
    const goalLabel = goalOptions.find((g) => g.key === goal)?.label ?? "Exploring";
    const interestLabels = interestChips.filter((c) => interests.includes(c.key)).map((c) => c.label).slice(0, 4);
    const avatarSrc = profileAvatar || `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(userName || "S")}`;

    return (
        <div className="px-8 pt-8 pb-4">
            {/* Avatar + name summary */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 flex flex-col items-center text-center"
            >
                <div
                    className="h-16 w-16 rounded-full border-2 border-[#63C0B9]/40 bg-slate-100 dark:bg-slate-700 shadow-lg mb-2"
                    style={{ backgroundImage: `url(${avatarSrc})`, backgroundSize: "cover", backgroundPosition: "center" }}
                />
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                    You&apos;re all set{userName ? `, ${userName.split(" ")[0]}` : ""}! 🎉
                </h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                    Your SparkHub experience is personalised and ready.
                </p>
            </motion.div>

            {/* Summary card */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="mb-4 rounded-2xl bg-[#F4F7FB] dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 px-4 py-3 space-y-2.5"
            >
                {goal && (
                    <div className="flex items-start gap-2.5">
                        <Target className="h-3.5 w-3.5 text-[#63C0B9] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Goal</p>
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{goalLabel}</p>
                        </div>
                    </div>
                )}
                {interestLabels.length > 0 && (
                    <div className="flex items-start gap-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#63C0B9] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {role === "ADMIN" ? "Priorities" : role === "TUTOR" ? "Expertise" : "Interests"}
                            </p>
                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                {interestLabels.join(", ")}{interests.length > 4 ? ` +${interests.length - 4} more` : ""}
                            </p>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Quick-start row */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Jump right in</p>
                <div className="flex flex-col gap-2">
                    {startOptions.slice(0, 2).map(({ icon, label, description, href, color }) => (
                        <button
                            key={href}
                            onClick={() => onSelect(href)}
                            className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-700/40 px-4 py-3 text-left hover:border-[#63C0B9]/40 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20 transition-all group"
                        >
                            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                                {icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                                <p className="text-[11px] text-slate-400">{description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#63C0B9] transition-colors" />
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
