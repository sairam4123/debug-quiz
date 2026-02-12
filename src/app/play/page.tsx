"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function PlayPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [gameStatus, setGameStatus] = useState<"WAITING" | "ACTIVE" | "ENDED">("WAITING");
    const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);

    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const joinSession = api.quiz.joinSession.useMutation({
        onSuccess: (data) => {
            setPlayerId(data.playerId);
            setSessionId(data.sessionId);
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const submitAnswer = api.quiz.submitAnswer.useMutation({
        onSuccess: () => {
            setIsSubmitted(true);
        }
    });

    api.quiz.onSessionUpdate.useSubscription(
        { sessionId: sessionId || "" },
        {
            enabled: !!sessionId,
            onData: (data: any) => {
                if (data.type === "STATUS_CHANGE") {
                    setGameStatus(data.payload.status);
                } else if (data.type === "NEW_QUESTION") {
                    setGameStatus("ACTIVE");
                    setCurrentQuestion(data.payload.question);
                    setSelectedOption(null);
                    setIsSubmitted(false);
                }
            },
            onError: (err) => {
                console.error("Subscription error:", err);
            }
        }
    );

    const handleOptionClick = (optionId: string) => {
        if (isSubmitted) return;
        setSelectedOption(optionId);
        if (sessionId && playerId && currentQuestion) {
            submitAnswer.mutate({
                sessionId,
                playerId,
                questionId: currentQuestion.id,
                optionId,
                timeTaken: 0 // TODO: Calculate time
            });
        }
    };

    if (playerId) {
        if (gameStatus === "ENDED") {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-muted/50 p-4">
                    <Card className="w-full max-w-md text-center p-6 bg-white dark:bg-zinc-900">
                        <h1 className="text-3xl font-bold mb-4">Quiz Ended!</h1>
                        <p className="text-muted-foreground mb-6">Thanks for playing.</p>
                        <Button onClick={() => window.location.reload()}>Back to Home</Button>
                    </Card>
                </div>
            );
        }

        if (gameStatus === "ACTIVE" && currentQuestion) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-muted/50 p-4">
                    <Card className="w-full max-w-2xl">
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold">{currentQuestion.text}</h2>
                                {currentQuestion.codeSnippet && (
                                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                                        <code>{currentQuestion.codeSnippet}</code>
                                    </pre>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.options.map((opt: any, idx: number) => (
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
                                <p className="text-center text-muted-foreground animate-pulse">Answer submitted! Waiting for next question...</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-muted/50 p-4">
                <Card className="w-full max-w-md text-center p-6">
                    <div className="flex justify-center mb-6">
                        <div className="animate-pulse bg-blue-100 p-8 rounded-full">
                            <div className="w-16 h-16 bg-primary rounded-full"></div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">You're in!</h1>
                    <p className="text-muted-foreground mb-6">Waiting for the host to start...</p>
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Player</p>
                        <p className="font-bold text-xl">{name}</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 bg-muted/50">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold text-primary tracking-tight">Debug Quiz</h1>
                <p className="text-muted-foreground">Enter code to join</p>
            </div>

            <Card className="w-full max-w-sm">
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            placeholder="Your Name"
                            className="text-lg py-6"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="code">Game Code</Label>
                        <Input
                            id="code"
                            type="text"
                            placeholder="123456"
                            className="text-lg py-6 font-mono text-center tracking-[0.5em]"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => joinSession.mutate({ name, code })}
                        disabled={joinSession.isPending || !name || !code}
                        className="w-full text-lg py-6 font-bold"
                        size="lg"
                    >
                        {joinSession.isPending ? "Joining..." : "Join Game"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
