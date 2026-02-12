"use client";

import { api } from "@mce-quiz/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Clock, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { DownloadResults } from "../../session/components/DownloadResults";

export default function SessionDetailsPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;
    const { data: session, isLoading } = api.admin.getSession.useQuery({ sessionId });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ACTIVE": return "default";
            case "WAITING": return "secondary";
            case "ENDED": return "outline";
            default: return "outline";
        }
    };

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

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/sessions">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{session.quiz.title}</h1>
                        <Badge variant={getStatusColor(session.status) as any}>
                            {session.status}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1.5">
                            <Hash className="h-3.5 w-3.5" />
                            <span className="font-mono">{session.code}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{format(new Date(session.createdAt), "MMM d, yyyy HH:mm")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <span>{session.players.length} Players</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                Leaderboard
                            </CardTitle>
                            <CardDescription>
                                Final rankings and scores
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y text-sm">
                                <div className="grid grid-cols-12 gap-4 p-4 font-medium bg-muted/50 text-muted-foreground">
                                    <div className="col-span-2 text-center">Rank</div>
                                    <div className="col-span-6">Player</div>
                                    <div className="col-span-4 text-right">Score</div>
                                </div>
                                {session.players.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No players joined this session.
                                    </div>
                                ) : (
                                    session.players.map((player, index) => (
                                        <div key={player.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/50 transition-colors">
                                            <div className="col-span-2 flex justify-center">
                                                {index < 3 ? (
                                                    <div className={`
                                                        w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs
                                                        ${index === 0 ? 'bg-amber-100 text-amber-600' : ''}
                                                        ${index === 1 ? 'bg-slate-100 text-slate-600' : ''}
                                                        ${index === 2 ? 'bg-orange-100 text-orange-600' : ''}
                                                    `}>
                                                        {index + 1}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">{index + 1}</span>
                                                )}
                                            </div>
                                            <div className="col-span-6">
                                                <div className="font-medium">{player.name}</div>
                                                <div className="text-xs text-muted-foreground">{player.class}</div>
                                            </div>
                                            <div className="col-span-4 text-right font-mono font-medium">
                                                {player.score.toLocaleString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Session Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Avg Score</div>
                                    <div className="text-xl font-bold">
                                        {session.players.length > 0
                                            ? Math.round(session.players.reduce((acc, p) => acc + p.score, 0) / session.players.length).toLocaleString()
                                            : 0}
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Top Score</div>
                                    <div className="text-xl font-bold">
                                        {session.players.length > 0 ? Math.max(...session.players.map(p => p.score)).toLocaleString() : 0}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
