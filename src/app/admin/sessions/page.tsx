"use client";

import { api } from "@mce-quiz/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, Users, Calendar, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SessionsPage() {
    const { data: sessions, isLoading } = api.admin.getSessions.useQuery();
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ACTIVE": return "default";
            case "WAITING": return "secondary";
            case "ENDED": return "outline";
            default: return "outline";
        }
    };

    const filteredSessions = sessions?.filter(session => {
        if (activeTab === 'active') {
            return session.status === 'ACTIVE' || session.status === 'WAITING';
        } else {
            return session.status === 'ENDED';
        }
    }) ?? [];

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
                    <p className="text-muted-foreground mt-1">View past and active game sessions</p>
                </div>
            </div>

            <div className="flex gap-2 rounded-xl bg-muted p-1 w-fit">
                <button
                    onClick={() => setActiveTab('active')}
                    className={cn(
                        "w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                        activeTab === 'active'
                            ? "bg-background shadow text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.12] hover:text-white"
                    )}
                >
                    Active & Waiting
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={cn(
                        "w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                        activeTab === 'past'
                            ? "bg-background shadow text-foreground"
                            : "text-muted-foreground hover:bg-white/[0.12] hover:text-white"
                    )}
                >
                    Past Sessions
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{activeTab === 'active' ? 'Active & Waiting Sessions' : 'Past Sessions'}</CardTitle>
                    <CardDescription>
                        {activeTab === 'active' ? 'Sessions currently in progress or waiting for players.' : 'A history of completed quiz sessions.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Spinner size="lg" />
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No {activeTab} sessions found.</p>
                            {activeTab === 'active' && (
                                <Link href="/admin/quiz/new">
                                    <Button className="mt-4" variant="outline">Create a Quiz to Start</Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <div className="grid grid-cols-14 gap-4 p-4 border-b bg-muted/50 font-medium text-sm text-muted-foreground">
                                <div className="col-span-4 md:col-span-3">Quiz</div>
                                <div className="col-span-3 md:col-span-2">Status</div>
                                <div className="col-span-2 text-center md:text-left">Code</div>
                                <div className="col-span-3 hidden md:block">Date</div>
                                <div className="col-span-2 hidden md:block text-center">Players</div>
                                <div className="col-span-3 md:col-span-2 text-right">Actions</div>
                            </div>
                            <div className="divide-y">
                                {filteredSessions.map((session) => (
                                    <div key={session.id} className="grid grid-cols-14 gap-4 p-4 items-center text-sm hover:bg-muted/50 transition-colors">
                                        <div className="col-span-4 md:col-span-3 font-medium truncate" title={session.quiz.title}>
                                            {session.quiz.title}
                                        </div>
                                        <div className="col-span-3 md:col-span-2">
                                            <Badge variant={getStatusColor(session.status) as any}>
                                                {session.status}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2 font-mono text-xs text-center md:text-left bg-muted px-1.5 py-0.5 rounded w-fit">
                                            {session.code}
                                        </div>
                                        <div className="col-span-3 hidden md:flex items-center text-muted-foreground">
                                            <Calendar className="mr-2 h-3.5 w-3.5" />
                                            {format(new Date(session.createdAt), "MMM d, HH:mm")}
                                        </div>
                                        <div className="col-span-2 hidden md:flex items-center justify-center text-muted-foreground">
                                            <Users className="mr-2 h-3.5 w-3.5" />
                                            {session._count.players}
                                        </div>
                                        <div className="col-span-3 md:col-span-2 flex justify-end">
                                            <Link href={`/admin/session/${session.id}`}>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                    <Eye className="h-4 w-4" />
                                                    <span className="sr-only">View Details</span>
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
