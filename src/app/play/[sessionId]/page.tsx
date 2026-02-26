"use client";

import { useState, useCallback, Suspense, useEffect } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { useGameState } from "@/app/hooks/useGameState";
import { useGameInteraction } from "../_hooks/useGameInteraction";
import { GameLobby } from "../_components/GameLobby";
import { GameLeaderboard } from "../_components/GameLeaderboard";
import { GameQuestion } from "../_components/GameQuestion";
import { IntermissionFlow } from "../_components/IntermissionFlow";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@mce-quiz/trpc/react";

function PlayPageContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const sessionId = (params?.sessionId as string) || "";
    const [playerId, setPlayerId] = useState<string | null>(searchParams?.get("playerId") || null);

    useEffect(() => {
        if (!playerId) {
            const stored = localStorage.getItem(`quiz_player_${sessionId}`);
            if (stored) {
                setPlayerId(stored);
            } else {
                router.push("/join");
            }
        } else {
            localStorage.setItem(`quiz_player_${sessionId}`, playerId);
        }
    }, [playerId, sessionId, router]);

    // Interaction Hook needed first to pass reset function to GameState hook
    const {
        selectedOption,
        isSubmitted,
        hypeMessage,
        submit,
        resetForNewQuestion,
        isPending
    } = useGameInteraction(sessionId, playerId || "");

    // Question splash screen state
    const [showSplash, setShowSplash] = useState(false);

    // Callback when a new question is detected by useGameState
    const onNewQuestion = useCallback(() => {
        resetForNewQuestion(true); // true = keep streak if applicable
        setTimerExpired(false);
        setShowSplash(true);
        setTimeout(() => setShowSplash(false), 2000);
    }, [resetForNewQuestion]);

    const {
        gameStatus,
        currentQuestion,
        questionStartTime,
        timeLimit,
        questionIndex,
        totalQuestions,
        leaderboard,
        sseConnected,
        pusherConnected,
        isHistory,
        clockOffset,
        answerDistribution,
        correctAnswerId,
        isIntermission,
        supportsIntermission,
        antiTabSwitchEnabled
    } = useGameState(sessionId, playerId, onNewQuestion);

    const reportTabEvent = api.game.reportTabEvent.useMutation();

    // Timer expired — show between-question leaderboard
    const [timerExpired, setTimerExpired] = useState(false);
    const handleTimerExpire = useCallback(() => {
        setTimerExpired(true);
    }, []);

    useEffect(() => {
        if (!antiTabSwitchEnabled || !playerId || gameStatus === "ENDED") return;

        let lastVisibilityState = document.visibilityState === "hidden" ? "hidden" : "visible";
        let lastSentAt = 0;

        const sendEvent = (state: "hidden" | "visible" | "blur" | "focus") => {
            const now = Date.now();
            if (now - lastSentAt < 750) return; // throttle to avoid spam
            lastSentAt = now;

            reportTabEvent.mutate({
                sessionId,
                playerId,
                state,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            });
        };

        const handleVisibilityChange = () => {
            const state = document.visibilityState === "hidden" ? "hidden" : "visible";
            if (state !== lastVisibilityState) {
                lastVisibilityState = state;
                sendEvent(state);
            }
        };

        const handleBlur = () => sendEvent("blur");
        const handleFocus = () => sendEvent("focus");

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, [antiTabSwitchEnabled, gameStatus, playerId, reportTabEvent, sessionId]);

    // ==================== RENDER ====================

    if (!playerId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (gameStatus === "ENDED") {
        return <GameLeaderboard leaderboard={leaderboard} playerId={playerId} isFinal={true} />;
    }

    const me = leaderboard.find((p) => p.playerId === playerId || p.id === playerId);

    if (gameStatus === "WAITING") {
        return <GameLobby name={me?.name || "Player"} leaderboard={leaderboard} playerId={playerId} />;
    }

    if (gameStatus === "ACTIVE" && currentQuestion) {
        if (timerExpired && leaderboard.length > 0 && !isHistory) {
            // Waiting for results
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold bg-linear-to-r from-yellow-400 to-orange-500 bg-clip-text animate-pulse text-transparent">
                            Waiting for results...
                        </h2>
                    </div>
                </div>
            );
        }

        return (
            <GameQuestion
                currentQuestion={currentQuestion}
                questionIndex={questionIndex}
                totalQuestions={totalQuestions}
                questionStartTime={questionStartTime}
                timeLimit={timeLimit}
                selectedOption={selectedOption}
                isSubmitted={isSubmitted}
                hypeMessage={hypeMessage}
                showSplash={showSplash}
                isPending={isPending}
                onOptionClick={(optId: string) => submit(currentQuestion.id, optId, questionStartTime, timeLimit)}
                onTimerExpire={handleTimerExpire}
                sseConnected={sseConnected}
                pusherConnected={pusherConnected}
                isHistory={isHistory}
                clockOffset={clockOffset}
                supportsIntermission={supportsIntermission}
            />
        );
    }

    if (gameStatus === "INTERMISSION") {
        return (
            <IntermissionFlow
                answerDistribution={answerDistribution || {}}
                correctAnswerId={correctAnswerId || ""}
                currentQuestion={currentQuestion}
                leaderboard={leaderboard}
                currentUserId={playerId}
            />
        );
    }

    return null;
}


export default function PlayPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
            <PlayPageContent />
        </Suspense>
    );
}

