"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Plus, HelpCircle, ArrowRight, Trash2, Play, Inbox, Calendar } from "lucide-react";
import { useAlert } from "@/components/providers/alert-provider";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export default function QuizzesPage() {
    const router = useRouter();
    const utils = api.useUtils();
    const { alert, confirm } = useAlert();
    const { data: quizzes, isLoading } = api.quiz.getAll.useQuery();

    const deleteQuiz = api.quiz.delete.useMutation({
        onSuccess: () => {
            utils.quiz.getAll.invalidate();
        },
        onError: async (err) => {
            await alert("Failed to delete quiz: " + err.message, "Error");
        }
    });

    const startQuiz = api.session.create.useMutation({
        onSuccess: (session) => {
            utils.quiz.getAll.invalidate();
            router.push(`/admin/session/${session.id}`);
        },
        onError: async (err) => {
            await alert("Failed to start quiz: " + err.message, "Error");
        }
    });

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
                        <h1 className="text-2xl font-bold tracking-tight">Your Quizzes</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Manage and monitor your created quizzes</p>
                    </div>
                    <Link href="/admin/quiz/new">
                        <Button className="bg-primary hover:bg-primary/90 text-white font-semibold border-0">
                            <Plus className="mr-2 h-4 w-4" /> Create New Quiz
                        </Button>
                    </Link>
                </div>

                {/* ── Quiz grid ── */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Spinner size="lg" />
                    </div>
                ) : quizzes?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="p-4 rounded-2xl bg-muted/60 border border-border/50 mb-5">
                            <Inbox className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1.5">No quizzes yet</h3>
                        <p className="text-muted-foreground text-sm text-center max-w-sm mb-5">
                            Get started by creating your first debugging quiz.
                        </p>
                        <Link href="/admin/quiz/new">
                            <Button className="bg-primary hover:bg-primary/90 text-white border-0">
                                Create Quiz <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {quizzes?.map((quiz) => (   
                            <Card key={quiz.id} className="group border-border/50 bg-card hover:shadow-md hover:border-primary/25 transition-all duration-150 overflow-hidden flex flex-col">
                                <CardContent className="p-5 flex flex-col gap-4 flex-1">
                                    {/* Title + description */}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-sm leading-snug line-clamp-1 mb-1">{quiz.title}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                                            {quiz.description || "No description provided."}
                                        </p>
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <HelpCircle className="h-3 w-3 text-primary" />
                                            {quiz._count.questions} questions
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-amber-500" />
                                            {format(new Date(quiz.createdAt), "MMM d, yyyy")}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1 border-t border-border/40">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs h-8 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                                            onClick={() => startQuiz.mutate({ quizId: quiz.id })}
                                            disabled={startQuiz.isPending}
                                        >
                                            <Play className="h-3.5 w-3.5 mr-1.5" /> Start
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs h-8 hover:bg-primary/10 hover:text-primary"
                                            asChild
                                        >
                                            <Link href={`/admin/quiz/${quiz.id}`} className="flex flex-row items-center justify-center">
                                                <ArrowRight className="h-3.5 w-3.5 mr-1.5" /> Edit
                                            </Link>
                                        </Button>

                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
