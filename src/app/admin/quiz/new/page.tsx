"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Save } from "lucide-react";
import { QuestionEditor, type QuestionData, type OptionData } from "./components/QuestionEditor";

export default function NewQuizPage() {
    const router = useRouter();
    const utils = api.useUtils();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<QuestionData[]>([
        {
            text: "",
            type: "KNOWLEDGE",
            options: [
                { text: "", isCorrect: false },
                { text: "", isCorrect: false }
            ]
        }
    ]);

    const createQuiz = api.quiz.create.useMutation({
        onSuccess: () => {
            alert("Quiz created!");
            router.push("/admin/dashboard");
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                text: "",
                type: "KNOWLEDGE",
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

    const handleSubmit = () => {
        if (!title) return alert("Title is required");
        createQuiz.mutate({
            title,
            description,
            questions
        });
    };

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-4xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Create New Quiz</h1>
                <Button onClick={handleSubmit} disabled={createQuiz.isPending}>
                    <Save className="mr-2 h-4 w-4" /> Save Quiz
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quiz Details</CardTitle>
                    <CardDescription>Basic information about your quiz.</CardDescription>
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
