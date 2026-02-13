import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown, Medal, Star, BarChart3, RotateCcw, User } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { motion, AnimatePresence } from "framer-motion";

function RankIcon({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <Star className="h-5 w-5 text-muted-foreground/60" />;
}

export function GameLeaderboard({
    leaderboard,
    playerId,
    isFinal = false,
    questionIndex,
    totalQuestions
}: {
    leaderboard: any[],
    playerId: string | null,
    isFinal?: boolean,
    questionIndex?: number,
    totalQuestions?: number
}) {
    const myRank = leaderboard.find((e) => e.playerId === playerId);

    if (isFinal) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
                {/* Confetti for 1st place! */}
                {myRank?.rank === 1 && <Confetti active={true} duration={5000} />}

                {/* Decorative bg */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-3xl" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-teal-500/6 blur-3xl" />
                </div>

                <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
                    <CardContent className="p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 mb-2">
                                <Trophy className="h-10 w-10 text-amber-500" />
                            </div>
                            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                                Quiz Complete!
                            </h1>
                            {myRank && (
                                <p className="text-lg text-muted-foreground">
                                    You finished <span className="font-bold text-teal-500">#{myRank.rank}</span> with <span className="font-bold text-teal-500">{myRank.score}</span> pts
                                </p>
                            )}
                        </div>

                        {/* Leaderboard table */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                                Leaderboard
                            </div>
                            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-2 custom-scrollbar relative">
                                <AnimatePresence mode="popLayout">
                                    {leaderboard.map((entry) => {
                                        const isMe = entry.playerId === playerId;
                                        const rankBg = entry.rank === 1
                                            ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
                                            : entry.rank === 2
                                                ? "bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-400/20"
                                                : entry.rank === 3
                                                    ? "bg-gradient-to-r from-amber-700/10 to-amber-600/10 border-amber-600/20"
                                                    : isMe
                                                        ? "bg-teal-500/10 border-teal-500/20"
                                                        : "bg-muted/50 border-transparent";
                                        return (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                key={entry.playerId}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors border ${rankBg}`}
                                            >
                                                <RankIcon rank={entry.rank} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold truncate flex items-center gap-1 text-sm ${isMe ? "text-teal-500" : ""}`}>
                                                        {entry.name}
                                                        {isMe && <User className="h-3 w-3 inline text-teal-500/60" />}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{entry.class}</p>
                                                </div>
                                                <span className="font-bold text-lg tabular-nums">
                                                    {entry.score}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>

                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full gap-2 h-11 font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/15 border-0"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Play Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Inter-question leaderboard
    const myEntry = leaderboard.find((e) => e.playerId === playerId);
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-amber-500/8 blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-500/8 blur-3xl" />
            </div>

            <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-6 space-y-5">
                    <div className="text-center space-y-1">
                        <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 mb-1">
                            <BarChart3 className="h-7 w-7 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-bold">Live Standings</h2>
                        {myEntry && (
                            <p className="text-sm text-muted-foreground">
                                You&apos;re <span className="font-bold text-teal-500">#{myEntry.rank}</span> with <span className="font-bold text-teal-500">{myEntry.score}</span> pts
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5 relative">
                        <AnimatePresence mode="popLayout">
                            {leaderboard.slice(0, 10).map((entry, idx) => {
                                const isMe = entry.playerId === playerId;
                                const rankBg = entry.rank === 1
                                    ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20"
                                    : entry.rank === 2
                                        ? "bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-400/20"
                                        : entry.rank === 3
                                            ? "bg-gradient-to-r from-amber-700/10 to-amber-600/10 border-amber-600/20"
                                            : isMe
                                                ? "bg-teal-500/10 border-teal-500/20"
                                                : "bg-muted/50 border-transparent";
                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        key={entry.playerId}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${rankBg}`}
                                    >
                                        <RankIcon rank={entry.rank} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold truncate flex items-center gap-1 text-sm ${isMe ? "text-teal-500" : ""}`}>
                                                {entry.name}
                                                {isMe && <User className="h-3 w-3 inline text-teal-500/60" />}
                                            </p>
                                        </div>
                                        <span className="font-bold tabular-nums">{entry.score}</span>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {totalQuestions && (
                        <div className="text-center">
                            <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                Q{questionIndex}/{totalQuestions}
                            </span>
                        </div>
                    )}

                    <p className="text-xs text-center text-muted-foreground animate-pulse">
                        Waiting for next question...
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
