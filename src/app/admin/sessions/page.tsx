"use client";

import { api } from "@mce-quiz/trpc/react";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    Eye, Users, Calendar, Zap, History,
    CircleDot, Clock, ArrowRight, Inbox, Plus
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SessionsPage() {
    const { data: sessions, isLoading } = api.session.getAll.useQuery();
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

    const filteredSessions = sessions?.filter(session => {
        if (activeTab === 'active') {
            return session.status === 'ACTIVE' || session.status === 'WAITING';
        } else {
            return session.status === 'ENDED';
        }
    }) ?? [];

    const activeCount = sessions?.filter(s => s.status === 'ACTIVE' || s.status === 'WAITING').length ?? 0;
    const pastCount = sessions?.filter(s => s.status === 'ENDED').length ?? 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Subtle ambient orbs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/4 blur-3xl" />
                <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-amber-500/4 blur-3xl" />
            </div>

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">

                {/* ── Page header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">View past and active game sessions</p>
                    </div>
                    <Link href="/admin/quiz/new">
                        <Button className="bg-primary hover:bg-primary/90 text-white font-semibold border-0">
                            <Plus className="mr-2 h-4 w-4" /> New Quiz
                        </Button>
                    </Link>
                </div>

                {/* ── Tab Switcher ── */}
                <div className="flex gap-1 rounded-xl bg-muted/60 p-1 w-fit border border-border/40">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={cn(
                            "flex items-center gap-2 rounded-lg py-2 px-4 text-sm font-medium transition-all duration-150",
                            activeTab === 'active'
                                ? "bg-background text-foreground shadow-sm border border-border/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Zap className="h-3.5 w-3.5" />
                        Active & Waiting
                        {activeCount > 0 && (
                            <span className={cn(
                                "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                activeTab === 'active'
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {activeCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={cn(
                            "flex items-center gap-2 rounded-lg py-2 px-4 text-sm font-medium transition-all duration-150",
                            activeTab === 'past'
                                ? "bg-background text-foreground shadow-sm border border-border/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <History className="h-3.5 w-3.5" />
                        Past
                        {pastCount > 0 && (
                            <span className={cn(
                                "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                activeTab === 'past'
                                    ? "bg-muted text-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}>
                                {pastCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Content ── */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                ) : filteredSessions.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/50 mb-5">
                            <Inbox className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1.5">
                            No {activeTab === 'active' ? 'active' : 'past'} sessions
                        </h3>
                        <p className="text-muted-foreground text-sm text-center max-w-sm mb-5">
                            {activeTab === 'active'
                                ? "Start a new quiz session to see it here."
                                : "Completed sessions will appear here after they end."}
                        </p>
                        {activeTab === 'active' && (
                            <Link href="/admin/quiz/new">
                                <Button className="bg-primary hover:bg-primary/90 text-white border-0">
                                    Create a Quiz to Start
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    /* ── Sessions List ── */
                    <div className="space-y-2">
                        {filteredSessions.map((session) => {
                            const isActive = session.status === 'ACTIVE';
                            const isWaiting = session.status === 'WAITING';

                            return (
                                <Link
                                    key={session.id}
                                    href={`/admin/session/${session.id}`}
                                    className="block group"
                                >
                                    <div className={cn(
                                        "relative flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all duration-150",
                                        "bg-card hover:shadow-md",
                                        isActive && "border-emerald-500/25 hover:border-emerald-500/40",
                                        isWaiting && "border-amber-500/25 hover:border-amber-500/40",
                                        !isActive && !isWaiting && "border-border/50 hover:border-border"
                                    )}>
                                        {/* Colored left accent */}
                                        <div className={cn(
                                            "absolute left-0 top-3 bottom-3 w-0.5 rounded-full",
                                            isActive && "bg-emerald-500",
                                            isWaiting && "bg-amber-500",
                                            !isActive && !isWaiting && "bg-border"
                                        )} />

                                        {/* Status Icon */}
                                        <div className={cn(
                                            "shrink-0 p-2 rounded-lg ml-2",
                                            isActive && "bg-emerald-500/10 text-emerald-500",
                                            isWaiting && "bg-amber-500/10 text-amber-500",
                                            !isActive && !isWaiting && "bg-muted text-muted-foreground"
                                        )}>
                                            {isActive ? <Zap className="h-4 w-4" /> :
                                                isWaiting ? <Clock className="h-4 w-4" /> :
                                                    <CircleDot className="h-4 w-4" />}
                                        </div>

                                        {/* Quiz Title + meta */}
                                        <div className="flex-1 min-w-0 ml-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold truncate text-sm">
                                                    {session.quiz.title}
                                                </span>
                                                <span className={cn(
                                                    "shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                    isActive && "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
                                                    isWaiting && "bg-amber-500/12 text-amber-600 dark:text-amber-400",
                                                    !isActive && !isWaiting && "bg-muted text-muted-foreground"
                                                )}>
                                                    {session.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="font-mono bg-muted/70 px-1.5 py-0.5 rounded font-semibold">
                                                    {session.code}
                                                </span>
                                                <span className="hidden sm:flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(session.createdAt), "MMM d, HH:mm")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Players + Action */}
                                        <div className="flex items-center gap-4 sm:ml-auto pl-9 sm:pl-0">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Users className="h-3.5 w-3.5" />
                                                <span className="font-semibold tabular-nums">{session._count.players}</span>
                                                <span className="hidden sm:inline">players</span>
                                            </div>
                                            <div className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Eye className="h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
