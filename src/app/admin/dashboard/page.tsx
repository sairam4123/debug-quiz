"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api } from "@mce-quiz/trpc/react";
import { Users, Play, Plus, LayoutList, ArrowRight, HelpCircle, Calendar } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export default function AdminDashboard() {
    const { data: stats, isLoading } = api.admin.getDashboardStats.useQuery();
    const { data: quizzes, isLoading: quizzesLoading } = api.admin.getQuizzes.useQuery();

    const recentQuizzes = quizzes?.slice(0, 5) ?? [];

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
            {/* Welcome header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your quiz platform</p>
                </div>
                <Link href="/admin/quiz/new">
                    <Button className="font-semibold">
                        <Plus className="mr-2 h-4 w-4" /> Create Quiz
                    </Button>
                </Link>
            </div>

            {/* Stats row */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                {[
                    { label: "Total Quizzes", value: stats?.totalQuizzes ?? 0, icon: LayoutList, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Active Sessions", value: stats?.activeSessions ?? 0, icon: Play, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Total Players", value: stats?.totalPlayers ?? 0, icon: Users, color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label}>
                        <CardContent className="p-5">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${bg}`}>
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
                    <Card className="h-full transition-colors hover:border-primary/30">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold mb-0.5">Create New Quiz</h3>
                                <p className="text-sm text-muted-foreground">Build a new quiz with questions and options</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/quizzes" className="group">
                    <Card className="h-full transition-colors hover:border-primary/30">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                                <LayoutList className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold mb-0.5">View All Quizzes</h3>
                                <p className="text-sm text-muted-foreground">Manage, edit, and start sessions</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Recent Quizzes */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Recent Quizzes</CardTitle>
                            <CardDescription>Your latest quizzes</CardDescription>
                        </div>
                        <Link href="/admin/quizzes">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
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
                                <Button variant="link" className="mt-2 text-primary">Create your first quiz</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentQuizzes.map((quiz) => (
                                <Link key={quiz.id} href={`/admin/quiz/${quiz.id}`}>
                                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                                                <HelpCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
    );
}
