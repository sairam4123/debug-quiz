"use client";

import { api } from "@mce-quiz/trpc/react";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    Eye, Users, Calendar, Gamepad2, Zap, History,
    CircleDot, Clock, ArrowRight, Inbox
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SessionsPage() {
    const { data: sessions, isLoading } = api.admin.getSessions.useQuery();
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
        <div className="min-h-screen">
            {/* Decorative background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
                <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-sky-500/5 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
            </div>

            <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/20">
                            <Gamepad2 className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                Sessions
                            </h1>
                            <p className="text-muted-foreground mt-0.5">
                                View past and active game sessions
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1.5 rounded-2xl bg-muted/80 backdrop-blur-sm p-1.5 w-fit border border-border/50">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={cn(
                            "flex items-center gap-2 rounded-xl py-2.5 px-5 text-sm font-semibold transition-all duration-200",
                            activeTab === 'active'
                                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <Zap className="h-4 w-4" />
                        Active & Waiting
                        {activeCount > 0 && (
                            <span className={cn(
                                "ml-1 text-xs font-bold px-2 py-0.5 rounded-full",
                                activeTab === 'active'
                                    ? "bg-white/20 text-white"
                                    : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                            )}>
                                {activeCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={cn(
                            "flex items-center gap-2 rounded-xl py-2.5 px-5 text-sm font-semibold transition-all duration-200",
                            activeTab === 'past'
                                ? "bg-gradient-to-r from-slate-600 to-slate-500 dark:from-slate-500 dark:to-slate-400 text-white shadow-lg shadow-slate-500/25"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <History className="h-4 w-4" />
                        Past Sessions
                        {pastCount > 0 && (
                            <span className={cn(
                                "ml-1 text-xs font-bold px-2 py-0.5 rounded-full",
                                activeTab === 'past'
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            )}>
                                {pastCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                ) : filteredSessions.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-muted to-muted/50 border border-border/50 mb-6">
                            <Inbox className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                            No {activeTab === 'active' ? 'active' : 'past'} sessions
                        </h3>
                        <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                            {activeTab === 'active'
                                ? "Start a new quiz session to see it here. Create a quiz first if you haven't already."
                                : "Completed sessions will appear here after they end."}
                        </p>
                        {activeTab === 'active' && (
                            <Link href="/admin/quiz/new">
                                <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 border-0">
                                    Create a Quiz to Start
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    /* Sessions List */
                    <div className="space-y-3">
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
                                        "relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border transition-all duration-200",
                                        "bg-card/80 backdrop-blur-sm hover:shadow-lg hover:scale-[1.01]",
                                        isActive && "border-emerald-500/30 hover:shadow-emerald-500/10 hover:border-emerald-500/50",
                                        isWaiting && "border-amber-500/30 hover:shadow-amber-500/10 hover:border-amber-500/50",
                                        !isActive && !isWaiting && "border-border/50 hover:shadow-slate-500/10 hover:border-border"
                                    )}>
                                        {/* Colored accent bar */}
                                        <div className={cn(
                                            "absolute left-0 top-4 bottom-4 w-1 rounded-full",
                                            isActive && "bg-gradient-to-b from-emerald-400 to-teal-500",
                                            isWaiting && "bg-gradient-to-b from-amber-400 to-orange-500",
                                            !isActive && !isWaiting && "bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
                                        )} />

                                        {/* Status Icon */}
                                        <div className={cn(
                                            "shrink-0 p-2.5 rounded-xl ml-2",
                                            isActive && "bg-emerald-500/10 text-emerald-500",
                                            isWaiting && "bg-amber-500/10 text-amber-500",
                                            !isActive && !isWaiting && "bg-slate-500/10 text-slate-500"
                                        )}>
                                            {isActive ? <Zap className="h-5 w-5" /> :
                                                isWaiting ? <Clock className="h-5 w-5" /> :
                                                    <CircleDot className="h-5 w-5" />}
                                        </div>

                                        {/* Quiz Title + Status */}
                                        <div className="flex-1 min-w-0 ml-1">
                                            <div className="flex items-center gap-2.5 mb-1">
                                                <span className="font-semibold truncate text-base">
                                                    {session.quiz.title}
                                                </span>
                                                <span className={cn(
                                                    "shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                                                    isActive && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                                    isWaiting && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                                    !isActive && !isWaiting && "bg-slate-500/10 text-slate-500"
                                                )}>
                                                    {session.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="font-mono bg-muted/80 px-2 py-0.5 rounded-md font-semibold">
                                                    {session.code}
                                                </span>
                                                <span className="hidden sm:flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(session.createdAt), "MMM d, HH:mm")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Players + Action */}
                                        <div className="flex items-center gap-5 sm:ml-auto pl-10 sm:pl-0">
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Users className="h-4 w-4" />
                                                <span className="font-semibold tabular-nums">{session._count.players}</span>
                                                <span className="hidden sm:inline">players</span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-teal-500/10 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                <Eye className="h-4 w-4" />
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
