"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Plus, LayoutList, Calendar, HelpCircle, ArrowRight, Trash2, Play } from "lucide-react";
import { useAlert } from "@/components/providers/alert-provider";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export default function QuizzesPage() {
    const router = useRouter();
    const utils = api.useUtils();
    const { alert } = useAlert();
    const { data: quizzes, isLoading } = api.admin.getQuizzes.useQuery();

    const deleteQuiz = api.quiz.delete.useMutation({
        onSuccess: () => {
            utils.admin.getQuizzes.invalidate();
        },
        onError: async (err) => {
            await alert("Failed to delete quiz: " + err.message, "Error");
        }
    });

    const startQuiz = api.admin.createSession.useMutation({
        onSuccess: (session) => {
            utils.admin.getQuizzes.invalidate();
            router.push(`/admin/session/${session.id}`);
        },
        onError: async (err) => {
            await alert("Failed to start quiz: " + err.message, "Error");
        }
    });

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gradient">Your Quizzes</h1>
                    <p className="text-muted-foreground mt-2">Manage and monitor your created quizzes.</p>
                </div>
                <Link href="/admin/quiz/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create New Quiz
                    </Button>
                </Link>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Spinner size="lg" />
                </div>
            ) : quizzes?.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="p-4 rounded-full bg-muted/50">
                            <LayoutList className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-semibold">No quizzes created yet</h3>
                            <p className="text-muted-foreground">
                                Get started by creating your first debugging quiz.
                            </p>
                        </div>
                        <Link href="/admin/quiz/new">
                            <Button variant="outline">Create Quiz</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes?.map((quiz) => (
                        <Card key={quiz.id} className="group hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                                    {quiz.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <HelpCircle className="mr-2 h-4 w-4" />
                                    <span>{quiz._count.questions} Questions</span>
                                </div>
                                <div className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>Created {format(new Date(quiz.createdAt), "MMM d, yyyy")}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                <Button variant="secondary" onClick={() => {
                                    startQuiz.mutate({ quizId: quiz.id });
                                }} className="flex-1 group-hover:bg-primary/10 transition-colors" disabled={startQuiz.isPending}>
                                    <p className="hidden lg:block">
                                        Start Quiz
                                    </p>
                                    <Play className="lg:ml-2 h-4 w-4" />
                                </Button>
                                <Button variant="secondary" className="flex-1 group-hover:bg-primary/10 transition-colors" asChild>
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
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (confirm("Are you sure you want to delete this quiz?")) {
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
    );
}
