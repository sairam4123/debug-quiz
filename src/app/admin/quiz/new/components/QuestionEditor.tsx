"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Clock, Trophy } from "lucide-react";

import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css"; // Dark theme for editor

export type QuestionType = "KNOWLEDGE" | "PROGRAM_OUTPUT" | "CODE_CORRECTION";

export interface OptionData {
    id?: string;
    text: string;
    isCorrect: boolean;
}

export interface QuestionData {
    id?: string;
    text: string;
    type: QuestionType;
    codeSnippet?: string;
    language?: string;
    timeLimit?: number | string;
    baseScore?: number | string;
    order?: number | string; // Allow string for input handling
    options: OptionData[];
}

interface QuestionEditorProps {
    index: number;
    question: QuestionData;
    onUpdate: (index: number, field: keyof QuestionData, value: any) => void;
    onRemove: (index: number) => void;
    onOptionUpdate: (qIndex: number, oIndex: number, field: keyof OptionData, value: any) => void;
    onAddOption: (qIndex: number) => void;
    onRemoveOption: (qIndex: number, oIndex: number) => void;
}

export function QuestionEditor({
    index,
    question,
    onUpdate: updateQuestion,
    onRemove: removeQuestion,
    onOptionUpdate: updateOption,
    onAddOption: addOption,
    onRemoveOption: removeOption
}: QuestionEditorProps) {
    const correctCount = question.options.filter(o => o.isCorrect).length;

    return (
        <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-semibold">Question {index + 1} <span className="text-muted-foreground font-normal ml-2 text-sm">(Order: {question.order ?? index})</span></CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Question text */}
                <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Input
                        placeholder="Enter question text..."
                        value={question.text}
                        onChange={(e) => updateQuestion(index, "text", e.target.value)}
                    />
                </div>

                {/* Type + Order + Time Limit + Base Score row */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-4">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                            value={question.type}
                            onValueChange={(value) => updateQuestion(index, "type", value)}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                                <SelectItem value="PROGRAM_OUTPUT">Program Output</SelectItem>
                                <SelectItem value="CODE_CORRECTION">Code Correction</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                            Order / Phase
                        </Label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder={`${index}`}
                            value={question.order ?? ""}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                updateQuestion(index, "order", val);
                            }}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            Time Limit (s)
                        </Label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="10"
                            value={question.timeLimit ?? ""}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                updateQuestion(index, "timeLimit", val);
                            }}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                            <Trophy className="h-3 w-3 text-muted-foreground" />
                            Base Score
                        </Label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="1000"
                            value={question.baseScore ?? ""}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                updateQuestion(index, "baseScore", val);
                            }}
                            className="h-10"
                        />
                    </div>
                </div>

                {/* Code snippet (conditional) */}
                {(question.type === "PROGRAM_OUTPUT" || question.type === "CODE_CORRECTION") && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Code Snippet</Label>
                            <Select
                                value={question.language || "python"}
                                onValueChange={(val) => updateQuestion(index, "language", val)}
                            >
                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                    <SelectValue placeholder="Language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="border border-input rounded-md overflow-hidden min-h-[200px] bg-[#1e1e1e] font-mono text-sm relative focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                            <Editor
                                value={question.codeSnippet || ""}
                                onValueChange={(code) => updateQuestion(index, "codeSnippet", code)}
                                highlight={(code) => highlight(code, (question.language === 'javascript' ? languages.javascript : languages.python) || languages.javascript!, question.language || 'python')}
                                padding={16}
                                textareaId={`code-editor-${index}`}
                                className="font-mono"
                                style={{
                                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                                    fontSize: 14,
                                    backgroundColor: "transparent",
                                    minHeight: "200px"
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Options */}
                <div className="space-y-3 pt-3 border-t border-border/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <Label>Options</Label>
                            {correctCount > 1 && (
                                <p className="text-xs text-primary mt-0.5">{correctCount} correct answers selected</p>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => addOption(index)}>
                            <Plus className="mr-1.5 h-3 w-3" /> Add
                        </Button>
                    </div>
                    <div className="grid gap-2">
                        {question.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2.5">
                                <Checkbox
                                    checked={opt.isCorrect}
                                    onCheckedChange={(checked) => updateOption(index, oIndex, "isCorrect", checked)}
                                />
                                <Input
                                    placeholder={`Option ${oIndex + 1}`}
                                    value={opt.text}
                                    onChange={(e) => updateOption(index, oIndex, "text", e.target.value)}
                                    className={opt.isCorrect ? "border-primary ring-primary ring-1" : ""}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOption(index, oIndex)}
                                    disabled={question.options.length <= 2}
                                    className="h-8 w-8 shrink-0"
                                >
                                    <Trash2 className="h-3.5 w-3.5 opacity-50" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
