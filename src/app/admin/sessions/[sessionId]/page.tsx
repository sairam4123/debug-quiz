"use client";

import { api } from "@mce-quiz/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Clock, Hash, Medal, TrendingUp, Award } from "lucide-react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { DownloadResults } from "../../session/components/DownloadResults";
import { cn } from "@/lib/utils";

export default function SessionDetailsPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const { data: session, isLoading } = api.admin.getSession.useQuery({ sessionId });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h2 className="text-xl font-semibold">Session not found</h2>
                <Link href="/admin/sessions">
                    <Button variant="outline">Back to Sessions</Button>
                </Link>
            </div>
        );
    }

    const avgScore = session.players.length > 0
        ? Math.round(session.players.reduce((acc, p) => acc + p.score, 0) / session.players.length)
        : 0;
    const topScore = session.players.length > 0
        ? Math.max(...session.players.map(p => p.score))
        : 0;

    return (
        <div className="min-h-screen">
            {/* Decorative background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
                <div className="absolute top-1/2 -left-20 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl" />
                <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-sky-500/5 blur-3xl" />
            </div>

            <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Link href="/admin/sessions">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mt-1"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                {session.quiz.title}
                            </h1>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                                session.status === "ACTIVE" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                session.status === "WAITING" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                session.status === "ENDED" && "bg-slate-500/10 text-slate-500"
                            )}>
                                {session.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1 rounded-lg">
                                <Hash className="h-3.5 w-3.5 text-teal-500" />
                                <span className="font-mono font-semibold">{session.code}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-sky-500" />
                                <span>{format(new Date(session.createdAt), "MMM d, yyyy HH:mm")}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-amber-500" />
                                <span className="font-semibold">{session.players.length}</span> Players
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Left Column: Leaderboard */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/15">
                                        <Trophy className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <CardTitle>Leaderboard</CardTitle>
                                        <CardDescription>Final rankings and scores</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/30 text-sm">
                                    {/* Header row */}
                                    <div className="grid grid-cols-12 gap-4 p-4 font-semibold bg-gradient-to-r from-muted/80 to-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                                        <div className="col-span-2 text-center">Rank</div>
                                        <div className="col-span-6">Player</div>
                                        <div className="col-span-4 text-right">Score</div>
                                    </div>
                                    {session.players.length === 0 ? (
                                        <div className="flex flex-col items-center py-12">
                                            <div className="p-4 rounded-2xl bg-muted/50 mb-3">
                                                <Users className="h-8 w-8 text-muted-foreground/40" />
                                            </div>
                                            <p className="text-muted-foreground">No players joined this session.</p>
                                        </div>
                                    ) : (
                                        session.players.map((player, index) => (
                                            <div
                                                key={player.id}
                                                className={cn(
                                                    "grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-all duration-200",
                                                    index === 0 && "bg-gradient-to-r from-amber-500/5 to-transparent",
                                                    index === 1 && "bg-gradient-to-r from-slate-400/5 to-transparent",
                                                    index === 2 && "bg-gradient-to-r from-orange-500/5 to-transparent"
                                                )}
                                            >
                                                <div className="col-span-2 flex justify-center">
                                                    {index < 3 ? (
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                                            index === 0 && "bg-gradient-to-br from-amber-400/20 to-yellow-500/20",
                                                            index === 1 && "bg-gradient-to-br from-slate-300/20 to-slate-400/20",
                                                            index === 2 && "bg-gradient-to-br from-orange-400/20 to-amber-400/20"
                                                        )}>
                                                            <Medal className={cn(
                                                                "h-4 w-4",
                                                                index === 0 && "text-amber-500",
                                                                index === 1 && "text-slate-400",
                                                                index === 2 && "text-orange-500"
                                                            )} />
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground font-semibold">{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="col-span-6">
                                                    <div className="font-semibold">{player.name}</div>
                                                    <div className="text-xs text-muted-foreground">{player.class}</div>
                                                </div>
                                                <div className="col-span-4 text-right">
                                                    <span className={cn(
                                                        "font-mono font-bold text-lg tabular-nums",
                                                        index === 0 && "bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent"
                                                    )}>
                                                        {player.score.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Stats */}
                    <div className="space-y-6">
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/10 to-cyan-500/10">
                                        <TrendingUp className="h-5 w-5 text-sky-500" />
                                    </div>
                                    <CardTitle>Session Stats</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/5 to-cyan-500/5 border border-teal-500/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
                                            <span className="text-xs text-muted-foreground font-medium">Avg Score</span>
                                        </div>
                                        <div className="text-2xl font-bold tabular-nums bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                            {avgScore.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border border-amber-500/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Award className="h-3.5 w-3.5 text-amber-500" />
                                            <span className="text-xs text-muted-foreground font-medium">Top Score</span>
                                        </div>
                                        <div className="text-2xl font-bold tabular-nums bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
                                            {topScore.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
