"use client";

import { useParams } from "next/navigation";
import { api, type RouterOutputs } from "@mce-quiz/trpc/react";
import { useGameState } from "@/app/hooks/useGameState";
import { useEffect, useState, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";
import { GameLeaderboard } from "@/app/play/_components/GameLeaderboard";
import { IntermissionFlow } from "@/app/play/_components/IntermissionFlow";
import { Users, Timer, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type SessionByIdOutput = RouterOutputs["session"]["getById"];
type GameStateOutput = NonNullable<RouterOutputs["game"]["getGameState"]>;
type LeaderboardEntry = GameStateOutput["leaderboard"][number];

export default function ProjectorViewPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const { data: session, isLoading } = api.session.getById.useQuery(
    { sessionId },
    {
      enabled: !!sessionId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.status === "ENDED") return false;
        return 5000;
      },
    },
  );

  const sessionData: SessionByIdOutput | undefined = session;

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
    totalQuestions,
  } = useGameState(sessionId, null, onNewQuestion);

  const activeStatus = gameStatus || sessionData?.status;
  const sessionPlayers = sessionData?.players ?? [];
  const playersCount =
    leaderboard.length > 0 ? leaderboard.length : sessionPlayers.length;
  const activeAnswersCount = answersCount || sessionData?.answersCount || 0;
  const activeStartTime = questionStartTime || sessionData?.questionStartTime;
  const activeTimeLimit = timeLimit || sessionData?.timeLimit || 10;

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
    if (timeLeft === null) return "text-primary";
    if (timeLeft <= 0) return "text-destructive";
    if (timeLeft <= 3) return "text-rose-500";
    if (timeLeft <= 5) return "text-amber-500";
    return "text-primary";
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
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

  if (activeStatus === "WAITING") {
    return (
      <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-500/4 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-amber-500/3 blur-3xl" />
        </div>

        <div className="z-10 space-y-12 text-center">
          <div className="space-y-4">
            <div className="bg-primary mb-4 inline-flex rounded-3xl p-4 shadow-xl">
              <Sparkles className="h-16 w-16 text-white" />
            </div>
            <h1 className="text-foreground text-6xl font-extrabold tracking-tight">
              {session.quiz.title}
            </h1>
            <p className="text-muted-foreground text-2xl">Join the quiz now!</p>
          </div>

          <div className="border-border/50 bg-card/80 relative overflow-hidden rounded-3xl border p-12 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/5 to-transparent bg-size-[200%_100%]" />
            <div className="relative z-10 space-y-4">
              <p className="text-muted-foreground text-xl font-semibold tracking-widest uppercase">
                Join Code
              </p>
              <p className="text-primary font-mono text-8xl font-bold tracking-widest">
                {session.code}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="bg-background/50 border-border/50 flex items-center gap-4 rounded-full border px-8 py-4 text-3xl font-bold shadow-lg backdrop-blur-sm">
              <Users className="text-primary h-8 w-8" />
              <span>
                <span className="text-primary">{playersCount}</span> Players
                Joined
              </span>
            </div>
            <p className="text-muted-foreground animate-pulse text-xl">
              Waiting for host to start...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeStatus === "ACTIVE") {
    if (showSplash && currentQuestion) {
      const questionType =
        currentQuestion?.type === "PROGRAM_OUTPUT"
          ? "Program Output"
          : currentQuestion?.type === "CODE_CORRECTION"
            ? "Code Correction"
            : "Knowledge";
      return (
        <div className="bg-background relative flex min-h-screen flex-col items-center justify-center p-4">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-blue-500/4 blur-3xl" />
            <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-amber-500/3 blur-3xl" />
          </div>
          <div className="animate-in fade-in zoom-in-95 relative z-10 space-y-4 text-center duration-500">
            <div className="bg-primary/10 mb-6 inline-flex rounded-3xl p-5">
              <Zap className="text-primary h-16 w-16" />
            </div>
            <h1 className="text-6xl font-extrabold tracking-tight md:text-8xl">
              Question <span className="text-primary">{questionIndex}</span>
            </h1>
            <p className="text-muted-foreground mt-4 text-3xl">
              {questionType}
            </p>
            <div className="mt-12 flex justify-center gap-2">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i + 1 < questionIndex
                      ? "bg-primary w-8"
                      : i + 1 === questionIndex
                        ? "w-16 animate-pulse bg-amber-400"
                        : "bg-muted w-6"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/3 blur-3xl" />
        </div>

        <div className="z-10 mt-[-10vh] w-full max-w-5xl space-y-16">
          {currentQuestion && (
            <div className="space-y-4 px-8 text-center">
              <h2
                className="flex-1 text-5xl leading-tight font-bold md:text-7xl"
                style={{ wordBreak: "break-word" }}
              >
                {session?.quiz?.shuffleQuestions
                  ? `Question ${questionIndex}`
                  : currentQuestion.text}
              </h2>
              {currentQuestion.section && !session?.quiz?.shuffleQuestions && (
                <span className="bg-muted/50 text-muted-foreground mt-4 inline-block rounded-md px-4 py-1.5 text-lg font-bold tracking-wider uppercase">
                  {currentQuestion.section}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-12">
            {timeLeft !== null && (
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-row items-center gap-6">
                  <Timer
                    className={cn(
                      "h-16 w-16 transition-colors duration-500",
                      getTimerColor(),
                    )}
                  />
                  <div
                    className={cn(
                      "font-mono text-[12rem] leading-none font-bold tabular-nums transition-colors duration-500",
                      getTimerColor(),
                      timeLeft <= 3 && "animate-pulse",
                    )}
                  >
                    {timeLeft}
                  </div>
                </div>
                {timeLeft === 0 && (
                  <div className="text-destructive animate-pulse text-3xl font-bold tracking-widest uppercase">
                    Time Up!
                  </div>
                )}
              </div>
            )}

            <div className="bg-card/80 border-border/50 flex items-center gap-4 rounded-full border-2 px-12 py-6 text-4xl font-bold shadow-2xl backdrop-blur-xl transition-all duration-500">
              <Users className="h-10 w-10 text-sky-500" />
              <span>
                Submitted:{" "}
                <span
                  className={cn(
                    "ml-2",
                    activeAnswersCount === playersCount
                      ? "text-emerald-500"
                      : "text-sky-500",
                  )}
                >
                  {activeAnswersCount}
                </span>{" "}
                / {playersCount}
              </span>
            </div>

            {activeAnswersCount === playersCount && playersCount > 0 && (
              <div className="-mt-4 animate-pulse text-2xl font-bold text-emerald-500">
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
      <div className="bg-background flex min-h-screen origin-center scale-125 transform items-center justify-center">
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
      <div className="bg-background min-h-screen origin-center scale-125 transform pt-20">
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
