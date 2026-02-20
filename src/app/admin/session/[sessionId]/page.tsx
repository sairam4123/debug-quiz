"use client";

import { useParams } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import {
    Rocket, SkipForward, StopCircle, Trophy, BarChart3, Medal,
    Users, CircleDot, HelpCircle, Timer, Sparkles, SkipBack, History, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { DownloadResults } from "../components/DownloadResults"; // Fix import path if needed
import { cn } from "@/lib/utils";
import { useGameState } from "@/app/hooks/useGameState";
import { KeepAliveManager } from "@/app/admin/components/KeepAliveManager";

export default function AdminSessionPage() {
    const params = useParams();
    const sessionId = params?.sessionId as string;

    // Use shared hook for real-time state
    const {
        gameStatus,
        currentQuestion,
        questionStartTime,
        timeLimit,
        questionIndex,
        totalQuestions: hookTotalQuestions,
        leaderboard,
        isHistory,
        highestQuestionOrder,
        supportsIntermission,
        answersCount
    } = useGameState(sessionId, null);

    // Keep getById for detailed player data (answers list) which might not be in hook
    const { data: session, isLoading } = api.session.getById.useQuery({ sessionId }, {
        enabled: !!sessionId,
        refetchInterval: (query) => {
            // Refresh detailed data occasionally
            const data = query.state.data;
            if (data?.status === "ENDED") return false;
            return 5000;
        },
    });

    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [reconcileTimeLeft, setReconcileTimeLeft] = useState<number | null>(null);
    const [autoAdvance, setAutoAdvance] = useState(false);

    const nextQuestion = api.session.next.useMutation();
    const previousQuestion = api.session.previous.useMutation();
    const endSession = api.session.end.useMutation();
    const startSession = api.session.start.useMutation();

    const activeStatus = gameStatus || session?.status;
    const activeStartTime = questionStartTime || session?.questionStartTime;
    const activeTimeLimit = timeLimit || session?.timeLimit || 10;

    // Calculate Time Left based on Server Time
    useEffect(() => {
        if (!activeStartTime || activeStatus !== "ACTIVE") {
            setTimeLeft(null);
            return;
        }

        const tick = () => {
            const now = Date.now();
            const start = new Date(activeStartTime).getTime();
            const elapsed = (now - start) / 1000;
            const remaining = Math.max(0, Math.ceil(activeTimeLimit - elapsed));
            setTimeLeft(remaining);
        };

        tick(); // Initial
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [activeStartTime, activeStatus, activeTimeLimit]);

    const activeSupportsIntermission = supportsIntermission ?? session?.supportsIntermission ?? false;

    useEffect(() => {
        if (timeLeft === 0 && activeStatus === "ACTIVE" && autoAdvance && reconcileTimeLeft === null) {
            setReconcileTimeLeft(15);
            if (activeSupportsIntermission) {
                setTimeout(() => nextQuestion.mutate({ sessionId }), 50);
            }
        }
    }, [timeLeft, activeStatus, autoAdvance, reconcileTimeLeft, activeSupportsIntermission, nextQuestion, sessionId]);

    useEffect(() => {
        if (reconcileTimeLeft !== null && reconcileTimeLeft > 0) {
            const timer = setTimeout(() => setReconcileTimeLeft(prev => (prev ?? 0) - 1), 1000);
            return () => clearTimeout(timer);
        } else if (reconcileTimeLeft === 0) {
            setReconcileTimeLeft(null);
            if (autoAdvance) {
                nextQuestion.mutate({ sessionId });
            }
        }
    }, [reconcileTimeLeft, autoAdvance]);

    // Prevent Tab Close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (gameStatus === "ACTIVE") {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [gameStatus]);

    // Timer color based on time remaining
    const getTimerColor = () => {
        if (timeLeft === null) return "text-teal-500";
        if (timeLeft <= 0) return "text-destructive";
        if (timeLeft <= 3) return "text-rose-500";
        if (timeLeft <= 5) return "text-amber-500";
        return "text-teal-500";
    };

    const getTimerBg = () => {
        if (timeLeft === null) return "from-teal-500/10 to-cyan-500/10";
        if (timeLeft <= 0) return "from-rose-500/10 to-red-500/10";
        if (timeLeft <= 3) return "from-rose-500/10 to-red-500/10";
        if (timeLeft <= 5) return "from-amber-500/10 to-orange-500/10";
        return "from-teal-500/10 to-cyan-500/10";
    };

    if (isLoading) {
        return <div className="flex h-[50vh] items-center justify-center"><Spinner size="lg" /></div>;
    }

    if (!session) {
        return <div className="p-8 text-center text-destructive font-medium">Session not found</div>;
    }

    const totalQs = hookTotalQuestions || session.quiz.questions.length;
    const activeQuestionIndex = questionIndex || session.questionIndex || 0;
    const activeHighestQuestionOrder = highestQuestionOrder || session.highestQuestionOrder || 0;
    const activeAnswersCount = answersCount || session.answersCount || 0;

    // Merge Leaderboard with answers from TRPC since Pusher doesn't send answers array
    const activeLeaderboard = [...(leaderboard.length > 0 ? leaderboard : session.players)].map(p => {
        const sourcePlayer = session.players.find((sp: any) => sp.id === (p.playerId || p.id));
        return {
            ...p,
            answers: sourcePlayer?.answers || p.answers || []
        }
    });

    // Status Display
    // Prefer gameStatus if it's active or ended, but if it's null (initial) or waiting (default), and session says ENDED, trust session.
    let displayStatus = activeStatus;
    if (session.status === "ENDED" && (activeStatus === "WAITING" || activeStatus === null)) {
        displayStatus = "ENDED";
    }

    const playersCount = leaderboard.length > 0 ? leaderboard.length : (session.players?.length || 0);

    return (
        <div className="min-h-screen">
            {/* Decorative background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
                <div className="absolute top-1/2 -left-20 w-72 h-72 rounded-full bg-cyan-500/5 blur-3xl" />
                <div className="absolute bottom-20 right-1/3 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
            </div>

            <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/20">
                            <Sparkles className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                Session Control
                            </h1>
                            <p className="text-muted-foreground mt-0.5">
                                Managing: <span className="font-semibold text-foreground">{session.quiz.title}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <DownloadResults session={session} />
                        {/* Join Code - Glassmorphic */}
                        <div className="relative overflow-hidden px-6 py-3 rounded-2xl flex flex-col items-center border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 backdrop-blur-sm">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]" />
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold relative z-10">Join Code</span>
                            <span className="text-3xl font-mono font-bold bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent tracking-widest relative z-10">
                                {session.code}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Controls + Timer */}
                    <div className="lg:col-span-2 space-y-6">

                        <KeepAliveManager autoAdvance={autoAdvance} onAutoAdvanceChange={setAutoAdvance} />

                        {/* Game Controls */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/10 to-cyan-500/10">
                                            <Rocket className="h-5 w-5 text-sky-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Game Controls</CardTitle>
                                            <CardDescription>
                                                {displayStatus === "ACTIVE" && activeQuestionIndex > 0
                                                    ? `Question ${activeQuestionIndex} of ${totalQs}`
                                                    : "Manage the flow of the quiz."}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {(isHistory || activeQuestionIndex < activeHighestQuestionOrder) && (
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            <History className="h-4 w-4" />
                                            <span className="text-xs font-semibold">Review Mode</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {displayStatus === "WAITING" ? (
                                    <Button
                                        className="w-full text-lg h-14 font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 border-0"
                                        size="lg"
                                        onClick={() => startSession.mutate({ sessionId })}
                                        disabled={startSession.isPending}
                                    >
                                        <Rocket className="mr-2 h-5 w-5" /> Start Session
                                    </Button>
                                ) : (
                                    <>
                                        {/* Timer & Submissions Info */}
                                        {(displayStatus === "ACTIVE" || displayStatus === "INTERMISSION") && (timeLeft !== null || reconcileTimeLeft !== null) && (
                                            <div className={cn(
                                                "flex flex-col items-center justify-center gap-4 py-6 rounded-2xl bg-gradient-to-r transition-all duration-500",
                                                getTimerBg()
                                            )}>
                                                <div className="flex items-center justify-center gap-4">
                                                    <Timer className={cn("h-8 w-8 transition-colors duration-500", getTimerColor())} />
                                                    <div className={cn(
                                                        "text-7xl font-mono font-bold tabular-nums transition-colors duration-500",
                                                        getTimerColor(),
                                                        ((timeLeft || reconcileTimeLeft) || 0) <= 3 && "animate-pulse"
                                                    )}>
                                                        {displayStatus === "ACTIVE" ? (timeLeft ?? 0) : (reconcileTimeLeft ?? 0)}s
                                                    </div>
                                                </div>

                                                {displayStatus === "ACTIVE" && (
                                                    <div className="flex flex-col items-center gap-2 mt-2">
                                                        <div className="text-lg font-bold bg-background/50 backdrop-blur-sm px-6 py-2.5 rounded-full border border-border/50 flex flex-row items-center gap-3">
                                                            <Users className="h-5 w-5 text-sky-500" />
                                                            <span>Submitted: <span className="text-primary text-xl ml-1">{activeAnswersCount}</span> / {playersCount}</span>
                                                        </div>
                                                        {activeAnswersCount === playersCount && playersCount > 0 && (
                                                            <div className="text-sm font-semibold text-emerald-500 animate-pulse mt-1 flex items-center gap-1.5">
                                                                <Check className="h-4 w-4" /> All participants have answered!
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {displayStatus === "ACTIVE" && timeLeft === 0 && !autoAdvance && (
                                                    <div className="text-xs font-bold uppercase tracking-widest text-destructive animate-pulse mt-2">
                                                        Time Up - Waiting
                                                    </div>
                                                )}
                                                {displayStatus === "INTERMISSION" && reconcileTimeLeft !== null && (
                                                    <div className="text-sm font-bold uppercase tracking-widest text-amber-500 animate-pulse mt-2">
                                                        Intermission - Next question starting soon
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    className="flex-1 text-base h-12 font-semibold bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-0"
                                                    size="lg"
                                                    onClick={() => previousQuestion.mutate({ sessionId })}
                                                    disabled={previousQuestion.isPending || displayStatus === "ENDED" || activeQuestionIndex <= 1}
                                                >
                                                    <SkipBack className="md:mr-2 h-5 w-5" /> <p className="hidden md:block">Prev</p>
                                                </Button>
                                                <Button
                                                    className={cn(
                                                        "flex-[2] text-lg h-12 font-semibold bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-lg shadow-sky-500/15 border-0 transition-all duration-300",
                                                        activeAnswersCount === playersCount && playersCount > 0 && "ring-2 ring-emerald-400 ring-offset-2 animate-pulse duration-1000 from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                                                    )}
                                                    size="lg"
                                                    onClick={() => { nextQuestion.mutate({ sessionId }); setReconcileTimeLeft(15); }}
                                                    disabled={nextQuestion.isPending || displayStatus === "ENDED"}
                                                >
                                                    <SkipForward className="md:mr-2 h-5 w-5" />
                                                    <p className="hidden md:block">
                                                        Next / Skip
                                                        {activeAnswersCount === playersCount && playersCount > 0 && "*"}
                                                    </p>
                                                </Button>
                                            </div>

                                            <Button
                                                className="w-full text-lg h-12 font-semibold bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white shadow-lg shadow-rose-500/15 border-0"
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to end the session?")) {
                                                        endSession.mutate({ sessionId });
                                                    }
                                                }}
                                                disabled={endSession.isPending || displayStatus === "ENDED"}
                                            >
                                                <StopCircle className="md:mr-2 h-5 w-5" /> <p className="hidden md:block">End Session</p>
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-4 text-center">
                                    <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 mb-2">
                                        <CircleDot className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                                    <div className={cn(
                                        "text-lg font-bold",
                                        displayStatus === "ACTIVE" && "text-emerald-500",
                                        displayStatus === "ENDED" && "text-rose-500",
                                        displayStatus === "WAITING" && "text-amber-500"
                                    )}>
                                        {displayStatus}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-4 text-center">
                                    <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 mb-2">
                                        <Users className="h-4 w-4 text-sky-500" />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Players</div>
                                    <div className="text-lg font-bold tabular-nums">{playersCount}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-4 text-center">
                                    <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 mb-2">
                                        <HelpCircle className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Questions</div>
                                    <div className="text-lg font-bold tabular-nums">{activeQuestionIndex}/{totalQs}</div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Leaderboard */}
                    <Card className="lg:row-span-2 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/15">
                                    <Trophy className="h-5 w-5 text-amber-500" />
                                </div>
                                Leaderboard
                            </CardTitle>
                            <CardDescription>Live rankings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Use real-time leaderboard if available, otherwise session players */}
                            {activeLeaderboard?.length > 0 ? (
                                <div className="space-y-2">
                                    {activeLeaderboard.map((player: any, index: number) => {
                                        // Check for offline status (2 mins threshold)
                                        // Note: session.players might not have lastActive if not in leaderboard view? 
                                        // But we added lastActive to leaderboard in backend.
                                        // Session.players from getById includes everything? No, getById needs to select lastActive too.
                                        // Assuming player.lastActive exists.
                                        const isOffline = player.lastActive
                                            ? (Date.now() - new Date(player.lastActive).getTime() > 2 * 60 * 1000)
                                            : false;

                                        return (
                                            <div
                                                key={player.playerId || player.id}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 hover:scale-[1.01]",
                                                    isOffline ? "bg-muted/40 border-muted opacity-70" : (
                                                        index === 0 ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/25" :
                                                            index === 1 ? "bg-gradient-to-r from-slate-400/10 to-slate-300/5 border-slate-400/20" :
                                                                index === 2 ? "bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-orange-500/20" :
                                                                    "bg-card border-border/50"
                                                    )
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "text-lg font-bold w-8 text-center flex justify-center",
                                                        index === 0 && "text-amber-500",
                                                        index === 1 && "text-slate-400",
                                                        index === 2 && "text-orange-500",
                                                        index > 2 && "text-muted-foreground"
                                                    )}>
                                                        {index < 3 ? (
                                                            <Medal className={cn(
                                                                "h-5 w-5",
                                                                index === 0 && "text-amber-500",
                                                                index === 1 && "text-slate-400",
                                                                index === 2 && "text-orange-500"
                                                            )} />
                                                        ) : (
                                                            `#${index + 1}`
                                                        )}
                                                    </span>
                                                    <div>
                                                        <div className="font-semibold text-sm flex items-center gap-2">
                                                            {player.name}
                                                            {isOffline && (
                                                                <span className="text-[10px] uppercase font-bold text-muted-foreground border px-1.5 py-0.5 rounded-md bg-muted">
                                                                    Offline
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{player.class}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-lg tabular-nums">{player.score}</div>
                                                    {player.answers && (
                                                        <div className="text-xs text-muted-foreground">
                                                            <span className="text-emerald-500 font-medium">{player.answers?.filter((a: any) => a.isCorrect).length || 0}</span>
                                                            /{player.answers?.length || 0} correct
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-8">
                                    <div className="p-4 rounded-2xl bg-muted/50 mb-3">
                                        <Users className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">No players yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Per-Question Breakdown (when session ended) */}
                {displayStatus === "ENDED" && session.players && session.players.length > 0 && (
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/10 to-teal-500/10">
                                    <BarChart3 className="h-5 w-5 text-sky-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Question Breakdown</CardTitle>
                                    <CardDescription>Per-question scores and times</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-3 font-semibold text-muted-foreground bg-gradient-to-r from-muted/80 to-muted/40 rounded-tl-lg">Player</th>
                                            {session.quiz.questions.map((q: any, i: number) => (
                                                <th key={q.id} className="text-center p-3 font-semibold text-muted-foreground bg-gradient-to-r from-muted/40 to-muted/20 min-w-[80px]">
                                                    Q{i + 1}
                                                </th>
                                            ))}
                                            <th className="text-center p-3 font-semibold bg-gradient-to-r from-muted/20 to-muted/40 rounded-tr-lg">
                                                <span className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">Total</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {session.players.map((player: any) => (
                                            <tr key={player.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                                                <td className="p-3 font-medium">{player.name}</td>
                                                {session.quiz.questions.map((q: any) => {
                                                    const answer = player.answers?.find((a: any) => a.questionId === q.id);
                                                    return (
                                                        <td key={q.id} className="text-center p-3">
                                                            {answer ? (
                                                                <div>
                                                                    <div className={cn(
                                                                        "inline-block font-bold text-xs px-2.5 py-1 rounded-full",
                                                                        answer.isCorrect
                                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                                    )}>
                                                                        {answer.score}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                                        {(answer.timeTaken / 1000).toFixed(1)}s
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="text-center p-3">
                                                    <span className="font-bold text-lg tabular-nums bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                                        {player.score}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

