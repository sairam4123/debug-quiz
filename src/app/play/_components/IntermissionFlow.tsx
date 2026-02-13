"use strict";
import { useState, useEffect } from "react";
import { GameStats } from "./GameStats";
import { GameLeaderboard } from "./GameLeaderboard";
import { motion, AnimatePresence } from "framer-motion";

interface IntermissionFlowProps {
    answerDistribution: Record<string, number>;
    correctAnswerId: string;
    // We need the full question options to display text
    currentQuestion: {
        id: string;
        text: string;
        options: { id: string; text: string; isCorrect: boolean }[];
    };
    leaderboard: any[];
    currentUserId?: string;
}

export function IntermissionFlow({
    answerDistribution,
    correctAnswerId,
    currentQuestion,
    leaderboard,
    currentUserId
}: IntermissionFlowProps) {
    // Phase 1: Stats (0-5s), Phase 2: Leaderboard (5s+)
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowLeaderboard(true);
        }, 5000); // Show stats for 5 seconds

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <AnimatePresence mode="wait">
                {!showLeaderboard ? (
                    <motion.div
                        key="stats"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <GameStats
                            answerDistribution={answerDistribution || {}}
                            options={currentQuestion.options}
                            totalPlayers={leaderboard.length}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="leaderboard"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="">
                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-bold bg-linear-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                                    Leaderboard
                                </h2>
                            </div>
                            <GameLeaderboard
                                leaderboard={leaderboard}
                                playerId={currentUserId || null}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
