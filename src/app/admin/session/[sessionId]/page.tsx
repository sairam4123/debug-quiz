"use client";

import { useParams } from "next/navigation";
import { api, type RouterOutputs } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  SkipForward,
  StopCircle,
  Trophy,
  BarChart3,
  Medal,
  Users,
  CircleDot,
  HelpCircle,
  Timer,
  Sparkles,
  SkipBack,
  History,
  Check,
  Presentation,
  ExternalLink,
  Shield,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import { DownloadResults } from "../components/DownloadResults"; // Fix import path if needed
import { cn } from "@/lib/utils";
import { useGameState } from "@/app/hooks/useGameState";
import { KeepAliveManager } from "@/app/admin/components/KeepAliveManager";

type SessionByIdOutput = RouterOutputs["session"]["getById"];
type TabEventEntry = RouterOutputs["game"]["getTabEvents"][number];
type GameStateOutput = NonNullable<RouterOutputs["game"]["getGameState"]>;
type LiveLeaderboardEntry = GameStateOutput["leaderboard"][number];
type PlayerWithAnswers = NonNullable<SessionByIdOutput>["players"][number];
type SessionQuestion =
  NonNullable<SessionByIdOutput>["quiz"]["questions"][number];
type PlayerAnswer = PlayerWithAnswers["answers"][number];

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
    answersCount,
  } = useGameState(sessionId, null);

  // Keep getById for detailed player data (answers list) which might not be in hook
  const { data: session, isLoading } = api.session.getById.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchInterval: (query) => {
        // Refresh detailed data occasionally
        const data = query.state.data;
        if (data?.status === "ENDED") return false;
        return 5000;
      },
    },
  );

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [reconcileTimeLeft, setReconcileTimeLeft] = useState<number | null>(
    null,
  );
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [tabEvents, setTabEvents] = useState<TabEventEntry[]>([]);

  const nextQuestion = api.session.next.useMutation();
  const previousQuestion = api.session.previous.useMutation();
  const endSession = api.session.end.useMutation();
  const startSession = api.session.start.useMutation();

  const tabEventsQuery = api.game.getTabEvents.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchOnWindowFocus: false,
    },
  );

  const activeStatus = gameStatus || session?.status;
  const activeStartTime = questionStartTime || session?.questionStartTime;
  const activeTimeLimit = timeLimit || session?.timeLimit || 10;

  useEffect(() => {
    if (tabEventsQuery.data) {
      setTabEvents(tabEventsQuery.data);
    }
  }, [tabEventsQuery.data]);

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

  const activeSupportsIntermission =
    supportsIntermission ?? session?.supportsIntermission ?? false;

  useEffect(() => {
    if (
      timeLeft === 0 &&
      activeStatus === "ACTIVE" &&
      autoAdvance &&
      reconcileTimeLeft === null
    ) {
      setReconcileTimeLeft(15);
      if (activeSupportsIntermission) {
        setTimeout(() => nextQuestion.mutate({ sessionId }), 50);
      }
    }
  }, [
    timeLeft,
    activeStatus,
    autoAdvance,
    reconcileTimeLeft,
    activeSupportsIntermission,
    nextQuestion,
    sessionId,
  ]);

  useEffect(() => {
    if (reconcileTimeLeft !== null && reconcileTimeLeft > 0) {
      const timer = setTimeout(
        () => setReconcileTimeLeft((prev) => (prev ?? 0) - 1),
        1000,
      );
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
    if (timeLeft === null) return "text-primary";
    if (timeLeft <= 0) return "text-destructive";
    if (timeLeft <= 3) return "text-rose-500";
    if (timeLeft <= 5) return "text-amber-500";
    return "text-primary";
  };

  const getTimerBg = () => {
    if (timeLeft === null) return "from-primary/10 to-primary/5";
    if (timeLeft <= 0) return "from-rose-500/10 to-red-500/10";
    if (timeLeft <= 3) return "from-rose-500/10 to-red-500/10";
    if (timeLeft <= 5) return "from-amber-500/10 to-orange-500/10";
    return "from-primary/10 to-primary/5";
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-destructive p-8 text-center font-medium">
        Session not found
      </div>
    );
  }

  const totalQs = hookTotalQuestions || session.quiz.questions.length;
  const activeQuestionIndex = questionIndex || session.questionIndex || 0;
  const activeHighestQuestionOrder =
    highestQuestionOrder || session.highestQuestionOrder || 0;
  const activeAnswersCount = answersCount || session.answersCount || 0;

  const sessionPlayers: PlayerWithAnswers[] = session.players;
  type DisplayPlayer =
    | PlayerWithAnswers
    | (LiveLeaderboardEntry & { answers?: PlayerWithAnswers["answers"] });

  const activeLeaderboard: DisplayPlayer[] =
    leaderboard.length > 0
      ? leaderboard.map((p) => ({
          ...p,
          answers:
            sessionPlayers.find((sp) => sp.id === p.playerId)?.answers ?? [],
        }))
      : sessionPlayers;

  // Status Display
  // Prefer gameStatus if it's active or ended, but if it's null (initial) or waiting (default), and session says ENDED, trust session.
  let displayStatus = activeStatus;
  if (
    session.status === "ENDED" &&
    (activeStatus === "WAITING" || activeStatus === null)
  ) {
    displayStatus = "ENDED";
  }

  const playersCount =
    leaderboard.length > 0 ? leaderboard.length : sessionPlayers.length;

  return (
    <div className="min-h-screen">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/4 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-blue-400/3 blur-3xl" />
        <div className="absolute right-1/3 bottom-20 h-80 w-80 rounded-full bg-amber-500/4 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="bg-primary rounded-2xl p-3">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-foreground text-3xl font-bold tracking-tight">
                Session Control
              </h1>
              <p className="text-muted-foreground mt-0.5">
                Managing:{" "}
                <span className="text-foreground font-semibold">
                  {session.quiz.title}
                </span>
              </p>
              {session.quiz.antiTabSwitchEnabled && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-700 uppercase">
                  <Shield className="h-3.5 w-3.5" /> Anti-tab switch enabled
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/session/${sessionId}/projector`}
              target="_blank"
            >
              <Button
                variant="outline"
                className="border-primary/20 hover:bg-primary/5 gap-2 transition-colors"
              >
                <Presentation className="text-primary h-4 w-4" />
                <span className="hidden font-semibold sm:inline-block">
                  Projector
                </span>
              </Button>
            </Link>
            <DownloadResults session={session} />
            {/* Join Code - Glassmorphic */}
            <div className="border-primary/20 bg-primary/5 relative flex flex-col items-center overflow-hidden rounded-2xl border px-6 py-3 backdrop-blur-sm">
              <div className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/5 to-transparent bg-[length:200%_100%]" />
              <span className="text-muted-foreground relative z-10 text-[10px] font-semibold tracking-widest uppercase">
                Join Code
              </span>
              <span className="text-primary relative z-10 font-mono text-3xl font-bold tracking-widest">
                {session.code}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Controls + Timer */}
          <div className="space-y-6 lg:col-span-2">
            <KeepAliveManager
              autoAdvance={autoAdvance}
              onAutoAdvanceChange={setAutoAdvance}
            />

            {/* Game Controls */}
            <Card className="border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-xl p-2">
                      <Rocket className="text-primary h-5 w-5" />
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
                  {(isHistory ||
                    activeQuestionIndex < activeHighestQuestionOrder) && (
                    <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-amber-600">
                      <History className="h-4 w-4" />
                      <span className="text-xs font-semibold">Review Mode</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayStatus === "WAITING" ? (
                  <Button
                    className="bg-primary hover:bg-primary/90 h-14 w-full border-0 text-lg font-semibold text-white"
                    size="lg"
                    onClick={() => startSession.mutate({ sessionId })}
                    disabled={startSession.isPending}
                  >
                    <Rocket className="mr-2 h-5 w-5" /> Start Session
                  </Button>
                ) : (
                  <>
                    {/* Timer & Submissions Info */}
                    {(displayStatus === "ACTIVE" ||
                      displayStatus === "INTERMISSION") &&
                      (timeLeft !== null || reconcileTimeLeft !== null) && (
                        <div
                          className={cn(
                            "flex flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-r py-6 transition-all duration-500",
                            getTimerBg(),
                          )}
                        >
                          <div className="flex items-center justify-center gap-4">
                            <Timer
                              className={cn(
                                "h-8 w-8 transition-colors duration-500",
                                getTimerColor(),
                              )}
                            />
                            <div
                              className={cn(
                                "font-mono text-7xl font-bold tabular-nums transition-colors duration-500",
                                getTimerColor(),
                                (timeLeft || reconcileTimeLeft || 0) <= 3 &&
                                  "animate-pulse",
                              )}
                            >
                              {displayStatus === "ACTIVE"
                                ? (timeLeft ?? 0)
                                : (reconcileTimeLeft ?? 0)}
                              s
                            </div>
                          </div>

                          {displayStatus === "ACTIVE" && (
                            <div className="mt-2 flex flex-col items-center gap-2">
                              <div className="bg-background/50 border-border/50 flex flex-row items-center gap-3 rounded-full border px-6 py-2.5 text-lg font-bold backdrop-blur-sm">
                                <Users className="h-5 w-5 text-sky-500" />
                                <span>
                                  Submitted:{" "}
                                  <span className="text-primary ml-1 text-xl">
                                    {activeAnswersCount}
                                  </span>{" "}
                                  / {playersCount}
                                </span>
                              </div>
                              {activeAnswersCount === playersCount &&
                                playersCount > 0 && (
                                  <div className="mt-1 flex animate-pulse items-center gap-1.5 text-sm font-semibold text-emerald-500">
                                    <Check className="h-4 w-4" /> All
                                    participants have answered!
                                  </div>
                                )}
                            </div>
                          )}

                          {displayStatus === "ACTIVE" &&
                            timeLeft === 0 &&
                            !autoAdvance && (
                              <div className="text-destructive mt-2 animate-pulse text-xs font-bold tracking-widest uppercase">
                                Time Up - Waiting
                              </div>
                            )}
                          {displayStatus === "INTERMISSION" &&
                            reconcileTimeLeft !== null && (
                              <div className="mt-2 animate-pulse text-sm font-bold tracking-widest text-amber-500 uppercase">
                                Intermission - Next question starting soon
                              </div>
                            )}
                        </div>
                      )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex gap-2">
                        <Button
                          className="h-12 flex-1 border-0 bg-gradient-to-r from-slate-500 to-slate-600 text-base font-semibold text-white hover:from-slate-600 hover:to-slate-700"
                          size="lg"
                          onClick={() => previousQuestion.mutate({ sessionId })}
                          disabled={
                            previousQuestion.isPending ||
                            displayStatus === "ENDED" ||
                            activeQuestionIndex <= 1
                          }
                        >
                          <SkipBack className="h-5 w-5 md:mr-2" />{" "}
                          <p className="hidden md:block">Prev</p>
                        </Button>
                        <Button
                          className={cn(
                            "bg-primary hover:bg-primary/90 h-12 flex-[2] border-0 text-lg font-semibold text-white shadow-sm transition-all duration-300",
                            activeAnswersCount === playersCount &&
                              playersCount > 0 &&
                              "animate-pulse bg-emerald-500 ring-2 ring-emerald-400 ring-offset-2 duration-1000 hover:bg-emerald-600",
                          )}
                          size="lg"
                          onClick={() => {
                            nextQuestion.mutate({ sessionId });
                            setReconcileTimeLeft(15);
                          }}
                          disabled={
                            nextQuestion.isPending || displayStatus === "ENDED"
                          }
                        >
                          <SkipForward className="h-5 w-5 md:mr-2" />
                          <p className="hidden md:block">
                            Next / Skip
                            {activeAnswersCount === playersCount &&
                              playersCount > 0 &&
                              "*"}
                          </p>
                        </Button>
                      </div>

                      <Button
                        className="h-12 w-full border-0 bg-gradient-to-r from-rose-500 to-red-500 text-lg font-semibold text-white shadow-lg shadow-rose-500/15 hover:from-rose-600 hover:to-red-600"
                        onClick={() => {
                          if (
                            confirm("Are you sure you want to end the session?")
                          ) {
                            endSession.mutate({ sessionId });
                          }
                        }}
                        disabled={
                          endSession.isPending || displayStatus === "ENDED"
                        }
                      >
                        <StopCircle className="h-5 w-5 md:mr-2" />{" "}
                        <p className="hidden md:block">End Session</p>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-2">
                    <CircleDot className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
                    Status
                  </div>
                  <div
                    className={cn(
                      "text-lg font-bold",
                      displayStatus === "ACTIVE" && "text-emerald-500",
                      displayStatus === "ENDED" && "text-rose-500",
                      displayStatus === "WAITING" && "text-amber-500",
                    )}
                  >
                    {displayStatus}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 p-2">
                    <Users className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
                    Players
                  </div>
                  <div className="text-lg font-bold tabular-nums">
                    {playersCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-2">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
                    Questions
                  </div>
                  <div className="text-lg font-bold tabular-nums">
                    {activeQuestionIndex}/{totalQs}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-red-500/10 p-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Security Events</CardTitle>
                    <CardDescription>Tab switch / blur logs</CardDescription>
                  </div>
                  {!session.quiz.antiTabSwitchEnabled && (
                    <span className="text-muted-foreground bg-muted border-border/50 ml-auto rounded-full border px-2 py-1 text-[11px] font-semibold tracking-wide uppercase">
                      Disabled
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!session.quiz.antiTabSwitchEnabled ? (
                  <p className="text-muted-foreground text-sm">
                    Anti-tab switch is off for this quiz.
                  </p>
                ) : tabEvents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No tab visibility events recorded yet.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {tabEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <div>
                            <div className="text-sm leading-tight font-semibold">
                              {ev.playerName}
                              {ev.playerClass && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  ({ev.playerClass})
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Event: {ev.eventType}
                            </div>
                          </div>
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {new Date(ev.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Leaderboard */}
          <Card className="border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm lg:row-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/15 p-2">
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
                  {activeLeaderboard.map((player, index) => {
                    // Check for offline status (2 mins threshold)
                    // Note: session.players might not have lastActive if not in leaderboard view?
                    // But we added lastActive to leaderboard in backend.
                    // Session.players from getById includes everything? No, getById needs to select lastActive too.
                    // Assuming player.lastActive exists.
                    const isOffline = player.lastActive
                      ? Date.now() - new Date(player.lastActive).getTime() >
                        2 * 60 * 1000
                      : false;

                    return (
                      <div
                        key={player.playerId || player.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 transition-all duration-200 hover:scale-[1.01]",
                          isOffline
                            ? "bg-muted/40 border-muted opacity-70"
                            : index === 0
                              ? "border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-yellow-500/5"
                              : index === 1
                                ? "border-slate-400/20 bg-gradient-to-r from-slate-400/10 to-slate-300/5"
                                : index === 2
                                  ? "border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-amber-500/5"
                                  : "bg-card border-border/50",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex w-8 justify-center text-center text-lg font-bold",
                              index === 0 && "text-amber-500",
                              index === 1 && "text-slate-400",
                              index === 2 && "text-orange-500",
                              index > 2 && "text-muted-foreground",
                            )}
                          >
                            {index < 3 ? (
                              <Medal
                                className={cn(
                                  "h-5 w-5",
                                  index === 0 && "text-amber-500",
                                  index === 1 && "text-slate-400",
                                  index === 2 && "text-orange-500",
                                )}
                              />
                            ) : (
                              `#${index + 1}`
                            )}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              {player.name}
                              {isOffline && (
                                <span className="text-muted-foreground bg-muted rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase">
                                  Offline
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {player.class}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold tabular-nums">
                            {player.score}
                          </div>
                          {player.answers && (
                            <div className="text-muted-foreground text-xs">
                              <span className="font-medium text-emerald-500">
                                {(player.answers ?? []).filter(
                                  (a: PlayerAnswer) => a.isCorrect,
                                ).length || 0}
                              </span>
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
                  <div className="bg-muted/50 mb-3 rounded-2xl p-4">
                    <Users className="text-muted-foreground/40 h-8 w-8" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No players yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-Question Breakdown (when session ended) */}
        {displayStatus === "ENDED" &&
          session.players &&
          session.players.length > 0 && (
            <Card className="border-border/50 bg-card/80 overflow-hidden backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-sky-500/10 to-teal-500/10 p-2">
                    <BarChart3 className="h-5 w-5 text-sky-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Question Breakdown
                    </CardTitle>
                    <CardDescription>
                      Per-question scores and times
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-border border-b">
                        <th className="text-muted-foreground from-muted/80 to-muted/40 rounded-tl-lg bg-gradient-to-r p-3 text-left font-semibold">
                          Player
                        </th>
                        {session.quiz.questions.map(
                          (q: SessionQuestion, i: number) => (
                            <th
                              key={q.id}
                              className="text-muted-foreground from-muted/40 to-muted/20 min-w-[80px] bg-gradient-to-r p-3 text-center font-semibold"
                            >
                              Q{i + 1}
                            </th>
                          ),
                        )}
                        <th className="from-muted/20 to-muted/40 rounded-tr-lg bg-gradient-to-r p-3 text-center font-semibold">
                          <span className="text-primary font-bold">Total</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.players.map((player) => (
                        <tr
                          key={player.id}
                          className="border-border/30 hover:bg-muted/30 border-b transition-colors"
                        >
                          <td className="p-3 font-medium">{player.name}</td>
                          {session.quiz.questions.map((q: SessionQuestion) => {
                            const answer = player.answers?.find(
                              (a: PlayerAnswer) => a.questionId === q.id,
                            );
                            return (
                              <td key={q.id} className="p-3 text-center">
                                {answer ? (
                                  <div>
                                    <div
                                      className={cn(
                                        "inline-block rounded-full px-2.5 py-1 text-xs font-bold",
                                        answer.isCorrect
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                                      )}
                                    >
                                      {answer.score}
                                    </div>
                                    <div className="text-muted-foreground mt-0.5 text-xs">
                                      {(answer.timeTaken / 1000).toFixed(1)}s
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center">
                            <span className="text-primary text-lg font-bold tabular-nums">
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
