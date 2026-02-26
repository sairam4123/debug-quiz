"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

interface QuestionViewProps {
    question: any; // Using any for now, should be typed shared from server
    onSubmit: (optionId: string) => void;
    isSubmitted: boolean;
}

export function QuestionView({ question, onSubmit, isSubmitted }: QuestionViewProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const handleOptionClick = (optionId: string) => {
        if (isSubmitted) return;
        setSelectedOption(optionId);
        onSubmit(optionId);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen select-none bg-muted/50 p-4">
            <Card className="w-full max-w-2xl">
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">{question.text}</h2>
                        {question.codeSnippet && (
                            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                                <code>{question.codeSnippet}</code>
                            </pre>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {question.options.map((opt: any, idx: number) => (
                            <Button
                                key={idx}
                                variant={selectedOption === opt.id ? "default" : "outline"}
                                className="h-auto py-4 text-left justify-start text-lg whitespace-normal"
                                onClick={() => handleOptionClick(opt.id)}
                                disabled={isSubmitted}
                            >
                                {opt.text}
                            </Button>
                        ))}
                    </div>
                    {isSubmitted && (
                        <p className="text-center text-muted-foreground animate-pulse">
                            Answer submitted! Waiting for next question...
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
