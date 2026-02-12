"use client";

import { useParams } from "next/navigation";
import { api } from "@mce-quiz/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";

export default function AdminSessionPage() {
    const params = useParams();
    const sessionId = params?.sessionId as string;

    // We need to fetch session details initially
    // But we don't have getSessionById router yet? 
    // We can use the subscription for updates.
    // Ideally we should have a query for initial state.

    // For now, let's assume valid session and use available actions.
    const [status, setStatus] = useState("ACTIVE"); // Default assuming we just started it
    const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

    const nextQuestion = api.admin.nextQuestion.useMutation({
        onSuccess: (data) => {
            if (data.success && data.nextQuestionId) {
                setCurrentQuestionId(data.nextQuestionId);
            } else {
                alert("No more questions!");
            }
        }
    });

    const endSession = api.admin.endSession.useMutation({
        onSuccess: () => {
            setStatus("ENDED");
            alert("Session ended");
        }
    });

    // TODO: Subscribe to player joins too?
    // quiz.onSessionUpdate might need modification to broadcast player joins if we want that.

    // For MVP, just controls.

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-3xl font-bold">Session Control</h1>
            <p className="text-muted-foreground">Session ID: {sessionId}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={() => nextQuestion.mutate({ sessionId })}
                            disabled={nextQuestion.isPending || status === "ENDED"}
                        >
                            Next Question
                        </Button>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => endSession.mutate({ sessionId })}
                            disabled={endSession.isPending || status === "ENDED"}
                        >
                            End Session
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold mb-2">{status}</div>
                        {currentQuestionId && (
                            <p>Current Question ID: {currentQuestionId}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
