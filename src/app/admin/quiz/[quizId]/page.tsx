"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Save, Play, Loader2, Trash2 } from "lucide-react";
import { QuestionEditor, type QuestionData, type OptionData } from "../new/components/QuestionEditor"; // Reuse component
import { BulkUpload } from "../components/BulkUpload";
import { Spinner } from "@/components/ui/spinner";
import { useAlert } from "@/components/providers/alert-provider";

export default function EditQuizPage() {
    const params = useParams();
    const quizId = params.quizId as string;
    const router = useRouter();
    const { alert } = useAlert();

    const { data: quiz, isLoading } = api.admin.getQuiz.useQuery({ id: quizId }, {
        enabled: !!quizId
    });

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<QuestionData[]>([]);

    useEffect(() => {
        if (quiz) {
            setTitle(quiz.title);
            setDescription(quiz.description || "");
            setQuestions(quiz.questions.map(q => ({
                id: q.id,
                text: q.text,
                type: q.type as any,
                codeSnippet: q.codeSnippet || undefined,
                timeLimit: q.timeLimit,
                baseScore: (q as any).baseScore ?? 1000,
                options: q.options.map(o => ({
                    id: o.id,
                    text: o.text,
                    isCorrect: o.isCorrect
                }))
            })));
        }
    }, [quiz]);

    const updateQuiz = api.admin.updateQuiz.useMutation({
        onSuccess: async () => {
            await alert("Quiz updated successfully!", "Success");
        },
        onError: async (err) => {
            await alert(err.message, "Error");
        }
    });

    const startSession = api.admin.createSession.useMutation({
        onSuccess: (session) => {
            router.push(`/admin/session/${session.id}`);
        }
    });

    const deleteQuiz = api.quiz.delete.useMutation({
        onSuccess: () => {
            router.push("/admin/quizzes");
        },
        onError: async (err) => {
            await alert(err.message, "Error");
        }
    });

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                text: "",
                type: "KNOWLEDGE",
                timeLimit: 10,
                baseScore: 1000,
                options: [
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false }
                ]
            }
        ]);
    };

    const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
        const newQuestions = [...questions];
        if (newQuestions[index]) {
            newQuestions[index] = { ...newQuestions[index], [field]: value };
            setQuestions(newQuestions);
        }
    };

    const removeQuestion = (index: number) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex]) {
            newQuestions[qIndex].options.push({ text: "", isCorrect: false });
            setQuestions(newQuestions);
        }
    };

    const updateOption = (qIndex: number, oIndex: number, field: keyof OptionData, value: any) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex] && newQuestions[qIndex].options[oIndex]) {
            newQuestions[qIndex].options[oIndex] = { ...newQuestions[qIndex].options[oIndex], [field]: value };
            setQuestions(newQuestions);
        }
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex] && newQuestions[qIndex].options.length > 2) {
            newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
            setQuestions(newQuestions);
        }
    };

    const handleSave = async () => {
        if (!title) {
            await alert("Title is required", "Validation Error");
            return;
        }
        updateQuiz.mutate({
            id: quizId,
            title,
            description,
            questions: questions.map(q => ({
                ...q,
                timeLimit: parseInt(q.timeLimit?.toString() ?? "10"),
                baseScore: parseInt(q.baseScore?.toString() ?? "1000"),
            }))
        });
    };

    const handleStartSession = () => {
        if (confirm("Start a new game session for this quiz?")) {
            startSession.mutate({ quizId });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
    }

    if (!quiz) {
        return <div className="text-center py-20">Quiz not found</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-4xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gradient">Edit Quiz</h1>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleStartSession} disabled={startSession.isPending}>
                        <Play className="mr-2 h-4 w-4" /> Start Session
                    </Button>
                    <Button onClick={handleSave} disabled={updateQuiz.isPending}>
                        {updateQuiz.isPending ? <Spinner className="mr-2" size="sm" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
                                deleteQuiz.mutate({ id: quizId });
                            }
                        }}
                        disabled={deleteQuiz.isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quiz Details</CardTitle>
                    <CardDescription>Update the basic information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                            placeholder="e.g. JavaScript Basics"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Optional description..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Questions</h2>
                    <BulkUpload onQuestionsImported={(newQuestions) => setQuestions([...questions, ...newQuestions])} />
                </div>

                {questions.map((q, index) => (
                    <QuestionEditor
                        key={index}
                        index={index}
                        question={q}
                        onUpdate={updateQuestion}
                        onRemove={removeQuestion}
                        onOptionUpdate={updateOption}
                        onAddOption={addOption}
                        onRemoveOption={removeOption}
                    />
                ))}

                <Button variant="outline" className="w-full py-8 border-dashed" onClick={addQuestion}>
                    <Plus className="mr-2 h-4 w-4" /> Add Question
                </Button>
            </div>
        </div>
    );
}
