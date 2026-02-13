"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Plus, LayoutList, Calendar, HelpCircle, ArrowRight, Trash2, Play, Inbox } from "lucide-react";
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
        <div className="min-h-screen">
            {/* Decorative background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />
                <div className="absolute top-1/2 -left-20 w-72 h-72 rounded-full bg-teal-500/5 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
            </div>

            <div className="container mx-auto p-6 md:p-8 space-y-8 max-w-6xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/20">
                            <LayoutList className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-600 to-cyan-600 dark:from-sky-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                Your Quizzes
                            </h1>
                            <p className="text-muted-foreground mt-0.5">Manage and monitor your created quizzes.</p>
                        </div>
                    </div>
                    <Link href="/admin/quiz/new">
                        <Button className="font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/15 border-0">
                            <Plus className="mr-2 h-4 w-4" /> Create New Quiz
                        </Button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Spinner size="lg" />
                    </div>
                ) : quizzes?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-muted to-muted/50 border border-border/50 mb-6">
                            <Inbox className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No quizzes created yet</h3>
                        <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                            Get started by creating your first debugging quiz.
                        </p>
                        <Link href="/admin/quiz/new">
                            <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 border-0">
                                Create Quiz
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {quizzes?.map((quiz) => (
                            <Card key={quiz.id} className="group border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:scale-[1.01] hover:border-teal-500/30 transition-all duration-200 overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                                        {quiz.description || "No description provided."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                        <div className="p-1 rounded-md bg-sky-500/10 mr-2">
                                            <HelpCircle className="h-3.5 w-3.5 text-sky-500" />
                                        </div>
                                        <span>{quiz._count.questions} Questions</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="p-1 rounded-md bg-amber-500/10 mr-2">
                                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                        </div>
                                        <span>Created {format(new Date(quiz.createdAt), "MMM d, yyyy")}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            startQuiz.mutate({ quizId: quiz.id });
                                        }}
                                        className="flex-1 group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
                                        disabled={startQuiz.isPending}
                                    >
                                        <p className="hidden lg:block">
                                            Start Quiz
                                        </p>
                                        <Play className="lg:ml-2 h-4 w-4" />
                                    </Button>
                                    <Button variant="secondary" className="flex-1 group-hover:bg-sky-500/10 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" asChild>
                                        <Link href={`/admin/quiz/${quiz.id}`} className="flex-row flex items-center">
                                            <p className="hidden lg:block">
                                                View Details
                                            </p>
                                            <ArrowRight className="lg:ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>


                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border-0"
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            if (await confirm("Are you sure you want to delete this quiz?")) {
                                                deleteQuiz.mutate({ id: quiz.id });
                                            }
                                        }}
                                        disabled={deleteQuiz.isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
