import { Card } from "@/components/ui/card";
import { Code2 } from "lucide-react";

export function GameLobby({ name, leaderboard, playerId }: { name: string, leaderboard: any[], playerId: string }) {
    const AVATAR_COLORS = [
        "from-teal-400 to-cyan-500",
        "from-amber-400 to-orange-500",
        "from-emerald-400 to-green-500",
        "from-sky-400 to-blue-500",
        "from-rose-400 to-pink-500",
        "from-violet-400 to-purple-500",
        "from-fuchsia-400 to-pink-500",
        "from-lime-400 to-emerald-500",
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-blue-500/4 blur-3xl" />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-amber-500/3 blur-3xl" />
            </div>

            <Card className="w-full max-w-md text-center p-6 border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="animate-ping absolute inset-0 rounded-full bg-primary/15" />
                        <div className="relative bg-primary/10 p-6 rounded-full">
                            <Code2 className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                </div>
                <h1 className="text-2xl font-bold mb-2 text-primary">You're in!</h1>
                <p className="text-muted-foreground mb-6">Waiting for the host to start...</p>
                <div className="bg-gradient-to-br from-muted/80 to-muted/50 p-4 rounded-xl border border-border/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Player</p>
                    <p className="font-bold text-xl">{name}</p>
                </div>

                {/* Participants */}
                {leaderboard.length > 0 && (
                    <div className="mt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                            {leaderboard.length} player{leaderboard.length !== 1 ? "s" : ""} joined
                        </p>
                        <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex flex-wrap justify-center gap-3">
                                {leaderboard.map((p, i) => {
                                    const initial = p.name.charAt(0).toUpperCase();
                                    const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length]!;
                                    const isMe = p.playerId === playerId;
                                    return (
                                        <div key={p.playerId} className="flex flex-col justify-center items-center gap-1 w-18 h-18">
                                            <div
                                                className={`w-11 h-11 rounded-full bg-linear-to-br ${colorClass} flex items-center justify-center text-white font-bold text-lg shadow-md ${isMe ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-card" : ""}`}
                                            >
                                                {initial}
                                            </div>
                                            <span className={`text-xs truncate w-full text-center ${isMe ? "font-semibold text-amber-500" : "text-muted-foreground"}`}>
                                                {isMe ? "You" : p.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
