"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api } from "@mce-quiz/trpc/react";
import { Users, Play, Plus, LayoutList, ArrowRight, HelpCircle, Calendar, Sparkles } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export default function AdminDashboard() {
    const { data: stats, isLoading } = api.admin.getDashboardStats.useQuery();
    const { data: quizzes, isLoading: quizzesLoading } = api.admin.getQuizzes.useQuery();

    const recentQuizzes = quizzes?.slice(0, 5) ?? [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-teal-500/[0.03] dark:to-teal-500/[0.05]">
            {/* Decorative background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
                <div className="absolute top-1/2 -left-20 w-72 h-72 rounded-full bg-sky-500/5 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
            </div>

            <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
                {/* Welcome header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/20">
                            <Sparkles className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                Dashboard
                            </h1>
                            <p className="text-muted-foreground mt-0.5">Overview of your quiz platform</p>
                        </div>
                    </div>
                    <Link href="/admin/quiz/new">
                        <Button className="font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/15 border-0">
                            <Plus className="mr-2 h-4 w-4" /> Create Quiz
                        </Button>
                    </Link>
                </div>

                {/* Stats row */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    {[
                        { label: "Total Quizzes", value: stats?.totalQuizzes ?? 0, icon: LayoutList, color: "text-sky-500", bg: "from-sky-500/10 to-cyan-500/10", borderColor: "border-sky-500/15" },
                        { label: "Active Sessions", value: stats?.activeSessions ?? 0, icon: Play, color: "text-emerald-500", bg: "from-emerald-500/10 to-teal-500/10", borderColor: "border-emerald-500/15" },
                        { label: "Total Players", value: stats?.totalPlayers ?? 0, icon: Users, color: "text-amber-500", bg: "from-amber-500/10 to-orange-500/10", borderColor: "border-amber-500/15" },
                    ].map(({ label, value, icon: Icon, color, bg, borderColor }) => (
                        <Card key={label} className={`border-border/50 bg-card/80 backdrop-blur-sm ${borderColor} overflow-hidden`}>
                            <CardContent className="p-5">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${bg}`}>
                                        <Icon className={`h-5 w-5 ${color}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{label}</p>
                                        {isLoading ? (
                                            <Spinner size="sm" />
                                        ) : (
                                            <p className="text-2xl font-bold tabular-nums">{value}</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <Link href="/admin/quiz/new" className="group">
                        <Card className="h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.01] border-border/50 bg-card/80 backdrop-blur-sm hover:border-teal-500/30">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 group-hover:from-teal-500/20 group-hover:to-cyan-500/20 transition-colors">
                                    <Plus className="h-6 w-6 text-teal-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-0.5">Create New Quiz</h3>
                                    <p className="text-sm text-muted-foreground">Build a new quiz with questions and options</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-500 transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/quizzes" className="group">
                        <Card className="h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.01] border-border/50 bg-card/80 backdrop-blur-sm hover:border-sky-500/30">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 group-hover:from-sky-500/20 group-hover:to-blue-500/20 transition-colors">
                                    <LayoutList className="h-6 w-6 text-sky-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-0.5">View All Quizzes</h3>
                                    <p className="text-sm text-muted-foreground">Manage, edit, and start sessions</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-sky-500 transition-colors" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Recent Quizzes */}
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Recent Quizzes</CardTitle>
                                    <CardDescription>Your latest quizzes</CardDescription>
                                </div>
                            </div>
                            <Link href="/admin/quizzes">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400">
                                    View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {quizzesLoading ? (
                            <div className="flex justify-center py-8">
                                <Spinner size="sm" />
                            </div>
                        ) : recentQuizzes.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground text-sm">No quizzes created yet</p>
                                <Link href="/admin/quiz/new">
                                    <Button variant="link" className="mt-2 text-teal-600 dark:text-teal-400">Create your first quiz</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentQuizzes.map((quiz) => (
                                    <Link key={quiz.id} href={`/admin/quiz/${quiz.id}`}>
                                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-2 rounded-lg bg-muted/80 group-hover:bg-teal-500/10 transition-colors">
                                                    <HelpCircle className="h-4 w-4 text-muted-foreground group-hover:text-teal-500 transition-colors" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">{quiz.title}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{quiz._count.questions} questions</span>
                                                        <span>·</span>
                                                        <span>{format(new Date(quiz.createdAt), "MMM d, yyyy")}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
