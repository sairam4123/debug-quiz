"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Clock,
  Trophy,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  section?: string;
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
  onOptionUpdate: (
    qIndex: number,
    oIndex: number,
    field: keyof OptionData,
    value: any,
  ) => void;
  onAddOption: (qIndex: number) => void;
  onRemoveOption: (qIndex: number, oIndex: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  isFirst?: boolean;
  isLast?: boolean;
  existingSections?: string[];
}

export function QuestionEditor({
  index,
  question,
  onUpdate: updateQuestion,
  onRemove: removeQuestion,
  onOptionUpdate: updateOption,
  onAddOption: addOption,
  onRemoveOption: removeOption,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  existingSections = [],
}: QuestionEditorProps) {
  const correctCount = question.options.filter((o) => o.isCorrect).length;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id || `temp-${index}` });

  const [isCollapsed, setIsCollapsed] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="hover:bg-muted cursor-grab rounded-md p-1 active:cursor-grabbing"
          >
            <GripVertical className="text-muted-foreground h-4 w-4" />
          </div>
          <CardTitle className="text-base font-semibold">
            Question {index + 1}{" "}
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              (Order: {question.order ?? index})
            </span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="h-8 w-8"
            aria-label={isCollapsed ? "Expand question" : "Collapse question"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          {onMoveUp && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
              className="h-8 w-8"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          {onMoveDown && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              className="h-8 w-8"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeQuestion(index)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Question text */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input
                placeholder="Enter question text..."
                value={question.text}
                onChange={(e) => updateQuestion(index, "text", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Section (Optional)</Label>
              <Input
                placeholder="e.g. History, Math..."
                value={question.section || ""}
                onChange={(e) =>
                  updateQuestion(index, "section", e.target.value)
                }
              />
              {existingSections.filter((s) => s !== question.section).length >
                0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {existingSections
                    .filter((s) => s !== question.section)
                    .map((sec) => (
                      <Badge
                        key={sec}
                        variant="secondary"
                        className="hover:bg-secondary/80 cursor-pointer text-xs font-normal transition-colors"
                        onClick={() => updateQuestion(index, "section", sec)}
                      >
                        + {sec}
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Type + Order + Time Limit + Base Score row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
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
                  <SelectItem value="CODE_CORRECTION">
                    Code Correction
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">Order / Phase</Label>
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
                <Clock className="text-muted-foreground h-3 w-3" />
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
                <Trophy className="text-muted-foreground h-3 w-3" />
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
          {(question.type === "PROGRAM_OUTPUT" ||
            question.type === "CODE_CORRECTION") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Code Snippet</Label>
                <Select
                  value={question.language || "python"}
                  onValueChange={(val) =>
                    updateQuestion(index, "language", val)
                  }
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
              <div className="border-input focus-within:ring-ring relative min-h-[200px] overflow-hidden rounded-md border bg-[#1e1e1e] font-mono text-sm focus-within:ring-2 focus-within:ring-offset-2">
                <Editor
                  value={question.codeSnippet || ""}
                  onValueChange={(code) =>
                    updateQuestion(index, "codeSnippet", code)
                  }
                  highlight={(code) =>
                    highlight(
                      code,
                      (question.language === "javascript"
                        ? languages.javascript
                        : languages.python) || languages.javascript!,
                      question.language || "python",
                    )
                  }
                  padding={16}
                  textareaId={`code-editor-${index}`}
                  className="font-mono"
                  style={{
                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                    fontSize: 14,
                    backgroundColor: "transparent",
                    minHeight: "200px",
                  }}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="border-border/50 space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Options</Label>
                {correctCount > 1 && (
                  <p className="text-primary mt-0.5 text-xs">
                    {correctCount} correct answers selected
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addOption(index)}
              >
                <Plus className="mr-1.5 h-3 w-3" /> Add
              </Button>
            </div>
            <div className="grid gap-2">
              {question.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2.5">
                  <Checkbox
                    checked={opt.isCorrect}
                    onCheckedChange={(checked) =>
                      updateOption(index, oIndex, "isCorrect", checked)
                    }
                  />
                  <Input
                    placeholder={`Option ${oIndex + 1}`}
                    value={opt.text}
                    onChange={(e) =>
                      updateOption(index, oIndex, "text", e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        oIndex === question.options.length - 1
                      ) {
                        e.preventDefault();
                        addOption(index);
                      } else if (e.key === "Backspace" && opt.text === "") {
                        e.preventDefault();
                        if (question.options.length > 2) {
                          removeOption(index, oIndex);
                        }
                      }
                    }}
                    className={
                      opt.isCorrect ? "border-primary ring-primary ring-1" : ""
                    }
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
      )}
      {isCollapsed && (
        <div className="text-muted-foreground flex flex-wrap gap-3 px-4 pb-4 text-sm">
          <span className="text-foreground font-medium">
            {question.type.replace("_", " ")}
          </span>
          <span>{question.timeLimit ?? "?"}s</span>
          <span>{question.baseScore ?? "?"} pts</span>
          <span>{question.options.length} options</span>
          <span>{correctCount} correct</span>
        </div>
      )}
    </Card>
  );
}
