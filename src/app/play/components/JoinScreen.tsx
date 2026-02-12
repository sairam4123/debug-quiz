"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

interface JoinScreenProps {
    name: string;
    setName: (name: string) => void;
    code: string;
    setCode: (code: string) => void;
    onJoin: () => void;
    isLoading: boolean;
}

export function JoinScreen({ name, setName, code, setCode, onJoin, isLoading }: JoinScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Join Quiz</CardTitle>
                    <CardDescription>Enter your name and the game code.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Game Code</Label>
                        <Input
                            placeholder="123456"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            maxLength={6}
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={onJoin}
                        disabled={!name || !code || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="mr-2" size="sm" /> Joining...
                            </>
                        ) : (
                            "Join Game"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
