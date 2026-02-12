"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Lock, Rocket, Flame, Zap, Target, Sparkles, Brain, Send,
    Trophy, Medal, Crown, Star, User, BarChart3, RotateCcw, Code2,
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

// ----- Hype messages with Lucide icons + colors -----
const HYPE_MESSAGES = [
    { Icon: Lock, title: "Locked in!", subtitle: "No turning back now!", color: "#3B82F6" },
    { Icon: Rocket, title: "Submitted!", subtitle: "That was quick!", color: "#6366F1" },
    { Icon: Flame, title: "Let's go!", subtitle: "Confidence is key!", color: "#EF4444" },
    { Icon: Zap, title: "Lightning fast!", subtitle: "Speed demon!", color: "#F59E0B" },
    { Icon: Target, title: "Answer sent!", subtitle: "Fingers crossed!", color: "#22C55E" },
    { Icon: Sparkles, title: "Done!", subtitle: "Trust the process!", color: "#EC4899" },
    { Icon: Brain, title: "Big brain move!", subtitle: "Let's see how it plays out...", color: "#8B5CF6" },
    { Icon: Send, title: "Sent!", subtitle: "Way to commit!", color: "#06B6D4" },
];

type HypeMessage = (typeof HYPE_MESSAGES)[number];

function getRandomHype(): HypeMessage {
    return HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)]!;
}

// ----- Timer progress bar component -----
function TimerBar({ startTime, timeLimit }: { startTime: string | null; timeLimit: number }) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!startTime) return;
        const start = new Date(startTime).getTime();
        const durationMs = timeLimit * 1000;

        const tick = () => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
            setProgress(remaining);
        };

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [startTime, timeLimit]);

    const barColor =
        progress > 50 ? "bg-primary" : progress > 20 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
                className={`h-full ${barColor} rounded-full transition-all duration-100 ease-linear`}
                style={{ width: `${progress}%` }}
            />
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
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [gameStatus, setGameStatus] = useState<"WAITING" | "ACTIVE" | "ENDED">("WAITING");
    const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);

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
        onError: (error) => {
            alert(error.message);
        }
    });

    const submitAnswer = api.quiz.submitAnswer.useMutation({
        onSuccess: () => {
            setIsSubmitted(true);
            setHypeMessage(getRandomHype());
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

    // We can't just pass a random key to the input if the schema doesn't accept it.
    // Instead, we can use the key to force a remount of the subscription component internally
    // OR we relies on the fact that if we change the input, it reconnects. 
    // BUT since we can't change input, we might need to toggle `enabled`.

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

    // --- Polling fallback: only active when SSE is not connected ---
    const { data: polledState } = api.quiz.getGameState.useQuery(
        { playerId: playerId || "" },
        {
            enabled: !!playerId && gameStatus !== "ENDED" && !sseConnected,
            refetchInterval: sseError ? 3000 : false,
        }
    );

    // Sync from polling when SSE is disconnected
    useEffect(() => {
        if (polledState && !sseConnected) {
            syncGameState(polledState as GameState);
        }
    }, [polledState, sseConnected, syncGameState]);

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
                <div className="flex flex-col items-center justify-center min-h-screen p-4">
                    <Card className="w-full max-w-lg border-border/50">
                        <CardContent className="p-6 space-y-6">
                            <div className="text-center space-y-2">
                                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 mb-2">
                                    <Trophy className="h-10 w-10 text-amber-500" />
                                </div>
                                <h1 className="text-3xl font-extrabold">Quiz Complete!</h1>
                                {myRank && (
                                    <p className="text-lg text-muted-foreground">
                                        You finished <span className="font-bold text-primary">#{myRank.rank}</span> with <span className="font-bold text-primary">{myRank.score}</span> pts
                                    </p>
                                )}
                            </div>

                            {/* Leaderboard table */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Leaderboard
                                </div>
                                <div className="space-y-1.5">
                                    {leaderboard.map((entry) => {
                                        const isMe = entry.playerId === playerId;
                                        return (
                                            <div
                                                key={entry.playerId}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isMe
                                                    ? "bg-primary/10 border border-primary/20"
                                                    : "bg-muted/50"
                                                    }`}
                                            >
                                                <RankIcon rank={entry.rank} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold truncate flex items-center gap-1 text-sm ${isMe ? "text-primary" : ""}`}>
                                                        {entry.name}
                                                        {isMe && <User className="h-3 w-3 inline text-primary/60" />}
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

                            <Button onClick={() => window.location.reload()} className="w-full gap-2 h-11 font-semibold">
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
                    <div className="flex flex-col items-center justify-center min-h-screen p-4">
                        <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="inline-flex p-5 rounded-3xl bg-primary/10 mb-2 animate-pulse">
                                <Zap className="h-14 w-14 text-primary" />
                            </div>
                            <h1 className="text-5xl font-extrabold tracking-tight">
                                Question <span className="text-primary">{questionIndex}</span>
                            </h1>
                            <p className="text-muted-foreground text-lg">{questionType}</p>
                            <div className="flex justify-center gap-1 mt-4">
                                {Array.from({ length: totalQuestions }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${i + 1 < questionIndex
                                            ? "w-6 bg-primary"
                                            : i + 1 === questionIndex
                                                ? "w-8 bg-primary animate-pulse"
                                                : "w-4 bg-muted"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4">
                    <Card className="w-full max-w-2xl border-border/50">
                        <CardContent className="p-6 space-y-6">
                            {/* Timer progress bar at the top */}
                            <TimerBar startTime={questionStartTime} timeLimit={timeLimit} />

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
                                                <span className="text-sm font-medium text-muted-foreground mt-4 bg-muted px-3 py-1 rounded-full">
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
                                            <span className="shrink-0 text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                                                Q{questionIndex}/{totalQuestions}
                                            </span>
                                        )}
                                    </div>

                                    {currentQuestion.codeSnippet && (
                                        <div className="rounded-xl overflow-hidden border border-border/50 my-4 text-left">
                                            <div className="bg-muted px-4 py-1 text-xs text-muted-foreground border-b border-border/50 font-mono flex justify-between">
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
                                                    ? ""
                                                    : "hover:border-primary/40 hover:bg-primary/5"
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
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md text-center p-6 border-border/50">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="animate-ping absolute inset-0 rounded-full bg-primary/20" />
                            <div className="relative bg-primary/10 p-6 rounded-full">
                                <Code2 className="h-10 w-10 text-primary" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">You're in!</h1>
                    <p className="text-muted-foreground mb-6">Waiting for the host to start...</p>
                    <div className="bg-muted p-4 rounded-xl">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Player</p>
                        <p className="font-bold text-xl">{name}</p>
                    </div>
                </Card>
            </div>
        );
    }

    // ----- JOIN SCREEN -----
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Code2 className="h-6 w-6 text-primary" />
                    </div>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight">Debug Quiz</h1>
                <p className="text-muted-foreground">Enter code to join a game</p>
            </div>

            <Card className="w-full max-w-sm border-border/50">
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            placeholder="Your Name"
                            className="text-lg py-6"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="code">Game Code</Label>
                        <Input
                            id="code"
                            type="text"
                            placeholder="123456"
                            className="text-lg py-6 font-mono text-center tracking-[0.5em]"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Class</Label>
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
                    </div>
                    <Button
                        onClick={() => joinSession.mutate({ name, code, class: selectedClass as any })}
                        disabled={joinSession.isPending || !name || !code || !selectedClass}
                        className="w-full text-lg py-6 font-bold"
                        size="lg"
                    >
                        {joinSession.isPending ? "Joining..." : "Join Game"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
