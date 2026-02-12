"use client";

import { Card, CardContent } from "@/components/ui/card";

interface WaitingRoomProps {
    name: string;
}

export function WaitingRoom({ name }: WaitingRoomProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/50 p-4">
            <Card className="w-full max-w-md text-center p-6">
                <div className="flex justify-center mb-6">
                    <div className="animate-pulse bg-blue-100 p-8 rounded-full dark:bg-blue-900">
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
