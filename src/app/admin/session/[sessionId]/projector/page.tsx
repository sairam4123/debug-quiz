"use client";

import { useParams } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { useGameState } from "@/app/hooks/useGameState";
import { useEffect, useState, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";
import { GameLeaderboard } from "@/app/play/_components/GameLeaderboard";
import { IntermissionFlow } from "@/app/play/_components/IntermissionFlow";
import { Users, Timer, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProjectorViewPage() {
    const params = useParams();
    const sessionId = params?.sessionId as string;

    const { data: session, isLoading } = api.session.getById.useQuery({ sessionId }, {
        enabled: !!sessionId,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "ENDED") return false;
            return 5000;
        },
    });

    const [showSplash, setShowSplash] = useState(false);

    const onNewQuestion = useCallback(() => {
        setShowSplash(true);
        setTimeout(() => setShowSplash(false), 2000);
    }, []);

    const {
        gameStatus,
        currentQuestion,
        questionStartTime,
        timeLimit,
        leaderboard,
        answersCount,
        answerDistribution,
        correctAnswerId,
        questionIndex,
        totalQuestions
    } = useGameState(sessionId, null, onNewQuestion);

    const activeStatus = gameStatus || session?.status;
    const playersCount = leaderboard.length > 0 ? leaderboard.length : (session?.players?.length || 0);
    const activeAnswersCount = answersCount || session?.answersCount || 0;
    const activeStartTime = questionStartTime || session?.questionStartTime;
    const activeTimeLimit = timeLimit || session?.timeLimit || 10;

    const [timeLeft, setTimeLeft] = useState<number | null>(null);

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

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [activeStartTime, activeStatus, activeTimeLimit]);

    const getTimerColor = () => {
        if (timeLeft === null) return "text-teal-500";
        if (timeLeft <= 0) return "text-destructive";
        if (timeLeft <= 3) return "text-rose-500";
        if (timeLeft <= 5) return "text-amber-500";
        return "text-teal-500";
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
    }

    if (!session) {
        return <div className="p-8 text-center text-destructive font-medium">Session not found</div>;
    }

    if (activeStatus === "WAITING") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-background">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />
                </div>

                <div className="z-10 text-center space-y-12">
                    <div className="space-y-4">
                        <div className="inline-flex p-4 rounded-3xl bg-linear-to-br from-teal-500 to-cyan-500 shadow-xl shadow-teal-500/20 mb-4">
                            <Sparkles className="h-16 w-16 text-white" />
                        </div>
                        <h1 className="text-6xl font-extrabold tracking-tight bg-linear-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                            {session.quiz.title}
                        </h1>
                        <p className="text-2xl text-muted-foreground">Join the quiz now!</p>
                    </div>

                    <div className="p-12 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-size-[200%_100%]" />
                        <div className="relative z-10 space-y-4">
                            <p className="text-xl uppercase tracking-widest text-muted-foreground font-semibold">Join Code</p>
                            <p className="text-8xl font-mono font-bold bg-linear-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent tracking-widest">
                                {session.code}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4 text-3xl font-bold bg-background/50 backdrop-blur-sm px-8 py-4 rounded-full border border-border/50 shadow-lg">
                            <Users className="h-8 w-8 text-sky-500" />
                            <span><span className="text-sky-500">{playersCount}</span> Players Joined</span>
                        </div>
                        <p className="text-muted-foreground animate-pulse text-xl">Waiting for host to start...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (activeStatus === "ACTIVE") {
        if (showSplash && currentQuestion) {
            const questionType = currentQuestion?.type === "PROGRAM_OUTPUT" ? "Program Output"
                : currentQuestion?.type === "CODE_CORRECTION" ? "Code Correction" : "Knowledge";
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 relative bg-background">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl opacity-50" />
                        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl opacity-50" />
                    </div>
                    <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                        <div className="inline-flex p-5 rounded-3xl bg-linear-to-br from-teal-500/15 to-cyan-500/15 mb-6 animate-pulse">
                            <Zap className="h-16 w-16 text-teal-500" />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight">
                            Question <span className="bg-linear-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">{questionIndex}</span>
                        </h1>
                        <p className="text-muted-foreground text-3xl mt-4">{questionType}</p>
                        <div className="flex justify-center gap-2 mt-12">
                            {Array.from({ length: totalQuestions }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-2 rounded-full transition-all ${i + 1 < questionIndex
                                        ? "w-8 bg-teal-500"
                                        : i + 1 === questionIndex
                                            ? "w-16 bg-linear-to-r from-teal-500 to-cyan-500 animate-pulse"
                                            : "w-6 bg-muted"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-background">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-teal-500/5 blur-3xl" />
                </div>

                <div className="z-10 w-full max-w-5xl space-y-16 mt-[-10vh]">
                    {currentQuestion && (
                        <div className="text-center space-y-4 px-8">
                            <h2 className="text-5xl md:text-7xl font-bold leading-tight flex-1" style={{ wordBreak: 'break-word' }}>
                                {session?.quiz?.shuffleQuestions ? `Question ${questionIndex}` : currentQuestion.text}
                            </h2>
                            {currentQuestion.section && !session?.quiz?.shuffleQuestions && (
                                <span className="inline-block text-lg font-bold tracking-wider uppercase bg-muted/50 text-muted-foreground px-4 py-1.5 rounded-md mt-4">
                                    {currentQuestion.section}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col items-center justify-center gap-12">
                        {timeLeft !== null && (
                            <div className="flex flex-col items-center gap-6">
                                <div className="flex flex-row items-center gap-6">
                                    <Timer className={cn("h-16 w-16 transition-colors duration-500", getTimerColor())} />
                                    <div className={cn(
                                        "text-[12rem] leading-none font-mono font-bold tabular-nums transition-colors duration-500",
                                        getTimerColor(),
                                        timeLeft <= 3 && "animate-pulse"
                                    )}>
                                        {timeLeft}
                                    </div>
                                </div>
                                {timeLeft === 0 && (
                                    <div className="text-3xl font-bold uppercase tracking-widest text-destructive animate-pulse">
                                        Time Up!
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-4xl font-bold bg-card/80 backdrop-blur-xl px-12 py-6 rounded-full border-2 border-border/50 shadow-2xl transition-all duration-500">
                            <Users className="h-10 w-10 text-sky-500" />
                            <span>Submitted: <span className={cn("ml-2", activeAnswersCount === playersCount ? "text-emerald-500" : "text-sky-500")}>{activeAnswersCount}</span> / {playersCount}</span>
                        </div>

                        {activeAnswersCount === playersCount && playersCount > 0 && (
                            <div className="text-2xl font-bold text-emerald-500 animate-pulse -mt-4">
                                All participants have answered!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (activeStatus === "INTERMISSION") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background transform scale-125 origin-center">
                <IntermissionFlow
                    answerDistribution={answerDistribution || {}}
                    correctAnswerId={correctAnswerId || ""}
                    currentQuestion={currentQuestion || { options: [] }}
                    leaderboard={leaderboard}
                />
            </div>
        );
    }

    if (activeStatus === "ENDED") {
        return (
            <div className="min-h-screen bg-background transform scale-125 origin-center pt-20">
                <GameLeaderboard
                    leaderboard={leaderboard}
                    playerId={null}
                    isFinal={true}
                    questionIndex={questionIndex}
                    totalQuestions={totalQuestions}
                />
            </div>
        );
    }

    return null;
}
