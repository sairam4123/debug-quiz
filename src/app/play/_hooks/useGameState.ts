import { useState, useEffect, useCallback } from "react";
import { api } from "@mce-quiz/trpc/react";

export type GameState = {
    status: string;
    currentQuestion: any;
    questionStartTime: string | null;
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    leaderboard: any[];
};

export function useGameState(sessionId: string | null, playerId: string | null, onNewQuestion?: () => void) {
    const [gameStatus, setGameStatus] = useState<"WAITING" | "ACTIVE" | "ENDED">("WAITING");
    const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
    const [questionStartTime, setQuestionStartTime] = useState<string | null>(null);
    const [timeLimit, setTimeLimit] = useState(10);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    // Sync tracking
    const [lastSyncedQuestionId, setLastSyncedQuestionId] = useState<string | null>(null);
    const [sseConnected, setSseConnected] = useState(false);

    const syncGameState = useCallback((state: GameState) => {
        setGameStatus(state.status as any);
        setLeaderboard(state.leaderboard ?? []);

        const newQuestionId = state.currentQuestion?.id ?? null;
        if (newQuestionId && newQuestionId !== lastSyncedQuestionId) {
            setCurrentQuestion(state.currentQuestion);
            setLastSyncedQuestionId(newQuestionId);
            onNewQuestion?.();
        }

        setQuestionStartTime(state.questionStartTime);
        setTimeLimit(state.timeLimit);
        setQuestionIndex(state.questionIndex);
        setTotalQuestions(state.totalQuestions);
    }, [lastSyncedQuestionId, onNewQuestion]);

    // SSE
    const [forceReconnect, setForceReconnect] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setForceReconnect(n => n + 1);
        }, 4 * 60 * 1000);
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

    api.game.onSessionUpdate.useSubscription(
        { sessionId: sessionId || "" },
        {
            enabled: !!sessionId && gameStatus !== "ENDED" && !isReconnecting,
            onStarted: () => setSseConnected(true),
            onData: (data) => syncGameState(data as GameState),
            onError: () => setSseConnected(false),
        }
    );

    // Polling
    const POLL_INTERVAL = 5000;
    const pollQuery = api.game.getGameState.useQuery(
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

    useEffect(() => {
        if (pollQuery.data) {
            syncGameState(pollQuery.data as GameState);
        }
    }, [pollQuery.data, syncGameState]);

    return {
        gameStatus, setGameStatus,
        currentQuestion, setCurrentQuestion,
        questionStartTime,
        timeLimit,
        questionIndex,
        totalQuestions,
        leaderboard, setLeaderboard,
        sseConnected,
        syncGameState,
        setLastSyncedQuestionId // exposed for initial sync if needed
    };
}
