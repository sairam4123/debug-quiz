import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { TimerBar } from "./TimerBar";
import { Zap, History } from "lucide-react";
import { cn } from "@/lib/utils";

type GameQuestionProps = {
    currentQuestion: any;
    questionIndex: number;
    totalQuestions: number;
    questionStartTime: string | null;
    timeLimit: number;
    selectedOption: string | null;
    isSubmitted: boolean;
    hypeMessage: any;
    showSplash: boolean;
    onOptionClick: (id: string) => void;
    onTimerExpire: () => void;
    sseConnected: boolean;
    pusherConnected: boolean;
    isHistory: boolean;
    clockOffset: number;
};

export function GameQuestion({
    currentQuestion,
    questionIndex,
    totalQuestions,
    questionStartTime,
    timeLimit,
    selectedOption,
    isSubmitted,
    hypeMessage,
    showSplash,
    onOptionClick,
    onTimerExpire,
    sseConnected,
    pusherConnected,
    isHistory,
    clockOffset
}: GameQuestionProps) {

    // Splash Screen
    if (showSplash) {
        const questionType = currentQuestion.type === "PROGRAM_OUTPUT" ? "Program Output"
            : currentQuestion.type === "CODE_CORRECTION" ? "Code Correction" : "Knowledge";
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
                </div>
                <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                    <div className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 mb-2 animate-pulse">
                        <Zap className="h-14 w-14 text-teal-500" />
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight">
                        Question <span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">{questionIndex}</span>
                    </h1>
                    <p className="text-muted-foreground text-lg">{questionType}</p>
                    <div className="flex justify-center gap-1 mt-4">
                        {Array.from({ length: totalQuestions }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${i + 1 < questionIndex
                                    ? "w-6 bg-teal-500"
                                    : i + 1 === questionIndex
                                        ? "w-8 bg-gradient-to-r from-teal-500 to-cyan-500 animate-pulse"
                                        : "w-4 bg-muted"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6 space-y-6">
                    {/* Timer progress bar at the top */}
                    <TimerBar startTime={questionStartTime} timeLimit={timeLimit} onExpire={onTimerExpire} clockOffset={clockOffset} />

                    {/* History Mode Banner */}
                    {isHistory && (
                        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <History className="h-4 w-4" />
                            <span className="text-sm font-semibold">Reviewing Past Question (Read-only)</span>
                        </div>
                    )}

                    {/* If submitted, show hype message only; otherwise show question */}
                    {isSubmitted && hypeMessage ? (
                        (() => {
                            const { Icon, title, subtitle, color } = hypeMessage;
                            return (
                                <div
                                    className="flex flex-col items-center gap-3 py-12"
                                    style={{
                                        animation: "feedbackPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                                    }}
                                >
                                    <div
                                        className="rounded-2xl p-5"
                                        style={{ backgroundColor: `${color}18` }}
                                    >
                                        <Icon className="h-14 w-14" style={{ color }} />
                                    </div>
                                    <h3 className="text-3xl font-extrabold" style={{ color }}>
                                        {title}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {subtitle}
                                    </p>
                                    {totalQuestions > 0 && (
                                        <span className="text-sm font-medium text-muted-foreground mt-4 bg-muted/50 px-3 py-1 rounded-full">
                                            Q{questionIndex}/{totalQuestions}
                                        </span>
                                    )}
                                    <p className="text-xs text-muted-foreground animate-pulse mt-2">
                                        Waiting for next question...
                                    </p>
                                </div>
                            );
                        })()
                    ) : (
                        <>
                            {/* Question header with number */}
                            <div className="flex items-start justify-between gap-4">
                                <h2 className="text-xl sm:text-2xl font-bold flex-1">{currentQuestion.text}</h2>
                                {totalQuestions > 0 && (
                                    <span className="shrink-0 text-xs font-semibold bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full border border-teal-500/20">
                                        Q{questionIndex}/{totalQuestions}
                                    </span>
                                )}
                            </div>

                            {currentQuestion.codeSnippet && (
                                <div className="rounded-xl overflow-hidden border border-border/50 my-4 text-left">
                                    <div className="bg-muted/80 px-4 py-1 text-xs text-muted-foreground border-b border-border/50 font-mono flex justify-between">
                                        <span>Code Snippet</span>
                                        <span>{currentQuestion.language || 'python'}</span>
                                    </div>
                                    <SyntaxHighlighter
                                        language={currentQuestion.language || 'python'}
                                        style={vscDarkPlus}
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            padding: '1rem',
                                            fontSize: '0.875rem',
                                            lineHeight: '1.5',
                                        }}
                                        showLineNumbers={true}
                                        wrapLongLines={true}
                                    >
                                        {currentQuestion.codeSnippet}
                                    </SyntaxHighlighter>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {currentQuestion.options.map((opt: any, idx: number) => (
                                    <Button
                                        key={idx}
                                        variant={selectedOption === opt.id ? "default" : "outline"}
                                        className={cn(
                                            "h-auto py-4 text-left justify-start text-base whitespace-normal rounded-xl transition-all",
                                            selectedOption === opt.id
                                                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-teal-500 hover:from-teal-600 hover:to-cyan-600"
                                                : "hover:border-teal-500/40 hover:bg-teal-500/5"
                                        )}
                                        onClick={() => onOptionClick(opt.id)}
                                        disabled={isSubmitted || isHistory}
                                    >
                                        {opt.text}
                                    </Button>
                                ))}
                            </div>
                        </>
                    )}

                    {(!pusherConnected && !sseConnected) ? (
                        <p className="text-xs text-center text-amber-500 animate-pulse">
                            Reconnecting to live updates...
                        </p>
                    ) : (
                        <div className="flex justify-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pusherConnected
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                }`}>
                                {pusherConnected ? "Live (Pusher)" : "Live (SSE)"}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
