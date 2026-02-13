"use client";

import { useState, useCallback } from "react";
import { useGameSession } from "./_hooks/useGameSession";
import { useGameState } from "@/app/hooks/useGameState";
import { useGameInteraction } from "./_hooks/useGameInteraction";
import { GameJoin } from "./_components/GameJoin";
import { GameLobby } from "./_components/GameLobby";
import { GameLeaderboard } from "./_components/GameLeaderboard";
import { GameQuestion } from "./_components/GameQuestion";
import { IntermissionFlow } from "./_components/IntermissionFlow";

export default function PlayPage() {
    const {
        name, setName,
        code, setCode,
        playerId,
        sessionId,
        joinStep, setJoinStep,
        joinSession
    } = useGameSession();

    // Interaction Hook needed first to pass reset function to GameState hook
    const {
        selectedOption,
        isSubmitted,
        hypeMessage,
        submit,
        resetForNewQuestion
    } = useGameInteraction(sessionId, playerId);

    // Question splash screen state
    const [showSplash, setShowSplash] = useState(false);

    // Callback when a new question is detected by useGameState
    const onNewQuestion = useCallback(() => {
        resetForNewQuestion(true); // true = keep streak if applicable, logic handled in hook generally but here updated
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
        isIntermission
    } = useGameState(sessionId, playerId, onNewQuestion);

    // Timer expired — show between-question leaderboard
    const [timerExpired, setTimerExpired] = useState(false);
    const handleTimerExpire = useCallback(() => {
        setTimerExpired(true);
    }, []);

    const handleJoin = (selectedClass: string) => {
        joinSession.mutate({ code, name, class: selectedClass as any });
    };

    console.log(gameStatus, questionStartTime, timeLimit, questionIndex,);

    // ==================== RENDER ====================

    if (!playerId) {
        return (
            <GameJoin
                step={joinStep}
                code={code}
                name={name}
                onCodeChange={setCode}
                onNameChange={setName}
                onStepChange={setJoinStep}
                onJoin={handleJoin}
            />
        );
    }

    if (gameStatus === "ENDED") {
        return <GameLeaderboard leaderboard={leaderboard} playerId={playerId} isFinal={true} />;
    }

    if (gameStatus === "WAITING") {
        return <GameLobby name={name} leaderboard={leaderboard} playerId={playerId} />;
    }

    if (gameStatus === "ACTIVE" && currentQuestion) {
        console.log()
        if (timerExpired && leaderboard.length > 0 && !isHistory) {
            return (
                <GameLeaderboard
                    leaderboard={leaderboard}
                    playerId={playerId}
                    isFinal={false}
                    questionIndex={questionIndex}
                    totalQuestions={totalQuestions}
                />
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
                onOptionClick={(optId) => submit(currentQuestion.id, optId, questionStartTime, timeLimit)}
                onTimerExpire={handleTimerExpire}
                sseConnected={sseConnected}
                pusherConnected={pusherConnected}
                isHistory={isHistory}
                clockOffset={clockOffset}
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

    return null; // Should not happen
}
