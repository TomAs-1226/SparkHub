"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface RatingItem {
    id: string;
    rating: number;
    review?: string | null;
    createdAt: string;
    user: { id: string; name: string; avatarUrl?: string | null };
}

interface Props {
    courseId: string;
    isEnrolled: boolean;
    userId?: string;
}

function Stars({ value, onChange, size = 6 }: { value: number; onChange?: (v: number) => void; size?: number }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={!onChange}
                    onClick={() => onChange?.(n)}
                    onMouseEnter={() => onChange && setHover(n)}
                    onMouseLeave={() => onChange && setHover(0)}
                    className="focus:outline-none disabled:cursor-default"
                >
                    <Star
                        className={`h-${size} w-${size} transition-colors ${
                            n <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

function timeAgo(dateStr: string) {
    const d = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(d / 86400000);
    if (days < 1) return "today";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function CourseRatings({ courseId, isEnrolled, userId }: Props) {
    const [ratings, setRatings] = useState<RatingItem[]>([]);
    const [average, setAverage] = useState(0);
    const [total, setTotal] = useState(0);
    const [distribution, setDistribution] = useState<Record<number, number>>({});
    const [myRating, setMyRating] = useState(0);
    const [myReview, setMyReview] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);

    const load = useCallback(async () => {
        try {
            const [rRes, mRes] = await Promise.all([
                fetch(`/api/ratings/${courseId}`),
                isEnrolled ? api(`/ratings/${courseId}/mine`) : Promise.resolve(null),
            ]);
            const rJson = await rRes.json().catch(() => null);
            if (rJson?.ok) {
                setRatings(rJson.ratings || []);
                setAverage(rJson.average || 0);
                setTotal(rJson.total || 0);
                setDistribution(rJson.distribution || {});
            }
            if (mRes) {
                const mJson = await mRes.json().catch(() => null);
                if (mJson?.rating) {
                    setMyRating(mJson.rating.rating);
                    setMyReview(mJson.rating.review || "");
                    setSubmitted(true);
                }
            }
        } catch {
            // keep previous
        } finally {
            setLoading(false);
        }
    }, [courseId, isEnrolled]);

    useEffect(() => { load(); }, [load]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!myRating) return;
        setSubmitting(true);
        try {
            const res = await api(`/ratings/${courseId}`, {
                method: "POST",
                body: JSON.stringify({ rating: myRating, review: myReview }),
            });
            const json = await res.json().catch(() => null);
            if (json?.ok) {
                setSubmitted(true);
                await load();
            }
        } catch {
            // ignore
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading ratings…
            </div>
        );
    }

    return (
        <section id="ratings" className="space-y-4">
            <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Course Ratings</h3>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{average.toFixed(1)}</p>
                        <Stars value={Math.round(average)} size={4} />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{total} review{total !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((n) => {
                            const count = distribution[n] || 0;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                                <div key={n} className="flex items-center gap-2 text-xs">
                                    <span className="w-3 text-right text-slate-500 dark:text-slate-400">{n}</span>
                                    <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-6 text-slate-400 dark:text-slate-500">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Submit rating */}
            {isEnrolled && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                        {submitted ? "Your rating" : "Rate this course"}
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <Stars value={myRating} onChange={submitted ? undefined : (v) => setMyRating(v)} size={6} />
                        {(!submitted || myReview) && (
                            <textarea
                                value={myReview}
                                onChange={(e) => setMyReview(e.target.value)}
                                disabled={submitted}
                                placeholder="Write a review (optional)…"
                                rows={3}
                                maxLength={2000}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#63C0B9] resize-none disabled:opacity-60"
                            />
                        )}
                        {!submitted && (
                            <button
                                type="submit"
                                disabled={!myRating || submitting}
                                className="rounded-full bg-[#2D8F80] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60 hover:bg-[#1F6C62]"
                            >
                                {submitting ? "Submitting…" : "Submit rating"}
                            </button>
                        )}
                        {submitted && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">Thanks for your review!</p>
                        )}
                    </form>
                </div>
            )}

            {/* Reviews */}
            {ratings.filter((r) => r.review).length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reviews</p>
                    {ratings
                        .filter((r) => r.review)
                        .slice(0, 10)
                        .map((r) => (
                            <div key={r.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.user.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Stars value={r.rating} size={3} />
                                            <span className="text-xs text-slate-400">{timeAgo(r.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                                {r.review && (
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{r.review}</p>
                                )}
                            </div>
                        ))}
                </div>
            )}
        </section>
    );
}
