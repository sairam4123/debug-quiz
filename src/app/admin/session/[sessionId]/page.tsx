"use client";

import { useParams } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Rocket, SkipForward, StopCircle, Trophy, BarChart3, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { DownloadResults } from "../components/DownloadResults";

export default function AdminSessionPage() {
    const params = useParams();
    const sessionId = params?.sessionId as string;

    const { data: session, isLoading } = api.admin.getSession.useQuery({ sessionId }, {
        enabled: !!sessionId,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "ENDED") return false;
            return 1000;
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

    const nextQuestion = api.admin.nextQuestion.useMutation();
    const endSession = api.admin.endSession.useMutation({
        onSuccess: () => {
            setStatus("ENDED");
            clearTimers();
        }
    });
    const startSession = api.admin.startSession.useMutation({
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

    // Auto-switch timer: when currentQuestion changes, start countdown
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

        // Countdown interval
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);

        // Auto-switch timeout
        autoSwitchRef.current = setTimeout(() => {
            nextQuestion.mutate({ sessionId });
        }, remaining * 1000);

        return clearTimers;
    }, [session?.currentQuestionId, status]);

    // Calculate total questions and current index
    const totalQuestions = session?.quiz?.questions?.length || 0;
    const currentQuestionIndex = session?.currentQuestion
        ? (session.quiz.questions.findIndex((q: any) => q.id === session.currentQuestion?.id) + 1)
        : 0;

    if (isLoading) {
        return <div className="flex h-[50vh] items-center justify-center"><Spinner size="lg" /></div>;
    }

    if (!session) {
        return <div className="p-8 text-center text-destructive font-medium">Session not found</div>;
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Session Control</h1>
                    <p className="text-muted-foreground mt-1">Managing: <span className="font-semibold text-foreground">{session.quiz.title}</span></p>
                </div>
                <div className="flex items-center gap-4">
                    <DownloadResults session={session} />
                    <div className="bg-primary/10 border border-primary/20 px-6 py-3 rounded-xl flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Join Code</span>
                        <span className="text-3xl font-mono font-bold text-primary tracking-widest">{session.code}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Controls + Timer */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Game Controls */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Game Controls</CardTitle>
                            <CardDescription>
                                {status === "ACTIVE" && currentQuestionIndex > 0
                                    ? `Question ${currentQuestionIndex} of ${totalQuestions}`
                                    : "Manage the flow of the quiz."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {status === "WAITING" ? (
                                <Button
                                    className="w-full text-lg h-14 font-semibold"
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
                                        <div className="flex items-center justify-center gap-4 py-4">
                                            <div className={`text-6xl font-mono font-bold tabular-nums ${timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                                                {timeLeft}s
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            className="w-full text-lg h-12 font-semibold"
                                            size="lg"
                                            onClick={() => nextQuestion.mutate({ sessionId })}
                                            disabled={nextQuestion.isPending || status === "ENDED"}
                                        >
                                            <SkipForward className="mr-2 h-5 w-5" /> Next Question
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="w-full text-lg h-12 font-semibold"
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
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                                <div className={`text-lg font-bold ${status === "ACTIVE" ? "text-primary" : status === "ENDED" ? "text-destructive" : "text-amber-500"}`}>
                                    {status}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Players</div>
                                <div className="text-lg font-bold tabular-nums">{session.players?.length || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Questions</div>
                                <div className="text-lg font-bold tabular-nums">{currentQuestionIndex}/{totalQuestions}</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Leaderboard */}
                <Card className="lg:row-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <div className="p-1.5 rounded-lg bg-amber-500/10">
                                <Trophy className="h-4 w-4 text-amber-500" />
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
                                        className={`flex items-center justify-between p-3 rounded-xl border ${index === 0 ? "bg-amber-500/10 border-amber-500/20" :
                                            index === 1 ? "bg-slate-400/10 border-slate-400/20" :
                                                index === 2 ? "bg-orange-500/10 border-orange-500/20" :
                                                    "bg-muted/50 border-border"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`text-lg font-bold w-8 text-center ${index === 0 ? "text-amber-500" :
                                                index === 1 ? "text-slate-400" :
                                                    index === 2 ? "text-orange-500" :
                                                        "text-muted-foreground"
                                                }`}>
                                                {index < 3 ? <Medal className={`h-5 w-5 ${index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : "text-orange-500"}`} /> : `#${index + 1}`}
                                            </span>
                                            <div>
                                                <div className="font-semibold text-sm">{player.name}</div>
                                                <div className="text-xs text-muted-foreground">{player.class}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg tabular-nums">{player.score}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {player.answers?.filter((a: any) => a.isCorrect).length || 0}/{player.answers?.length || 0} correct
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8 text-sm">No players yet</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Per-Question Breakdown (when session ended) */}
            {status === "ENDED" && session.players && session.players.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5" /> Question Breakdown</CardTitle>
                        <CardDescription>Per-question scores and times</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-3 font-semibold text-muted-foreground">Player</th>
                                        {session.quiz.questions.map((q: any, i: number) => (
                                            <th key={q.id} className="text-center p-3 font-semibold text-muted-foreground min-w-[80px]">
                                                Q{i + 1}
                                            </th>
                                        ))}
                                        <th className="text-center p-3 font-semibold text-muted-foreground">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {session.players.map((player: any) => (
                                        <tr key={player.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                            <td className="p-3 font-medium">{player.name}</td>
                                            {session.quiz.questions.map((q: any) => {
                                                const answer = player.answers?.find((a: any) => a.questionId === q.id);
                                                return (
                                                    <td key={q.id} className="text-center p-3">
                                                        {answer ? (
                                                            <div>
                                                                <div className={`font-bold ${answer.isCorrect ? "text-primary" : "text-destructive"}`}>
                                                                    {answer.score}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {(answer.timeTaken / 1000).toFixed(1)}s
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="text-center p-3 font-bold text-lg tabular-nums">{player.score}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
