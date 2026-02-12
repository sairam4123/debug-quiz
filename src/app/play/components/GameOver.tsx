"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GameOver() {
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
