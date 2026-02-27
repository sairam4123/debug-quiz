import { useState, useEffect, useCallback, useRef } from "react";
import { api, type RouterOutputs } from "@mce-quiz/trpc/react";

type GetGameStateOutput = RouterOutputs["game"]["getGameState"];
type GameState = NonNullable<GetGameStateOutput>;
type GameStatus = GameState["status"];
type Question = GameState["currentQuestion"];
type LeaderboardEntry = GameState["leaderboard"][number];

export function useGameState(
  sessionId: string | null,
  playerId: string | null,
  onNewQuestion?: () => void,
) {
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<string | null>(
    null,
  );
  const [timeLimit, setTimeLimit] = useState(10);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isHistory, setIsHistory] = useState(false);
  const [highestQuestionOrder, setHighestQuestionOrder] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  const [supportsIntermission, setSupportsIntermission] = useState(false);
  const [firstLoadAfterJoin, setFirstLoadAfterJoin] = useState(false);
  const [answersCount, setAnswersCount] = useState(0);
  const [antiTabSwitchEnabled, setAntiTabSwitchEnabled] = useState(false);

  const [answerDistribution, setAnswerDistribution] = useState<
    Record<string, number>
  >({});
  const [correctAnswerId, setCorrectAnswerId] = useState<string>("");

  // Connection States
  const [lastSyncedQuestionId, setLastSyncedQuestionId] = useState<
    string | null
  >(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [pusherConnected, setPusherConnected] = useState(false);

  console.log(gameStatus, lastSyncedQuestionId, questionIndex);

  const syncGameState = useCallback(
    (state: GameState) => {
      setGameStatus(state.status);
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
      setSupportsIntermission(state.supportsIntermission ?? false);
      setAnswersCount(state.answersCount ?? 0);
      setAntiTabSwitchEnabled(state.antiTabSwitchEnabled ?? false);
    },
    [lastSyncedQuestionId, onNewQuestion],
  );

  // SSE
  const [forceReconnect, setForceReconnect] = useState(0);
  useEffect(() => {
    const interval = setInterval(
      () => {
        setForceReconnect((n) => n + 1);
      },
      4 * 60 * 1000,
    );
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
      // Enable IF: Player exists, game not ended, AND (SSE disabled AND Pusher disabled/disconnected)
      // OR if we want to fetch manually (refetch handles this)
      enabled:
        !!playerId &&
        gameStatus !== "ENDED" &&
        !sseConnected &&
        !pusherConnected,
      refetchInterval: false,
    },
  );

  useEffect(() => {
    // console.log(pusherConnected)
    if (!playerId || gameStatus === "ENDED" || pusherConnected) return; // Removed sseConnected check

    let timerId: ReturnType<typeof setTimeout>;
    const scheduleAlignedPoll = () => {
      const now = Date.now();
      const delay = POLL_INTERVAL - (now % POLL_INTERVAL);
      timerId = setTimeout(() => {
        void pollQuery.refetch();
        scheduleAlignedPoll();
      }, delay);
    };
    scheduleAlignedPoll();
    return () => clearTimeout(timerId);
  }, [playerId, gameStatus, pusherConnected]);

  // Sync state from pollQuery (Active for both Polling AND Pusher-triggered refetch)
  useEffect(() => {
    if (pollQuery.data) {
      // Logic to avoid jitter:
      // If we have pusher connected, we trust pollQuery more than pusher's canonical question?
      // YES. pollQuery has personal question.

      // Check if data is actually new to avoid loops?
      // syncGameState handles some deduping but better check here.

      // Simplest: Always sync if data arrives.
      syncGameState(pollQuery.data);
    }
  }, [pollQuery.data, syncGameState]);

  useEffect(() => {
    if (pollQuery.data && !firstLoadAfterJoin) {
      setFirstLoadAfterJoin(true);
      syncGameState(pollQuery.data);
    }
  }, [pollQuery.data, syncGameState, firstLoadAfterJoin]);

  // Pusher
  const syncGameStateRef = useRef(syncGameState);
  useEffect(() => {
    syncGameStateRef.current = syncGameState;
  }, [syncGameState]);

  // Ref for pollQuery to avoid stale closure in Pusher callback
  const pollQueryRef = useRef(pollQuery);
  useEffect(() => {
    pollQueryRef.current = pollQuery;
  }, [pollQuery]);

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

        // Admin (no playerId) gets canonical state directly from Pusher. Students refetch for personalized state.
        if (!playerId) {
          syncGameStateRef.current(data);
        } else {
          void pollQueryRef.current.refetch();
        }
      });

      channel.bind("answer-submitted", (data: { answersCount: number }) => {
        console.log("[Pusher] Answer submitted update:", data);
        // Both admin and students can simply update the answersCount without refetching everything.
        if (mounted) {
          setAnswersCount(data.answersCount);
        }
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
          setPusherConnected(states.current === "connected");
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
  }, [sessionId, playerId]);

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
    gameStatus,
    setGameStatus,
    currentQuestion,
    setCurrentQuestion,
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
    clockOffset,
    supportsIntermission,
    answersCount,
    antiTabSwitchEnabled,
  };
}
