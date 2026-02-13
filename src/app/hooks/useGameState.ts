import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@mce-quiz/trpc/react";

export type GameState = {
    status: string | null;
    currentQuestion: any;
    questionStartTime: string | null;
    timeLimit: number;
    questionIndex: number;
    totalQuestions: number;
    today: boolean;
    isHistory: boolean;
    highestQuestionOrder: number;
    serverTime?: string;
    answerDistribution?: Record<string, number>;
    correctAnswerId?: string;
    leaderboard?: any[];
};

export function useGameState(sessionId: string | null, playerId: string | null, onNewQuestion?: () => void) {
    const [gameStatus, setGameStatus] = useState<"WAITING" | "ACTIVE" | "INTERMISSION" | "ENDED" | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
    const [questionStartTime, setQuestionStartTime] = useState<string | null>(null);
    const [timeLimit, setTimeLimit] = useState(10);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isHistory, setIsHistory] = useState(false);
    const [highestQuestionOrder, setHighestQuestionOrder] = useState(0);
    const [clockOffset, setClockOffset] = useState(0);


    const [answerDistribution, setAnswerDistribution] = useState<Record<string, number>>({});
    const [correctAnswerId, setCorrectAnswerId] = useState<string>("");

    // Connection States
    const [lastSyncedQuestionId, setLastSyncedQuestionId] = useState<string | null>(null);
    const [sseConnected, setSseConnected] = useState(false);
    const [pusherConnected, setPusherConnected] = useState(false);

    console.log(gameStatus, lastSyncedQuestionId, questionIndex)

    const syncGameState = useCallback((state: GameState) => {
        setGameStatus(state.status as any);
        setLeaderboard(state.leaderboard ?? []);

        // Calculate Average Clock Offset
        if (state.serverTime) {
            const serverTime = new Date(state.serverTime).getTime();
            const clientTime = Date.now();
            const offset = serverTime - clientTime;
            // Simple smoothing if needed, but direct sync is usually better for sudden jumps
            setClockOffset(offset);
        }

        const newQuestionId = state.currentQuestion?.id ?? null;
        if (newQuestionId && newQuestionId !== lastSyncedQuestionId) {
            setCurrentQuestion(state.currentQuestion);
            setLastSyncedQuestionId(newQuestionId);
            console.log("Received new question...", state.currentQuestion);
            // If we have a new question, call the callback
            onNewQuestion?.();
        } else if (!newQuestionId) {
            setCurrentQuestion(null);
        }

        setQuestionStartTime(state.questionStartTime);
        setTimeLimit(state.timeLimit);
        setQuestionIndex(state.questionIndex);
        setTotalQuestions(state.totalQuestions);
        setIsHistory(state.isHistory ?? false);
        setHighestQuestionOrder(state.highestQuestionOrder ?? 0);
        setAnswerDistribution(state.answerDistribution ?? {});
        setCorrectAnswerId(state.correctAnswerId ?? "");
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
        if (forceReconnect > 0 && !isReconnecting) {
            setIsReconnecting(true);
            const timer = setTimeout(() => setIsReconnecting(false), 100);
            return () => clearTimeout(timer);
        }
    }, [forceReconnect]);

    // api.game.onSessionUpdate.useSubscription(
    //     { sessionId: sessionId || "" },
    //     {
    //         // DISABLED SSE: Causing reconnection loops/spam in some environments. 
    //         // Fallback to robust polling (getGameState) instead.
    //         enabled: false,
    //         onStarted: () => setSseConnected(true),
    //         onData: (data) => syncGameState(data as GameState),
    //         onError: () => setSseConnected(false),
    //     }
    // );

    // Polling - Only if no real-time connection
    const POLL_INTERVAL = 3000;
    const pollQuery = api.game.getGameState.useQuery(
        { playerId: playerId || "" },
        {
            enabled: !!playerId && gameStatus !== "ENDED" && !sseConnected && !pusherConnected,
            refetchInterval: false,
        }
    );

    useEffect(() => {
        console.log(pusherConnected)
        if (!playerId || gameStatus === "ENDED" || pusherConnected) return; // Removed sseConnected check

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
    }, [playerId, gameStatus, pusherConnected]); // Removed sseConnected dependency

    useEffect(() => {
        if (pollQuery.data && (pollQuery.data.questionIndex > questionIndex || pollQuery.data.status !== gameStatus)) {
            syncGameState(pollQuery.data as GameState);
        }
    }, [pollQuery.data, syncGameState, questionIndex, gameStatus]);

    // Pusher
    const syncGameStateRef = useRef(syncGameState);
    useEffect(() => {
        syncGameStateRef.current = syncGameState;
    }, [syncGameState]);

    useEffect(() => {
        if (!sessionId || gameStatus === "ENDED") return;

        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) {
            console.warn("Pusher credentials missing, falling back to Polling");
            return;
        }

        let pusherInstance: any = null;
        let channel: any = null;
        let mounted = true;

        const initPusher = async () => {
            // Check if already unmounted before importing
            if (!mounted) return;

            const Pusher = (await import("pusher-js")).default;

            // Check again after await
            if (!mounted) return;

            // Enable pusher logging - good for debugging
            Pusher.logToConsole = true;

            pusherInstance = new Pusher(pusherKey, {
                cluster: pusherCluster,
            });

            channel = pusherInstance.subscribe(`session-${sessionId}`);

            channel.bind("update", (data: GameState) => {
                console.log("[Pusher] Update received:", data);
                // Use the ref to always get the latest callback without re-binding
                syncGameStateRef.current(data);
            });

            channel.bind("pusher:subscription_succeeded", () => {
                console.log("[Pusher] Connected to channel");
                if (mounted) setPusherConnected(true);
            });

            channel.bind("pusher:subscription_error", (status: any) => {
                console.warn("[Pusher] Subscription error:", status);
                if (mounted) setPusherConnected(false);
            });

            pusherInstance.connection.bind("state_change", (states: any) => {
                // console.log("Pusher state change", states);
                if (mounted) {
                    setPusherConnected(states.current === 'connected');
                }
            });
        };

        void initPusher();

        return () => {
            mounted = false;
            if (channel) {
                channel.unbind_all();
                channel.unsubscribe();
            }
            if (pusherInstance) {
                try {
                    pusherInstance.disconnect();
                } catch (e) {
                    // Ignore
                }
            }
            setPusherConnected(false);
        };
        // Removed syncGameState from dependencies to prevent re-init on every update
    }, [sessionId]);

    // Heartbeat
    const keepAliveMutation = api.game.keepAlive.useMutation();
    useEffect(() => {
        if (!playerId || gameStatus === "ENDED") return;

        const interval = setInterval(() => {
            keepAliveMutation.mutate({ playerId });
        }, 60 * 1000); // Every minute

        return () => clearInterval(interval);
    }, [playerId, gameStatus]);

    return {
        gameStatus, setGameStatus,
        currentQuestion, setCurrentQuestion,
        questionStartTime,
        timeLimit,
        questionIndex,
        totalQuestions,
        leaderboard,
        isHistory,
        highestQuestionOrder,
        sseConnected,
        pusherConnected,
        isIntermission: gameStatus === "INTERMISSION",
        answerDistribution,
        correctAnswerId,
        clockOffset
    };
}
