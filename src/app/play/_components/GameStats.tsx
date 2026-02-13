"use strict";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface GameStatsProps {
    answerDistribution: Record<string, number>;
    options: { id: string; text: string; isCorrect: boolean }[];
    totalPlayers: number; // To calculate percentages
}

export function GameStats({ answerDistribution, options, totalPlayers }: GameStatsProps) {
    // Calculate total answers to use as denominator if totalPlayers is not accurate or for relative sizing
    const totalAnswers = Object.values(answerDistribution).reduce((a, b) => a + b, 0);
    // Use the larger of totalAnswers or 1 to avoid divide by zero
    const denominator = Math.max(totalAnswers, 1);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Question Stats
                </h2>
                <p className="text-muted-foreground">
                    {totalAnswers} player{totalAnswers !== 1 ? 's' : ''} answered
                </p>
            </div>

            <div className="grid gap-4">
                {options.map((option) => {
                    const count = answerDistribution[option.id] || 0;
                    const percentage = Math.round((count / denominator) * 100);
                    const isCorrect = option.isCorrect;

                    return (
                        <div key={option.id} className="relative group">
                            {/* Background Bar */}
                            <div className={`p-4 rounded-xl border-2 transition-all duration-500 overflow-hidden relative
                                ${isCorrect
                                    ? "border-green-500/50 bg-green-500/10"
                                    : "border-border bg-background/50"
                                }
                            `}>
                                {/* Progress Bar Animation */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`absolute top-0 left-0 h-full opacity-20
                                        ${isCorrect ? "bg-green-500" : "bg-blue-500"}
                                    `}
                                />

                                <div className="relative z-10 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`
                                            w-6 h-6 rounded-full flex items-center justify-center shrink-0
                                            ${isCorrect ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}
                                        `}>
                                            {isCorrect ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold"></span>}
                                        </div>
                                        <span className={`font-medium ${isCorrect ? "text-green-500" : ""}`}>
                                            {option.text}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm font-semibold">
                                        <span className="text-muted-foreground">{count} votes</span>
                                        <span className="w-12 text-right">{percentage}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
