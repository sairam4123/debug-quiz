"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Lock, Rocket, Flame, Zap, Target, Sparkles, Brain, Send,
    Trophy, Medal, Crown, Star, User, BarChart3, RotateCcw, Code2,
    ArrowRight, ArrowLeft,
} from "lucide-react";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAlert } from "@/components/providers/alert-provider";
import { Confetti } from "@/components/ui/confetti";
import { useMediaQuery } from "@/hooks/use-media-query";

// ----- Hype messages — tiered by speed & streak -----
import type { LucideIcon } from "lucide-react";

type HypeMessage = { Icon: LucideIcon; title: string; subtitle: string; color: string };

const HYPE_LIGHTNING: HypeMessage[] = [
    { Icon: Zap, title: "INSANE speed!", subtitle: "That was inhuman!", color: "#F59E0B" },
    { Icon: Rocket, title: "Blazing fast!", subtitle: "Nobody's catching you!", color: "#F43F5E" },
    { Icon: Flame, title: "Speed demon!", subtitle: "Are you even reading?!", color: "#F59E0B" },
];

const HYPE_FAST: HypeMessage[] = [
    { Icon: Zap, title: "Quick draw!", subtitle: "That was speedy!", color: "#14B8A6" },
    { Icon: Target, title: "Sharp & swift!", subtitle: "Didn't even hesitate!", color: "#10B981" },
    { Icon: Rocket, title: "Locked in!", subtitle: "No second-guessing!", color: "#0891B2" },
];

const HYPE_NORMAL: HypeMessage[] = [
    { Icon: Lock, title: "Locked in!", subtitle: "No turning back now!", color: "#0891B2" },
    { Icon: Rocket, title: "Submitted!", subtitle: "That was quick!", color: "#14B8A6" },
    { Icon: Target, title: "Answer sent!", subtitle: "Fingers crossed!", color: "#10B981" },
    { Icon: Sparkles, title: "Done!", subtitle: "Trust the process!", color: "#0EA5E9" },
    { Icon: Brain, title: "Big brain move!", subtitle: "Let's see how it plays out...", color: "#0891B2" },
    { Icon: Send, title: "Sent!", subtitle: "Way to commit!", color: "#06B6D4" },
];

const HYPE_STREAK: HypeMessage[] = [
    { Icon: Flame, title: "On fire!", subtitle: "", color: "#F43F5E" },
    { Icon: Zap, title: "Unstoppable!", subtitle: "", color: "#F59E0B" },
    { Icon: Sparkles, title: "Combo master!", subtitle: "", color: "#0EA5E9" },
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

function getHype(speedRatio: number, streak: number): HypeMessage {
    // Streak override (3+)
    if (streak >= 5) {
        const base = pick(HYPE_STREAK);
        return { ...base, title: "UNSTOPPABLE!", subtitle: `${streak} in a row — you're on fire!` };
    }
    if (streak >= 3) {
        const base = pick(HYPE_STREAK);
        return { ...base, subtitle: `${streak} in a row!` };
    }
    // Speed tiers (ratio = elapsed / total, lower = faster)
    if (speedRatio < 0.25) return pick(HYPE_LIGHTNING);
    if (speedRatio < 0.5) return pick(HYPE_FAST);
    return pick(HYPE_NORMAL);
}

// ----- Timer progress bar component -----
function TimerBar({ startTime, timeLimit, onExpire }: { startTime: string | null; timeLimit: number; onExpire?: () => void }) {
    const [progress, setProgress] = useState(100);
    const [hasFired, setHasFired] = useState(false);

    useEffect(() => {
        setHasFired(false);
    }, [startTime]);

    useEffect(() => {
        if (!startTime) return;
        const start = new Date(startTime).getTime();
        const durationMs = timeLimit * 1000;

        const tick = () => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
            setProgress(remaining);
            if (remaining <= 0 && !hasFired) {
                setHasFired(true);
                onExpire?.();
            }
        };

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [startTime, timeLimit, hasFired, onExpire]);

    const barColor =
        progress > 50 ? "bg-gradient-to-r from-teal-500 to-cyan-500" : progress > 20 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-rose-400 to-rose-500";

    const textColor =
        progress > 50 ? "text-teal-500" : progress > 20 ? "text-amber-500" : "text-rose-500";

    const remainingSeconds = Math.ceil((progress / 100) * timeLimit);

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted/50 rounded-full overflow-hidden">
                <div
                    className={`h-full ${barColor} rounded-full transition-all duration-100 ease-linear`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className={`text-lg font-bold tabular-nums min-w-[2ch] text-right ${textColor} ${remainingSeconds <= 5 ? "animate-pulse" : ""}`}>
                {remainingSeconds}
            </span>
        </div>
    );
}

// ----- Leaderboard entry type -----
type LeaderboardEntry = {
    rank: number;
    name: string;
    class: string;
    score: number;
    playerId: string;
};

// ----- Game state shape -----
type GameState = {
    status: string;
    currentQuestion: any;
    questionStartTime: string | null;
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    leaderboard: LeaderboardEntry[];
};

// ----- Rank icon helper -----
function RankIcon({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <Star className="h-5 w-5 text-muted-foreground/60" />;
}

export default function PlayPage() {
    const router = useRouter();
    const { alert } = useAlert();
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [gameStatus, setGameStatus] = useState<"WAITING" | "ACTIVE" | "ENDED">("WAITING");
    const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);

    // Join flow stage: 1 = code, 2 = name + class
    const [joinStep, setJoinStep] = useState<1 | 2>(1);
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [showClassSheet, setShowClassSheet] = useState(false);

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [hypeMessage, setHypeMessage] = useState<HypeMessage | null>(null);

    // Extra game metadata
    const [questionStartTime, setQuestionStartTime] = useState<string | null>(null);
    const [timeLimit, setTimeLimit] = useState(10);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    // SSE connection tracking
    const [sseConnected, setSseConnected] = useState(false);
    const [sseError, setSseError] = useState(false);

    // Track the last question ID we synced to avoid unnecessary resets
    const [lastSyncedQuestionId, setLastSyncedQuestionId] = useState<string | null>(null);

    // Question splash screen state
    const [showSplash, setShowSplash] = useState(false);

    // Timer expired — show between-question leaderboard
    const [timerExpired, setTimerExpired] = useState(false);
    const handleTimerExpire = useCallback(() => {
        setTimerExpired(true);
    }, []);

    // Answer streak tracking
    const [answerStreak, setAnswerStreak] = useState(0);
    // Ref to track whether current question was submitted (for streak calc on next question)
    const submittedRef = useRef(false);

    // --- Sync helper: apply game state from any source (SSE or polling) ---
    const syncGameState = useCallback((state: GameState) => {
        setGameStatus(state.status as any);
        setLeaderboard(state.leaderboard ?? []);

        const newQuestionId = state.currentQuestion?.id ?? null;
        if (newQuestionId && newQuestionId !== lastSyncedQuestionId) {
            setCurrentQuestion(state.currentQuestion);
            setLastSyncedQuestionId(newQuestionId);
            setSelectedOption(null);
            setIsSubmitted(false);
            setHypeMessage(null);
            setTimerExpired(false);
            // Update streak: if previous question was submitted, keep streak; else reset
            if (!submittedRef.current) {
                setAnswerStreak(0);
            }
            submittedRef.current = false;
            // Trigger splash screen for new question
            setShowSplash(true);
        }

        setQuestionStartTime(state.questionStartTime);
        setTimeLimit(state.timeLimit);
        setQuestionIndex(state.questionIndex);
        setTotalQuestions(state.totalQuestions);
    }, [lastSyncedQuestionId]);

    // --- Mutations ---
    const joinSession = api.quiz.joinSession.useMutation({
        onSuccess: (data) => {
            setPlayerId(data.playerId);
            setSessionId(data.sessionId);
            setGameStatus(data.status as any);
            if (data.currentQuestion) {
                setCurrentQuestion(data.currentQuestion);
                setLastSyncedQuestionId(data.currentQuestion.id);
            }
        },
        onError: async (error) => {
            await alert(error.message || "Failed to join session", "Error");
        }
    });

    const submitAnswer = api.quiz.submitAnswer.useMutation({
        onSuccess: () => {
            setIsSubmitted(true);
            submittedRef.current = true;
            const newStreak = answerStreak + 1;
            setAnswerStreak(newStreak);
            // Compute speed ratio
            let speedRatio = 0.5;
            if (questionStartTime) {
                const elapsed = (Date.now() - new Date(questionStartTime).getTime()) / 1000;
                speedRatio = elapsed / timeLimit;
            }
            setHypeMessage(getHype(speedRatio, newStreak));
        }
    });

    // --- SSE Subscription (primary real-time path) ---
    const [forceReconnect, setForceReconnect] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            console.log("[SSE] Reconnecting to session (4m interval)...");
            // Toggle to trigger re-subscription
            setForceReconnect(n => n + 1);
        }, 4 * 60 * 1000); // 4 minutes

        return () => clearInterval(interval);
    }, []);

    const [isReconnecting, setIsReconnecting] = useState(false);
    useEffect(() => {
        if (forceReconnect > 0) {
            setIsReconnecting(true);
            const timer = setTimeout(() => setIsReconnecting(false), 100);
            return () => clearTimeout(timer);
        }
    }, [forceReconnect]);

    api.quiz.onSessionUpdate.useSubscription(
        { sessionId: sessionId || "" },
        {
            enabled: !!sessionId && gameStatus !== "ENDED" && !isReconnecting,
            onStarted: () => {
                setSseConnected(true);
                setSseError(false);
                console.log("[SSE] Connected");
            },
            onData: (data) => {
                console.log("[SSE] Data received:", data);
                syncGameState(data as GameState);
            },
            onError: (err) => {
                console.warn("[SSE] Error/timeout, will poll once to catch up:", err);
                setSseConnected(false);
                setSseError(true);
            },
        }
    );

    // --- Synchronized polling: all clients poll at the same wall-clock moments ---
    const POLL_INTERVAL = 5000; // 5s
    const pollQuery = api.quiz.getGameState.useQuery(
        { playerId: playerId || "" },
        {
            enabled: !!playerId && gameStatus !== "ENDED",
            refetchInterval: false,
        }
    );

    useEffect(() => {
        if (!playerId || gameStatus === "ENDED") return;

        let timerId: ReturnType<typeof setTimeout>;

        const scheduleAlignedPoll = () => {
            const now = Date.now();
            const delay = POLL_INTERVAL - (now % POLL_INTERVAL);
            timerId = setTimeout(() => {
                pollQuery.refetch();
                scheduleAlignedPoll();
            }, delay);
        };

        scheduleAlignedPoll();
        return () => clearTimeout(timerId);
    }, [playerId, gameStatus]);

    // Sync from polling fallback
    useEffect(() => {
        if (pollQuery.data) {
            syncGameState(pollQuery.data as GameState);
        }
    }, [pollQuery.data, syncGameState]);

    // --- Splash screen auto-dismiss ---
    useEffect(() => {
        if (showSplash) {
            const timer = setTimeout(() => setShowSplash(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [showSplash]);

    // --- Answer handler ---
    const handleOptionClick = (optionId: string) => {
        if (isSubmitted) return;
        setSelectedOption(optionId);
        if (sessionId && playerId && currentQuestion) {
            submitAnswer.mutate({
                sessionId,
                playerId,
                questionId: currentQuestion.id,
                optionId,
            });
        }
    };

    // ==================== RENDER ====================

    if (playerId) {
        // ----- QUIZ ENDED — Show Leaderboard -----
        if (gameStatus === "ENDED") {
            const myRank = leaderboard.find((e) => e.playerId === playerId);
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
                    {/* Confetti for 1st place! */}
                    {myRank?.rank === 1 && <Confetti active={true} duration={5000} />}

                    {/* Decorative bg */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-3xl" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-teal-500/6 blur-3xl" />
                    </div>

                    <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
                        <CardContent className="p-6 space-y-6">
                            <div className="text-center space-y-2">
                                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 mb-2">
                                    <Trophy className="h-10 w-10 text-amber-500" />
                                </div>
                                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                                    Quiz Complete!
                                </h1>
                                {myRank && (
                                    <p className="text-lg text-muted-foreground">
                                        You finished <span className="font-bold text-teal-500">#{myRank.rank}</span> with <span className="font-bold text-teal-500">{myRank.score}</span> pts
                                    </p>
                                )}
                            </div>

                            {/* Leaderboard table */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                                    Leaderboard
                                </div>
                                <div className="space-y-1.5">
                                    {leaderboard.map((entry) => {
                                        const isMe = entry.playerId === playerId;
                                        const rankBg = entry.rank === 1
                                            ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
                                            : entry.rank === 2
                                                ? "bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-400/20"
                                                : entry.rank === 3
                                                    ? "bg-gradient-to-r from-amber-700/10 to-amber-600/10 border-amber-600/20"
                                                    : isMe
                                                        ? "bg-teal-500/10 border-teal-500/20"
                                                        : "bg-muted/50 border-transparent";
                                        return (
                                            <div
                                                key={entry.playerId}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors border ${rankBg}`}
                                            >
                                                <RankIcon rank={entry.rank} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold truncate flex items-center gap-1 text-sm ${isMe ? "text-teal-500" : ""}`}>
                                                        {entry.name}
                                                        {isMe && <User className="h-3 w-3 inline text-teal-500/60" />}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{entry.class}</p>
                                                </div>
                                                <span className="font-bold text-lg tabular-nums">
                                                    {entry.score}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full gap-2 h-11 font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/15 border-0"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Play Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // ----- ACTIVE GAME — Question or Hype -----
        if (gameStatus === "ACTIVE" && currentQuestion) {
            // Splash screen overlay
            if (showSplash) {
                const questionType = currentQuestion.type === "PROGRAM_OUTPUT" ? "Program Output"
                    : currentQuestion.type === "CODE_CORRECTION" ? "Code Correction" : "Knowledge";
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
                            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
                        </div>
                        <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                            <div className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 mb-2 animate-pulse">
                                <Zap className="h-14 w-14 text-teal-500" />
                            </div>
                            <h1 className="text-5xl font-extrabold tracking-tight">
                                Question <span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">{questionIndex}</span>
                            </h1>
                            <p className="text-muted-foreground text-lg">{questionType}</p>
                            <div className="flex justify-center gap-1 mt-4">
                                {Array.from({ length: totalQuestions }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${i + 1 < questionIndex
                                            ? "w-6 bg-teal-500"
                                            : i + 1 === questionIndex
                                                ? "w-8 bg-gradient-to-r from-teal-500 to-cyan-500 animate-pulse"
                                                : "w-4 bg-muted"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            // --- Between-question leaderboard (shown when timer expires) ---
            if (timerExpired && leaderboard.length > 0) {
                const myEntry = leaderboard.find((e) => e.playerId === playerId);
                return (
                    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-amber-500/8 blur-3xl" />
                            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-500/8 blur-3xl" />
                        </div>

                        <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardContent className="p-6 space-y-5">
                                <div className="text-center space-y-1">
                                    <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 mb-1">
                                        <BarChart3 className="h-7 w-7 text-amber-500" />
                                    </div>
                                    <h2 className="text-xl font-bold">Live Standings</h2>
                                    {myEntry && (
                                        <p className="text-sm text-muted-foreground">
                                            You&apos;re <span className="font-bold text-teal-500">#{myEntry.rank}</span> with <span className="font-bold text-teal-500">{myEntry.score}</span> pts
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    {leaderboard.slice(0, 10).map((entry, idx) => {
                                        const isMe = entry.playerId === playerId;
                                        const rankBg = entry.rank === 1
                                            ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
                                            : entry.rank === 2
                                                ? "bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-400/20"
                                                : entry.rank === 3
                                                    ? "bg-gradient-to-r from-amber-700/10 to-amber-600/10 border-amber-600/20"
                                                    : isMe
                                                        ? "bg-teal-500/10 border-teal-500/20"
                                                        : "bg-muted/50 border-transparent";
                                        return (
                                            <div
                                                key={entry.playerId}
                                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${rankBg}`}
                                                style={{ animationDelay: `${idx * 60}ms` }}
                                            >
                                                <RankIcon rank={entry.rank} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold truncate flex items-center gap-1 text-sm ${isMe ? "text-teal-500" : ""}`}>
                                                        {entry.name}
                                                        {isMe && <User className="h-3 w-3 inline text-teal-500/60" />}
                                                    </p>
                                                </div>
                                                <span className="font-bold tabular-nums">{entry.score}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {totalQuestions > 0 && (
                                    <div className="text-center">
                                        <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                            Q{questionIndex}/{totalQuestions}
                                        </span>
                                    </div>
                                )}

                                <p className="text-xs text-center text-muted-foreground animate-pulse">
                                    Waiting for next question...
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4">
                    <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardContent className="p-6 space-y-6">
                            {/* Timer progress bar at the top */}
                            <TimerBar startTime={questionStartTime} timeLimit={timeLimit} onExpire={handleTimerExpire} />

                            {/* If submitted, show hype message only; otherwise show question */}
                            {isSubmitted && hypeMessage ? (
                                (() => {
                                    const { Icon, title, subtitle, color } = hypeMessage;
                                    return (
                                        <div
                                            className="flex flex-col items-center gap-3 py-12"
                                            style={{
                                                animation: "feedbackPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                                            }}
                                        >
                                            <div
                                                className="rounded-2xl p-5"
                                                style={{ backgroundColor: `${color}18` }}
                                            >
                                                <Icon className="h-14 w-14" style={{ color }} />
                                            </div>
                                            <h3 className="text-3xl font-extrabold" style={{ color }}>
                                                {title}
                                            </h3>
                                            <p className="text-muted-foreground">
                                                {subtitle}
                                            </p>
                                            {totalQuestions > 0 && (
                                                <span className="text-sm font-medium text-muted-foreground mt-4 bg-muted/50 px-3 py-1 rounded-full">
                                                    Q{questionIndex}/{totalQuestions}
                                                </span>
                                            )}
                                            <p className="text-xs text-muted-foreground animate-pulse mt-2">
                                                Waiting for next question...
                                            </p>
                                        </div>
                                    );
                                })()
                            ) : (
                                <>
                                    {/* Question header with number */}
                                    <div className="flex items-start justify-between gap-4">
                                        <h2 className="text-xl sm:text-2xl font-bold flex-1">{currentQuestion.text}</h2>
                                        {totalQuestions > 0 && (
                                            <span className="shrink-0 text-xs font-semibold bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full border border-teal-500/20">
                                                Q{questionIndex}/{totalQuestions}
                                            </span>
                                        )}
                                    </div>

                                    {currentQuestion.codeSnippet && (
                                        <div className="rounded-xl overflow-hidden border border-border/50 my-4 text-left">
                                            <div className="bg-muted/80 px-4 py-1 text-xs text-muted-foreground border-b border-border/50 font-mono flex justify-between">
                                                <span>Code Snippet</span>
                                                <span>{currentQuestion.language || 'python'}</span>
                                            </div>
                                            <SyntaxHighlighter
                                                language={currentQuestion.language || 'python'}
                                                style={vscDarkPlus}
                                                customStyle={{
                                                    margin: 0,
                                                    borderRadius: 0,
                                                    padding: '1rem',
                                                    fontSize: '0.875rem',
                                                    lineHeight: '1.5',
                                                }}
                                                showLineNumbers={true}
                                                wrapLongLines={true}
                                            >
                                                {currentQuestion.codeSnippet}
                                            </SyntaxHighlighter>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {currentQuestion.options.map((opt: any, idx: number) => (
                                            <Button
                                                key={idx}
                                                variant={selectedOption === opt.id ? "default" : "outline"}
                                                className={`h-auto py-4 text-left justify-start text-base whitespace-normal rounded-xl transition-all ${selectedOption === opt.id
                                                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-teal-500 hover:from-teal-600 hover:to-cyan-600"
                                                    : "hover:border-teal-500/40 hover:bg-teal-500/5"
                                                    }`}
                                                onClick={() => handleOptionClick(opt.id)}
                                                disabled={isSubmitted}
                                            >
                                                {opt.text}
                                            </Button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Connection indicator */}
                            {!sseConnected && (
                                <p className="text-xs text-center text-amber-500">
                                    Reconnecting to live updates...
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // ----- WAITING for host -----
        const AVATAR_COLORS = [
            "from-teal-400 to-cyan-500",
            "from-amber-400 to-orange-500",
            "from-emerald-400 to-green-500",
            "from-sky-400 to-blue-500",
            "from-rose-400 to-pink-500",
            "from-violet-400 to-purple-500",
            "from-fuchsia-400 to-pink-500",
            "from-lime-400 to-emerald-500",
        ];
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-teal-500/8 blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-cyan-500/6 blur-3xl animate-pulse" />
                </div>

                <Card className="w-full max-w-md text-center p-6 border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="animate-ping absolute inset-0 rounded-full bg-teal-500/20" />
                            <div className="relative bg-gradient-to-br from-teal-500/15 to-cyan-500/15 p-6 rounded-full">
                                <Code2 className="h-10 w-10 text-teal-500" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">You're in!</h1>
                    <p className="text-muted-foreground mb-6">Waiting for the host to start...</p>
                    <div className="bg-gradient-to-br from-muted/80 to-muted/50 p-4 rounded-xl border border-border/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Player</p>
                        <p className="font-bold text-xl">{name}</p>
                    </div>

                    {/* Participants */}
                    {leaderboard.length > 0 && (
                        <div className="mt-6">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                                {leaderboard.length} player{leaderboard.length !== 1 ? "s" : ""} joined
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {leaderboard.map((p, i) => {
                                    const initial = p.name.charAt(0).toUpperCase();
                                    const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length]!;
                                    const isMe = p.playerId === playerId;
                                    return (
                                        <div key={p.playerId} className="flex flex-col items-center gap-1 w-16">
                                            <div
                                                className={`w-11 h-11 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-lg shadow-md ${isMe ? "ring-2 ring-teal-400 ring-offset-2 ring-offset-card" : ""}`}
                                            >
                                                {initial}
                                            </div>
                                            <span className={`text-xs truncate w-full text-center ${isMe ? "font-semibold text-teal-500" : "text-muted-foreground"}`}>
                                                {isMe ? "You" : p.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        );
    }

    // ----- JOIN SCREEN -----
    // Stage 1: Game Code
    if (joinStep === 1) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
                    <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-cyan-500/6 blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
                </div>

                <div className="text-center space-y-2 relative z-10">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 border border-teal-500/20">
                            <Code2 className="h-6 w-6 text-teal-500" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                        Debug Quiz
                    </h1>
                    <p className="text-muted-foreground">Enter code to join a game</p>
                </div>

                <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Game Code</Label>
                            <Input
                                id="code"
                                type="text"
                                placeholder="123456"
                                className="text-2xl py-7 font-mono text-center tracking-[0.5em]"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && code.length >= 4) setJoinStep(2); }}
                                autoFocus
                            />
                        </div>
                        <Button
                            onClick={() => setJoinStep(2)}
                            disabled={!code || code.length < 4}
                            className="w-full text-lg py-6 font-bold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 border-0 gap-2"
                            size="lg"
                        >
                            Next
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Stage 2: Name + Class
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
                <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-cyan-500/6 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
            </div>

            <div className="text-center space-y-1 relative z-10">
                <p className="text-sm font-mono text-teal-500 tracking-widest">Game {code}</p>
                <h1 className="text-3xl font-extrabold tracking-tight">
                    Who are you?
                </h1>
            </div>

            <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm relative z-10 animate-in fade-in slide-in-from-right-4 duration-300">
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            placeholder="Your Name"
                            className="text-lg py-6"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Class</Label>
                        {!isMobile ? (
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-full py-6 text-lg">
                                    <SelectValue placeholder="Select your class" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="E27">E27</SelectItem>
                                    <SelectItem value="E29">E29</SelectItem>
                                    <SelectItem value="E37A">E37A</SelectItem>
                                    <SelectItem value="E37B">E37B</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowClassSheet(true)}
                                    className="w-full py-6 text-lg justify-start font-normal"
                                >
                                    {selectedClass ? selectedClass : <span className="text-muted-foreground">Select your class</span>}
                                </Button>

                                {/* Mobile Bottom Sheet */}
                                {showClassSheet && (
                                    <div className="fixed inset-0 z-50 flex items-end justify-center">
                                        {/* Backdrop */}
                                        <div
                                            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                                            onClick={() => setShowClassSheet(false)}
                                        />
                                        {/* Sheet */}
                                        <div className="relative w-full bg-card border-t border-border p-6 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
                                            <div className="flex justify-center mb-6">
                                                <div className="w-12 h-1.5 bg-muted rounded-full" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-4 text-center">Select your Class</h3>
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                {["E27", "E29", "E37A", "E37B"].map((cls) => (
                                                    <Button
                                                        key={cls}
                                                        variant={selectedClass === cls ? "default" : "outline"}
                                                        className={`h-16 text-xl font-semibold rounded-2xl ${selectedClass === cls
                                                            ? "bg-gradient-to-r from-teal-500 to-cyan-500 border-0"
                                                            : "border-border/50 hover:bg-muted/50"
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedClass(cls);
                                                            setShowClassSheet(false);
                                                        }}
                                                    >
                                                        {cls}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                className="w-full py-6 text-lg text-muted-foreground"
                                                onClick={() => setShowClassSheet(false)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setJoinStep(1)}
                            variant="outline"
                            className="py-6 px-4 rounded-xl"
                            size="lg"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={() => joinSession.mutate({ name, code, class: selectedClass as any })}
                            disabled={joinSession.isPending || !name || !selectedClass}
                            className="flex-1 text-lg py-6 font-bold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 border-0"
                            size="lg"
                        >
                            {joinSession.isPending ? "Joining..." : "Join Game"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
