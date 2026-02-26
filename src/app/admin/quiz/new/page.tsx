"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Plus,
  Save,
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  HelpCircle,
  Eye,
  Clock,
  Trophy,
  Layers,
} from "lucide-react";
import {
  QuestionEditor,
  type QuestionData,
  type OptionData,
} from "./components/QuestionEditor";
import { SectionContainer } from "../components/SectionContainer";
import { BulkUpload } from "../components/BulkUpload";
import { useAlert } from "@/components/providers/alert-provider";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  const [showIntermediateStats, setShowIntermediateStats] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [antiTabSwitchEnabled, setAntiTabSwitchEnabled] = useState(false);
  const [questions, setQuestions] = useState<QuestionData[]>([
    {
      id: Math.random().toString(36).substr(2, 9),
      text: "",
      type: "KNOWLEDGE",
      timeLimit: 10,
      baseScore: 1000,
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
    },
  ]);

  const createQuiz = api.quiz.create.useMutation({
    onSuccess: () => {
      router.push("/admin/quizzes");
    },
    onError: async (err) => {
      await alert(err.message, "Error");
    },
  });

  // --- DnD sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const defaultSectionName = title.trim() || "Default Section";
  const sectionsMap = new Map<string, QuestionData[]>();
  questions.forEach((q) => {
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

    const activeQuestion = questions.find((q) => q.id === activeId);
    if (!activeQuestion) return;

    const overQuestion = questions.find((q) => q.id === overId);

    const activeSection = activeQuestion.section || defaultSectionName;
    const overSection = overQuestion
      ? overQuestion.section || defaultSectionName
      : String(overId);

    if (activeSection !== overSection) {
      setQuestions((prev) => {
        const activeIndex = prev.findIndex((q) => q.id === activeId);
        const overIndex = overQuestion
          ? prev.findIndex((q) => q.id === overId)
          : prev.length;

        if (activeIndex === -1) return prev;

        const newQuestions = [...prev];
        const moved = newQuestions.splice(activeIndex, 1)[0];
        if (!moved) return prev;

        moved.section = overSection === defaultSectionName ? "" : overSection; // Update section to match target

        if (!overQuestion) {
          const containerItems = prev.filter(
            (q) => (q.section || defaultSectionName) === overSection,
          );
          let lastIndex = prev.length;
          if (containerItems.length > 0) {
            const lastItem = containerItems[containerItems.length - 1];
            if (lastItem) {
              lastIndex = prev.findIndex((q) => q.id === lastItem.id) + 1;
            }
          }
          newQuestions.splice(lastIndex, 0, moved);
        } else {
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height;
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
        const oldIndex = sectionEntries.findIndex(
          ([name]) => name === active.id,
        );
        const newIndex = sectionEntries.findIndex(([name]) => name === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newSectionEntries = arrayMove(
            sectionEntries,
            oldIndex,
            newIndex,
          );

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
      const overQuestion = questions.find((q) => q.id === over.id);
      if (overQuestion) {
        setQuestions((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  }

  function handleRenameSection(oldName: string, newName: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        const sName = q.section || defaultSectionName;
        if (sName === oldName) {
          // Determine what the new section value should be
          const updatedSection = newName === defaultSectionName ? "" : newName;
          return { ...q, section: updatedSection };
        }
        return q;
      }),
    );
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
          { text: "", isCorrect: false },
        ],
      },
    ]);
  };

  const adjustSectionTime = (sectionName: string, delta: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        const currentSectionName = q.section || defaultSectionName;
        if (currentSectionName !== sectionName) return q;

        const current = parseInt(q.timeLimit?.toString() ?? "0", 10) || 0;
        const nextValue = Math.max(5, current + delta);
        return { ...q, timeLimit: nextValue };
      }),
    );
  };

  const getSectionTimeSummary = (sectionQuestions: QuestionData[]) => {
    const limits = sectionQuestions
      .map((q) => parseInt(q.timeLimit?.toString() ?? "0", 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (limits.length === 0) return "Time";
    const allSame = limits.every((l) => l === limits[0]);
    if (allSame) return `${limits[0]}s`;
    const avg = Math.round(limits.reduce((a, b) => a + b, 0) / limits.length);
    return `~${avg}s`;
  };

  // --- Question CRUD ---
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
          { text: "", isCorrect: false },
        ],
      },
    ]);
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionData,
    value: any,
  ) => {
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

  const updateOption = (
    qIndex: number,
    oIndex: number,
    field: keyof OptionData,
    value: any,
  ) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex] && newQuestions[qIndex].options[oIndex]) {
      newQuestions[qIndex].options[oIndex] = {
        ...newQuestions[qIndex].options[oIndex],
        [field]: value,
      };
      setQuestions(newQuestions);
    }
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex] && newQuestions[qIndex].options.length > 2) {
      newQuestions[qIndex].options = newQuestions[qIndex].options.filter(
        (_, i) => i !== oIndex,
      );
      setQuestions(newQuestions);
    }
  };

  // --- Validation ---
  const canProceedFromStep0 = title.trim().length > 0;
  const canProceedFromStep1 = questions.every(
    (q) =>
      q.text.trim().length > 0 &&
      q.options.length >= 2 &&
      q.options.some((o) => o.isCorrect) &&
      q.options.every((o) => o.text.trim().length > 0),
  );

  const existingSections = Array.from(
    new Set(questions.map((q) => q.section).filter(Boolean)),
  ) as string[];

  const handleSubmit = () => {
    createQuiz.mutate({
      title,
      description,
      showIntermediateStats,
      shuffleQuestions,
      randomizeOptions,
      antiTabSwitchEnabled,
      questions: questions.map((q) => ({
        text: q.text,
        type: q.type,
        section: q.section || undefined,
        codeSnippet: q.codeSnippet || undefined,
        language: q.language || undefined,
        timeLimit: parseInt(q.timeLimit?.toString() ?? "10"),
        baseScore: parseInt(q.baseScore?.toString() ?? "1000"),
        order: q.order ? parseInt(q.order.toString()) : undefined,
        options: q.options,
      })),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Quiz</h1>
        <p className="text-muted-foreground mt-1">
          Follow the steps to build your quiz
        </p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                disabled={i > step}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-4 flex-shrink-0 ${i < step ? "bg-primary" : "bg-border"}`}
                />
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
            <CardDescription>
              Give your quiz a name and optional description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
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
            <div className="flex items-center space-x-2">
              <Switch
                id="show-stats"
                checked={showIntermediateStats}
                onCheckedChange={setShowIntermediateStats}
              />
              <Label htmlFor="show-stats">
                Show Intermediate Stats & Leaderboard
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="shuffle-questions"
                checked={shuffleQuestions}
                onCheckedChange={setShuffleQuestions}
              />
              <Label htmlFor="shuffle-questions">
                Shuffle Questions (Randomize per player)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="randomize-options"
                checked={randomizeOptions}
                onCheckedChange={setRandomizeOptions}
              />
              <Label htmlFor="randomize-options">
                Randomize Question Options
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="anti-tab-switch"
                checked={antiTabSwitchEnabled}
                onCheckedChange={setAntiTabSwitchEnabled}
              />
              <Label htmlFor="anti-tab-switch">
                Enable anti-tab switch logging
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <BulkUpload
            questions={questions}
            onQuestionsImported={(newQuestions) => {
              const qs = newQuestions.map((q) => ({
                ...q,
                id: Math.random().toString(36).substr(2, 9),
              }));
              setQuestions([...questions, ...qs]);
            }}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sectionEntries.map((s) => s[0])}
              strategy={verticalListSortingStrategy}
            >
              {sectionEntries.map(([sName, sQuestions], sIndex) => (
                <SectionContainer
                  key={sName}
                  id={sName}
                  items={sQuestions.map((q) => q.id as string)}
                  onRename={handleRenameSection}
                  isDefaultFallback={sName === defaultSectionName}
                  onTimeAdjust={adjustSectionTime}
                  timeSummary={getSectionTimeSummary(sQuestions)}
                >
                  {sQuestions.map((q, indexInGroup) => {
                    const index = questions.findIndex(
                      (globalQ) => globalQ.id === q.id,
                    );
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
            <Button
              variant="outline"
              className="border-border/60 flex-1 border-dashed py-8"
              onClick={addQuestion}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
            <Button
              variant="outline"
              className="border-border/60 bg-primary/5 hover:bg-primary/10 flex-1 border-dashed py-8"
              onClick={addSection}
            >
              <Layers className="mr-2 h-4 w-4" /> Add Section
            </Button>
          </div>
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
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Title
                </p>
                <p className="text-lg font-semibold">{title}</p>
                {description && (
                  <p className="text-muted-foreground text-sm">{description}</p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  Intermediate Stats:{" "}
                  <span className="text-foreground font-medium">
                    {showIntermediateStats ? "Enabled" : "Disabled"}
                  </span>
                  <span className="ml-2">
                    • Anti-tab switch:{" "}
                    <span className="text-foreground font-medium">
                      {antiTabSwitchEnabled ? "On" : "Off"}
                    </span>
                  </span>
                </p>
              </div>

              {/* Questions summary */}
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {questions.length} Question{questions.length !== 1 ? "s" : ""}
                </p>
                {questions.map((q, i) => {
                  const correctCount = q.options.filter(
                    (o) => o.isCorrect,
                  ).length;
                  return (
                    <div
                      key={i}
                      className="bg-muted/50 border-border/50 space-y-2 rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            <span className="text-primary mr-1.5 font-bold">
                              Q{i + 1}.
                            </span>
                            {q.text || (
                              <span className="text-muted-foreground italic">
                                No text
                              </span>
                            )}
                            {q.section && (
                              <span className="bg-primary/20 text-primary ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                                {q.section}
                              </span>
                            )}
                          </p>
                          <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {q.timeLimit ?? 10}s
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {q.baseScore ?? 1000} pts
                            </span>
                            <span>{q.options.length} options</span>
                            <span>{correctCount} correct</span>
                          </div>
                        </div>
                        <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2 py-0.5 text-xs">
                          {q.type.replace("_", " ").toLowerCase()}
                        </span>
                      </div>
                      {q.codeSnippet && (
                        <pre className="bg-background border-border/50 overflow-x-auto rounded-lg border p-2 font-mono text-xs">
                          {q.codeSnippet.slice(0, 100)}
                          {q.codeSnippet.length > 100 ? "..." : ""}
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
      <div className="flex items-center justify-between pt-2">
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
