"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, GripVertical } from "lucide-react";

export type QuestionType = "KNOWLEDGE" | "PROGRAM_OUTPUT" | "CODE_CORRECTION";

export interface OptionData {
    text: string;
    isCorrect: boolean;
}

export interface QuestionData {
    text: string;
    type: QuestionType;
    codeSnippet?: string;
    timeLimit?: number;
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
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">Question {index + 1}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Input
                            placeholder="Enter question text..."
                            value={question.text}
                            onChange={(e) => updateQuestion(index, "text", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                            value={question.type}
                            onValueChange={(value) => updateQuestion(index, "type", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                                <SelectItem value="PROGRAM_OUTPUT">Program Output</SelectItem>
                                <SelectItem value="CODE_CORRECTION">Code Correction</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {(question.type === "PROGRAM_OUTPUT" || question.type === "CODE_CORRECTION") && (
                    <div className="space-y-2">
                        <Label>Code Snippet</Label>
                        <Textarea
                            placeholder="// Write code here..."
                            className="font-mono text-sm min-h-[100px]"
                            value={question.codeSnippet || ""}
                            onChange={(e) => updateQuestion(index, "codeSnippet", e.target.value)}
                        />
                    </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <Label>Options</Label>
                        <Button variant="outline" size="sm" onClick={() => addOption(index)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Option
                        </Button>
                    </div>
                    <div className="grid gap-3">
                        {question.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-3">
                                <Checkbox
                                    checked={opt.isCorrect}
                                    onCheckedChange={(checked) => updateOption(index, oIndex, "isCorrect", checked)}
                                />
                                <Input
                                    placeholder={`Option ${oIndex + 1}`}
                                    value={opt.text}
                                    onChange={(e) => updateOption(index, oIndex, "text", e.target.value)}
                                    className={opt.isCorrect ? "border-green-500 ring-green-500 ring-1" : ""}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOption(index, oIndex)}
                                    disabled={question.options.length <= 2}
                                >
                                    <Trash2 className="h-4 w-4 opacity-50" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
