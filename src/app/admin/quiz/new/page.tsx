"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Save, ArrowRight, ArrowLeft, Check, FileText, HelpCircle, Eye, Clock, Trophy } from "lucide-react";
import { QuestionEditor, type QuestionData, type OptionData } from "./components/QuestionEditor";
import { BulkUpload } from "../components/BulkUpload";
import { useAlert } from "@/components/providers/alert-provider";

const STEPS = [
    { label: "Details", icon: FileText },
    { label: "Questions", icon: HelpCircle },
    { label: "Review", icon: Eye },
];

export default function NewQuizPage() {
    const router = useRouter();
    const { alert } = useAlert();
    const [step, setStep] = useState(0);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [questions, setQuestions] = useState<QuestionData[]>([
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

    const createQuiz = api.quiz.create.useMutation({
        onSuccess: () => {
            router.push("/admin/quizzes");
        },
        onError: async (err) => {
            await alert(err.message, "Error");
        }
    });

    // --- Question CRUD ---
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

    // --- Validation ---
    const canProceedFromStep0 = title.trim().length > 0;
    const canProceedFromStep1 = questions.every(q =>
        q.text.trim().length > 0 &&
        q.options.length >= 2 &&
        q.options.some(o => o.isCorrect) &&
        q.options.every(o => o.text.trim().length > 0)
    );

    const handleSubmit = () => {
        createQuiz.mutate({
            title,
            description,
            questions: questions.map(q => ({
                ...q,
                timeLimit: parseInt(q.timeLimit?.toString() ?? "10"),
                baseScore: parseInt(q.baseScore?.toString() ?? "1000"),
            }))
        });
    };

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create New Quiz</h1>
                <p className="text-muted-foreground mt-1">Follow the steps to build your quiz</p>
            </div>

            {/* Step Progress */}
            <div className="flex items-center gap-2">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = i === step;
                    const isDone = i < step;
                    return (
                        <div key={i} className="flex items-center gap-2 flex-1">
                            <button
                                onClick={() => {
                                    if (i < step) setStep(i);
                                }}
                                disabled={i > step}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full justify-center ${isActive
                                    ? "bg-primary text-primary-foreground"
                                    : isDone
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div className={`h-px flex-shrink-0 w-4 ${i < step ? "bg-primary" : "bg-border"}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            {step === 0 && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle>Quiz Details</CardTitle>
                        <CardDescription>Give your quiz a name and optional description.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="e.g. JavaScript Debugging Basics"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-11 text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Optional description for your quiz..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <BulkUpload onQuestionsImported={(newQuestions) => setQuestions([...questions, ...newQuestions])} />

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
                    <Button variant="outline" className="w-full py-8 border-dashed border-border/60" onClick={addQuestion}>
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle>Review</CardTitle>
                            <CardDescription>Check everything before saving.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Quiz info */}
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Title</p>
                                <p className="font-semibold text-lg">{title}</p>
                                {description && <p className="text-muted-foreground text-sm">{description}</p>}
                            </div>

                            {/* Questions summary */}
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                    {questions.length} Question{questions.length !== 1 ? "s" : ""}
                                </p>
                                {questions.map((q, i) => {
                                    const correctCount = q.options.filter(o => o.isCorrect).length;
                                    return (
                                        <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">
                                                        <span className="text-primary font-bold mr-1.5">Q{i + 1}.</span>
                                                        {q.text || <span className="text-muted-foreground italic">No text</span>}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimit ?? 10}s</span>
                                                        <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{q.baseScore ?? 1000} pts</span>
                                                        <span>{q.options.length} options</span>
                                                        <span>{correctCount} correct</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full shrink-0">
                                                    {q.type.replace("_", " ").toLowerCase()}
                                                </span>
                                            </div>
                                            {q.codeSnippet && (
                                                <pre className="text-xs font-mono bg-background p-2 rounded-lg overflow-x-auto border border-border/50">
                                                    {q.codeSnippet.slice(0, 100)}{q.codeSnippet.length > 100 ? "..." : ""}
                                                </pre>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-2">
                <Button
                    variant="outline"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>

                {step < 2 ? (
                    <Button
                        onClick={() => setStep(step + 1)}
                        disabled={step === 0 ? !canProceedFromStep0 : !canProceedFromStep1}
                        className="gap-2"
                    >
                        Next <ArrowRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={createQuiz.isPending || !canProceedFromStep1}
                        className="gap-2 font-semibold"
                    >
                        <Save className="h-4 w-4" />
                        {createQuiz.isPending ? "Saving..." : "Save Quiz"}
                    </Button>
                )}
            </div>
        </div>
    );
}
