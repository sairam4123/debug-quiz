"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api } from "@mce-quiz/trpc/react";
import { Users, Play, Plus, LayoutList, ArrowRight, HelpCircle, Calendar, Gamepad2, BookOpen } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export default function AdminDashboard() {
    const { data: stats, isLoading } = api.admin.getDashboardStats.useQuery();
    const { data: quizzes, isLoading: quizzesLoading } = api.admin.getQuizzes.useQuery();

    const recentQuizzes = quizzes?.slice(0, 5) ?? [];

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
                        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Overview of your quiz platform</p>
                    </div>
                    <Link href="/admin/quiz/new">
                        <Button className="bg-primary hover:bg-primary/90 text-white font-semibold border-0">
                            <Plus className="mr-2 h-4 w-4" /> Create Quiz
                        </Button>
                    </Link>
                </div>

                {/* ── Bento grid ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-auto">

                    {/* Stat — Total Quizzes (spans 4 cols) */}
                    <Card className="lg:col-span-4 border-border/50 bg-card overflow-hidden">
                        <CardContent className="p-6 flex flex-col gap-4 h-full">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Total Quizzes</span>
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <BookOpen className="h-4 w-4 text-primary" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Spinner size="sm" />
                            ) : (
                                <p className="text-5xl font-extrabold tabular-nums text-foreground leading-none">
                                    {stats?.totalQuizzes ?? 0}
                                </p>
                            )}
                            <Link href="/admin/quizzes" className="mt-auto">
                                <span className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                                    View all <ArrowRight className="h-3 w-3" />
                                </span>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Stat — Active Sessions (spans 4 cols) */}
                    <Card className="lg:col-span-4 border-border/50 bg-card overflow-hidden">
                        <CardContent className="p-6 flex flex-col gap-4 h-full">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Active Sessions</span>
                                <div className="p-2 rounded-xl bg-emerald-500/10">
                                    <Play className="h-4 w-4 text-emerald-500" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Spinner size="sm" />
                            ) : (
                                <p className="text-5xl font-extrabold tabular-nums text-foreground leading-none">
                                    {stats?.activeSessions ?? 0}
                                </p>
                            )}
                            <Link href="/admin/sessions" className="mt-auto">
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1">
                                    View sessions <ArrowRight className="h-3 w-3" />
                                </span>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Stat — Total Players (spans 4 cols) */}
                    <Card className="lg:col-span-4 border-border/50 bg-card overflow-hidden">
                        <CardContent className="p-6 flex flex-col gap-4 h-full">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Total Players</span>
                                <div className="p-2 rounded-xl bg-amber-500/10">
                                    <Users className="h-4 w-4 text-amber-500" />
                                </div>
                            </div>
                            {isLoading ? (
                                <Spinner size="sm" />
                            ) : (
                                <p className="text-5xl font-extrabold tabular-nums text-foreground leading-none">
                                    {stats?.totalPlayers ?? 0}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-auto">Across all sessions</p>
                        </CardContent>
                    </Card>

                    {/* Quick Action — Create Quiz (spans 3 cols) */}
                    <Link href="/admin/quiz/new" className="group lg:col-span-3 sm:col-span-1">
                        <Card className="h-full border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200">
                            <CardContent className="p-6 flex flex-col gap-3 h-full">
                                <div className="p-3 rounded-xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                                    <Plus className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold">Create Quiz</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">Build a new quiz with questions</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Quick Action — Sessions (spans 3 cols) */}
                    <Link href="/admin/sessions" className="group lg:col-span-3 sm:col-span-1">
                        <Card className="h-full border-border/50 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all duration-200">
                            <CardContent className="p-6 flex flex-col gap-3 h-full">
                                <div className="p-3 rounded-xl bg-emerald-500/10 w-fit group-hover:bg-emerald-500/20 transition-colors">
                                    <Gamepad2 className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold">Sessions</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">View past & active game sessions</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Recent Quizzes — spans 6 cols, 2 rows tall */}
                    <Card className="lg:col-span-6 sm:col-span-2 border-border/50 bg-card overflow-hidden row-span-1">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                                        <Calendar className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Recent Quizzes</CardTitle>
                                        <CardDescription className="text-xs">Your latest activity</CardDescription>
                                    </div>
                                </div>
                                <Link href="/admin/quizzes">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary px-2">
                                        View all <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {quizzesLoading ? (
                                <div className="flex justify-center py-6">
                                    <Spinner size="sm" />
                                </div>
                            ) : recentQuizzes.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground text-sm">No quizzes yet</p>
                                    <Link href="/admin/quiz/new">
                                        <Button variant="link" className="mt-1 text-primary text-sm">Create your first quiz</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {recentQuizzes.map((quiz) => (
                                        <Link key={quiz.id} href={`/admin/quiz/${quiz.id}`}>
                                            <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-1.5 rounded-md bg-muted group-hover:bg-primary/10 transition-colors shrink-0">
                                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm truncate">{quiz.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {quiz._count.questions} questions · {format(new Date(quiz.createdAt), "MMM d, yyyy")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <LayoutList className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
