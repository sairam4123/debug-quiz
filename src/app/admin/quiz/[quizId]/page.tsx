"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Save, Play, Loader2, Trash2, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { QuestionEditor, type QuestionData, type OptionData } from "../new/components/QuestionEditor"; // Reuse component
import { SectionContainer } from "../components/SectionContainer";
import { BulkUpload } from "../components/BulkUpload";
import { Spinner } from "@/components/ui/spinner";
import { useAlert } from "@/components/providers/alert-provider";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function EditQuizPage() {
    const params = useParams();
    const quizId = params.quizId as string;
    const router = useRouter();
    const { alert, confirm } = useAlert();

    const { data: quiz, isLoading } = api.quiz.getById.useQuery({ id: quizId }, {
        enabled: !!quizId
    });

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [showIntermediateStats, setShowIntermediateStats] = useState(true);
    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [randomizeOptions, setRandomizeOptions] = useState(true);
    const [questions, setQuestions] = useState<QuestionData[]>([]);

    useEffect(() => {
        if (quiz) {
            setTitle(quiz.title);
            setDescription(quiz.description || "");
            setShowIntermediateStats(quiz.showIntermediateStats ?? true);
            setShuffleQuestions(quiz.shuffleQuestions ?? false);
            setRandomizeOptions((quiz as any).randomizeOptions ?? true);
            setQuestions(quiz.questions.map(q => ({
                id: q.id,
                text: q.text,
                type: q.type as any,
                section: (q as any).section || undefined,
                codeSnippet: q.codeSnippet || undefined,
                timeLimit: q.timeLimit,
                baseScore: (q as any).baseScore ?? 1000,
                order: q.order,
                options: q.options.map(o => ({
                    id: o.id,
                    text: o.text,
                    isCorrect: o.isCorrect
                }))
            })));
        }
    }, [quiz]);

    const updateQuiz = api.quiz.update.useMutation({
        onSuccess: async () => {
            await alert("Quiz updated successfully!", "Success");
        },
        onError: async (err) => {
            await alert(err.message, "Error");
        }
    });

    const startSession = api.session.create.useMutation({
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

    // --- DnD sensors ---
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const defaultSectionName = title.trim() || "Default Section";
    const sectionsMap = new Map<string, QuestionData[]>();
    questions.forEach(q => {
        const sName = q.section || defaultSectionName;
        if (!sectionsMap.has(sName)) sectionsMap.set(sName, []);
        sectionsMap.get(sName)!.push(q);
    });
    const sectionEntries = Array.from(sectionsMap.entries());

    function handleDragOver(event: any) {
        const { active, over } = event;
        if (!over) return;
        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const activeQuestion = questions.find(q => q.id === activeId);
        if (!activeQuestion) return;

        const overQuestion = questions.find(q => q.id === overId);

        const activeSection = activeQuestion.section || defaultSectionName;
        const overSection = overQuestion ? (overQuestion.section || defaultSectionName) : String(overId);

        if (activeSection !== overSection) {
            setQuestions((prev) => {
                const activeIndex = prev.findIndex((q) => q.id === activeId);
                const overIndex = overQuestion ? prev.findIndex((q) => q.id === overId) : prev.length;

                if (activeIndex === -1) return prev;

                const newQuestions = [...prev];
                const moved = newQuestions.splice(activeIndex, 1)[0];
                if (!moved) return prev;

                moved.section = overSection === defaultSectionName ? "" : overSection; // Update section to match target

                if (!overQuestion) {
                    const containerItems = prev.filter(q => (q.section || defaultSectionName) === overSection);
                    let lastIndex = prev.length;
                    if (containerItems.length > 0) {
                        const lastItem = containerItems[containerItems.length - 1];
                        if (lastItem) {
                            lastIndex = prev.findIndex(q => q.id === lastItem.id) + 1;
                        }
                    }
                    newQuestions.splice(lastIndex, 0, moved);
                } else {
                    const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                    const modifier = isBelowOverItem ? 1 : 0;
                    newQuestions.splice(overIndex + modifier, 0, moved);
                }
                return newQuestions;
            });
        }
    }

    function handleDragEnd(event: any) {
        const { active, over } = event;
        if (!over) return;

        if (active.id !== over.id) {
            // Check if dragging a Section
            const isSection = active.data.current?.type === "Section";

            if (isSection) {
                const oldIndex = sectionEntries.findIndex(([name]) => name === active.id);
                const newIndex = sectionEntries.findIndex(([name]) => name === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newSectionEntries = arrayMove(sectionEntries, oldIndex, newIndex);

                    // Rebuild questions array completely based on new section order
                    let newQuestions: QuestionData[] = [];
                    newSectionEntries.forEach(([_, sQuestions]) => {
                        newQuestions = [...newQuestions, ...sQuestions];
                    });

                    setQuestions(newQuestions);
                }
                return;
            }

            // Otherwise dragging a Question
            const overQuestion = questions.find(q => q.id === over.id);
            if (overQuestion) {
                setQuestions((items) => {
                    const oldIndex = items.findIndex(item => item.id === active.id);
                    const newIndex = items.findIndex(item => item.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
        }
    }

    function handleRenameSection(oldName: string, newName: string) {
        setQuestions(prev => prev.map(q => {
            const sName = q.section || defaultSectionName;
            if (sName === oldName) {
                const updatedSection = newName === defaultSectionName ? "" : newName;
                return { ...q, section: updatedSection };
            }
            return q;
        }));
    }

    const addSection = () => {
        const newSectionName = `Section ${sectionEntries.length + 1}`;
        setQuestions([
            ...questions,
            {
                id: Math.random().toString(36).substr(2, 9),
                text: "",
                type: "KNOWLEDGE",
                section: newSectionName,
                timeLimit: 10,
                baseScore: 1000,
                options: [
                    { text: "", isCorrect: false },
                    { text: "", isCorrect: false }
                ]
            }
        ]);
    };

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: Math.random().toString(36).substr(2, 9),
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

    const moveQuestionUp = (index: number) => {
        if (index === 0) return;
        setQuestions((items) => arrayMove(items, index, index - 1));
    };

    const moveQuestionDown = (index: number) => {
        if (index === questions.length - 1) return;
        setQuestions((items) => arrayMove(items, index, index + 1));
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
            showIntermediateStats,
            shuffleQuestions,
            randomizeOptions,
            questions: questions.map(q => ({
                id: q.id,
                text: q.text,
                type: q.type,
                section: q.section || undefined,
                codeSnippet: q.codeSnippet || undefined,
                language: q.language || undefined,
                timeLimit: parseInt(q.timeLimit?.toString() ?? "10"),
                baseScore: parseInt(q.baseScore?.toString() ?? "1000"),
                order: q.order ? parseInt(q.order.toString()) : undefined,
                options: q.options
            }))
        });
    };

    const handleStartSession = async () => {
        if (await confirm("Start a new game session for this quiz?")) {
            startSession.mutate({ quizId });
        }
    };

    const existingSections = Array.from(new Set(questions.map(q => q.section).filter(Boolean))) as string[];

    if (isLoading) {
        return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
    }

    if (!quiz) {
        return <div className="text-center py-20">Quiz not found</div>;
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* ── Page header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Edit Quiz</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">{quiz.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleStartSession} disabled={startSession.isPending}>
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Start Session
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white border-0" onClick={handleSave} disabled={updateQuiz.isPending}>
                        {updateQuiz.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                        Save
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                        onClick={async () => {
                            if (await confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
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

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="show-stats"
                            checked={showIntermediateStats}
                            onCheckedChange={setShowIntermediateStats}
                        />
                        <Label htmlFor="show-stats">Show Intermediate Stats & Leaderboard</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="shuffle-questions"
                            checked={shuffleQuestions}
                            onCheckedChange={setShuffleQuestions}
                        />
                        <Label htmlFor="shuffle-questions">Shuffle Questions (Randomize per player)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="randomize-options"
                            checked={randomizeOptions}
                            onCheckedChange={setRandomizeOptions}
                        />
                        <Label htmlFor="randomize-options">Randomize Question Options</Label>
                    </div>
                </CardContent >
            </Card >

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Questions</h2>
                    <BulkUpload onQuestionsImported={(newQuestions) => {
                        const qs = newQuestions.map(q => ({ ...q, id: Math.random().toString(36).substr(2, 9) }));
                        setQuestions([...questions, ...qs]);
                    }} />
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={sectionEntries.map(s => s[0])} strategy={verticalListSortingStrategy}>
                        {sectionEntries.map(([sName, sQuestions]) => (
                            <SectionContainer
                                key={sName}
                                id={sName}
                                items={sQuestions.map(q => q.id as string)}
                                onRename={handleRenameSection}
                                isDefaultFallback={sName === defaultSectionName}
                            >
                                {sQuestions.map((q) => {
                                    const index = questions.findIndex(globalQ => globalQ.id === q.id);
                                    return (
                                        <QuestionEditor
                                            key={q.id}
                                            index={index}
                                            question={q}
                                            onUpdate={updateQuestion}
                                            onRemove={removeQuestion}
                                            onOptionUpdate={updateOption}
                                            onAddOption={addOption}
                                            onRemoveOption={removeOption}
                                            onMoveUp={moveQuestionUp}
                                            onMoveDown={moveQuestionDown}
                                            isFirst={index === 0}
                                            isLast={index === questions.length - 1}
                                            existingSections={existingSections}
                                        />
                                    );
                                })}
                            </SectionContainer>
                        ))}
                    </SortableContext>
                </DndContext>

                <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 py-8 border-dashed border-border/60" onClick={addQuestion}>
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                    <Button variant="outline" className="flex-1 py-8 border-dashed border-border/60 bg-primary/5 hover:bg-primary/10" onClick={addSection}>
                        <Layers className="mr-2 h-4 w-4" /> Add Section
                    </Button>
                </div>
            </div>
        </div >
    );
}
