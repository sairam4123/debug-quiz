import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

type GameJoinProps = {
    step: 1 | 2;
    code: string;
    name: string;
    onCodeChange: (val: string) => void;
    onNameChange: (val: string) => void;
    onStepChange: (step: 1 | 2) => void;
    onJoin: (cls: string) => void;
    isLoading?: boolean;
};

import { Spinner } from "@/components/ui/spinner";

export function GameJoin({ step, code, name, onCodeChange, onNameChange, onStepChange, onJoin, isLoading }: GameJoinProps) {
    const [selectedClass, setSelectedClass] = useState("");

    if (step === 1) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
                    <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-cyan-500/6 blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
                </div>

                <div className="text-center space-y-2 relative z-10">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 border border-teal-500/20">
                            <Code2 className="h-6 w-6 text-teal-500" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                        Debug Quiz
                    </h1>
                    <p className="text-muted-foreground">Enter code to join a game</p>
                </div>

                <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Game Code</Label>
                            <Input
                                id="code"
                                type="text"
                                placeholder="123456"
                                className="text-2xl py-7 font-mono text-center tracking-[0.5em]"
                                maxLength={6}
                                value={code}
                                onChange={(e) => onCodeChange(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && code.length >= 4) onStepChange(2); }}
                                autoFocus
                            />
                        </div>
                        <Button
                            onClick={() => onStepChange(2)}
                            disabled={!code || code.length < 4}
                            className="w-full text-lg py-6 font-bold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 border-0 gap-2"
                            size="lg"
                        >
                            Next
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
                <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-cyan-500/6 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
            </div>

            <Button
                variant="ghost"
                className="absolute top-8 left-4 sm:left-8 z-20"
                onClick={() => onStepChange(1)}
            >
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                Back
            </Button>

            <div className="text-center space-y-2 relative z-10">
                <h1 className="text-3xl font-extrabold tracking-tight">Almost there!</h1>
                <p className="text-muted-foreground">Just a few details to get started</p>
            </div>

            <Card className="w-full max-w-sm border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => onNameChange(e.target.value)}
                                className="h-12 text-lg"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Select your Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="h-12 text-lg">
                                    <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="E27">E27</SelectItem>
                                    <SelectItem value="E37A">E37A</SelectItem>
                                    <SelectItem value="E37B">E37B</SelectItem>
                                    <SelectItem value="E29">E29</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button
                        onClick={() => onJoin(selectedClass)}
                        disabled={!name || !selectedClass || isLoading}
                        className="w-full text-lg py-6 font-bold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/20 border-0 mt-2"
                        size="lg"
                    >
                        {isLoading ? <Spinner className="mr-2" size="sm" /> : null}
                        {isLoading ? "Joining..." : "Join Game"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
