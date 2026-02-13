"use client";

import { useParams } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import {
    Rocket, SkipForward, StopCircle, Trophy, BarChart3, Medal,
    Users, CircleDot, HelpCircle, Timer, Sparkles, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { DownloadResults } from "../components/DownloadResults";
import { cn } from "@/lib/utils";

export default function AdminSessionPage() {
    const params = useParams();
    const sessionId = params?.sessionId as string;

    const { data: session, isLoading } = api.session.getById.useQuery({ sessionId }, {
        enabled: !!sessionId,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "ENDED") return false;
            if (data?.status === "ACTIVE") return 3000;
            return 5000;
        },
    });

    const [status, setStatus] = useState("WAITING");
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoSwitchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (session) {
            setStatus(session.status);
        }
    }, [session]);

    const nextQuestion = api.session.next.useMutation();
    const endSession = api.session.end.useMutation({
        onSuccess: () => {
            setStatus("ENDED");
            clearTimers();
        }
    });
    const startSession = api.session.start.useMutation({
        onSuccess: () => {
            setStatus("ACTIVE");
        }
    });

    const clearTimers = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoSwitchRef.current) clearTimeout(autoSwitchRef.current);
        timerRef.current = null;
        autoSwitchRef.current = null;
    }, []);

    useEffect(() => {
        clearTimers();

        if (status !== "ACTIVE" || !session?.currentQuestion) {
            setTimeLeft(null);
            return;
        }

        const timeLimit = session.currentQuestion.timeLimit || 10;
        const startTime = session.currentQuestionStartTime
            ? new Date(session.currentQuestionStartTime).getTime()
            : Date.now();

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, timeLimit - elapsed);
        setTimeLeft(remaining);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);

        autoSwitchRef.current = setTimeout(() => {
            nextQuestion.mutate({ sessionId });
        }, remaining * 1000);

        return clearTimers;
    }, [session?.currentQuestionId, status]);

    const totalQuestions = session?.quiz?.questions?.length || 0;
    const currentQuestionIndex = session?.currentQuestion
        ? (session.quiz.questions.findIndex((q: any) => q.id === session.currentQuestion?.id) + 1)
        : 0;

    // Timer color based on time remaining
    const getTimerColor = () => {
        if (timeLeft === null) return "text-teal-500";
        if (timeLeft <= 3) return "text-rose-500";
        if (timeLeft <= 5) return "text-amber-500";
        return "text-teal-500";
    };

    const getTimerBg = () => {
        if (timeLeft === null) return "from-teal-500/10 to-cyan-500/10";
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
                        {/* Game Controls */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/10 to-cyan-500/10">
                                        <Rocket className="h-5 w-5 text-sky-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Game Controls</CardTitle>
                                        <CardDescription>
                                            {status === "ACTIVE" && currentQuestionIndex > 0
                                                ? `Question ${currentQuestionIndex} of ${totalQuestions}`
                                                : "Manage the flow of the quiz."}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {status === "WAITING" ? (
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
                                        {/* Timer */}
                                        {status === "ACTIVE" && timeLeft !== null && (
                                            <div className={cn(
                                                "flex items-center justify-center gap-4 py-6 rounded-2xl bg-gradient-to-r transition-all duration-500",
                                                getTimerBg()
                                            )}>
                                                <Timer className={cn("h-8 w-8 transition-colors duration-500", getTimerColor())} />
                                                <div className={cn(
                                                    "text-7xl font-mono font-bold tabular-nums transition-colors duration-500",
                                                    getTimerColor(),
                                                    timeLeft <= 3 && "animate-pulse"
                                                )}>
                                                    {timeLeft}s
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <Button
                                                className="w-full text-lg h-12 font-semibold bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-lg shadow-sky-500/15 border-0"
                                                size="lg"
                                                onClick={() => nextQuestion.mutate({ sessionId })}
                                                disabled={nextQuestion.isPending || status === "ENDED"}
                                            >
                                                <SkipForward className="mr-2 h-5 w-5" /> Next Question
                                            </Button>
                                            <Button
                                                className="w-full text-lg h-12 font-semibold bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white shadow-lg shadow-rose-500/15 border-0"
                                                onClick={() => endSession.mutate({ sessionId })}
                                                disabled={endSession.isPending || status === "ENDED"}
                                            >
                                                <StopCircle className="mr-2 h-5 w-5" /> End Session
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
                                        status === "ACTIVE" && "text-emerald-500",
                                        status === "ENDED" && "text-rose-500",
                                        status === "WAITING" && "text-amber-500"
                                    )}>
                                        {status}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-4 text-center">
                                    <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 mb-2">
                                        <Users className="h-4 w-4 text-sky-500" />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Players</div>
                                    <div className="text-lg font-bold tabular-nums">{session.players?.length || 0}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                                <CardContent className="p-4 text-center">
                                    <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 mb-2">
                                        <HelpCircle className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Questions</div>
                                    <div className="text-lg font-bold tabular-nums">{currentQuestionIndex}/{totalQuestions}</div>
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
                            {session.players && session.players.length > 0 ? (
                                <div className="space-y-2">
                                    {session.players.map((player: any, index: number) => (
                                        <div
                                            key={player.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 hover:scale-[1.01]",
                                                index === 0 && "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/25",
                                                index === 1 && "bg-gradient-to-r from-slate-400/10 to-slate-300/5 border-slate-400/20",
                                                index === 2 && "bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-orange-500/20",
                                                index > 2 && "bg-muted/30 border-border/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-lg font-bold w-8 text-center",
                                                    index === 0 && "text-amber-500",
                                                    index === 1 && "text-slate-400",
                                                    index === 2 && "text-orange-500",
                                                    index > 2 && "text-muted-foreground"
                                                )}>
                                                    {index < 3 ? (
                                                        <Medal className={cn(
                                                            "h-5 w-5 mx-auto",
                                                            index === 0 && "text-amber-500",
                                                            index === 1 && "text-slate-400",
                                                            index === 2 && "text-orange-500"
                                                        )} />
                                                    ) : (
                                                        `#${index + 1}`
                                                    )}
                                                </span>
                                                <div>
                                                    <div className="font-semibold text-sm">{player.name}</div>
                                                    <div className="text-xs text-muted-foreground">{player.class}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-lg tabular-nums">{player.score}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    <span className="text-emerald-500 font-medium">{player.answers?.filter((a: any) => a.isCorrect).length || 0}</span>
                                                    /{player.answers?.length || 0} correct
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                {status === "ENDED" && session.players && session.players.length > 0 && (
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
