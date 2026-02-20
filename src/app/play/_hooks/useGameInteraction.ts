import { useState, useRef, useCallback } from "react";
import { api, type RouterOutputs } from "@mce-quiz/trpc/react";

type SubmitAnswerOutput = RouterOutputs["game"]["submitAnswer"];
import { Zap, Rocket, Flame, Lock, Target, Sparkles, Brain, Send, Bolt, Gauge, Flashlight, Radar, Timer, Trophy, CheckCircle, ClipboardCheck, Compass, Flag, Layers, ShieldCheck, ThumbsUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type HypeMessage = { Icon: LucideIcon; title: string; subtitle: string; color: string };

const HYPE_LIGHTNING: HypeMessage[] = [
    { Icon: Zap, title: "INSANE speed!", subtitle: "That was inhuman!", color: "#F59E0B" },
    { Icon: Rocket, title: "Blazing fast!", subtitle: "Nobody's catching you!", color: "#F43F5E" },
    { Icon: Flame, title: "Speed demon!", subtitle: "Are you even reading?!", color: "#F59E0B" },
];

const HYPE_FAST: HypeMessage[] = [
    { Icon: Zap, title: "Quick draw!", subtitle: "That was speedy!", color: "#14B8A6" },
    { Icon: Target, title: "Sharp & swift!", subtitle: "Didn't even hesitate!", color: "#10B981" },
    { Icon: Rocket, title: "Locked in!", subtitle: "No second-guessing!", color: "#0891B2" },

    // Added from ChatGPT
    { Icon: Bolt, title: "Blink and done!", subtitle: "That was instant!", color: "#06B6D4" },
    { Icon: Flashlight, title: "Lightning reflex!", subtitle: "Zero delay!", color: "#0EA5E9" },
    { Icon: Timer, title: "Beat the clock!", subtitle: "Time stood no chance!", color: "#8B5CF6" },
    { Icon: Radar, title: "Instant lock!", subtitle: "Target acquired fast!", color: "#3B82F6" },
    { Icon: Trophy, title: "Speed demon!", subtitle: "That was elite!", color: "#F59E0B" },
];

const HYPE_NORMAL: HypeMessage[] = [
    { Icon: Lock, title: "Locked in!", subtitle: "No turning back now!", color: "#0891B2" },
    { Icon: Rocket, title: "Submitted!", subtitle: "That was quick!", color: "#14B8A6" },
    { Icon: Target, title: "Answer sent!", subtitle: "Fingers crossed!", color: "#10B981" },
    { Icon: Sparkles, title: "Done!", subtitle: "Trust the process!", color: "#0EA5E9" },
    { Icon: Brain, title: "Big brain move!", subtitle: "Let's see how it plays out...", color: "#0891B2" },
    { Icon: Send, title: "Sent!", subtitle: "Way to commit!", color: "#06B6D4" },

    // Added from ChatGPT
    { Icon: CheckCircle, title: "Locked & loaded!", subtitle: "Answer secured.", color: "#22C55E" },
    { Icon: Compass, title: "Choice made!", subtitle: "Charting your path.", color: "#3B82F6" },
    { Icon: ShieldCheck, title: "Decision sealed!", subtitle: "Standing by it.", color: "#16A34A" },
    { Icon: ClipboardCheck, title: "Marked!", subtitle: "On to the next.", color: "#0284C7" },
    { Icon: Flag, title: "Flag planted!", subtitle: "You've made your stand.", color: "#F97316" },
    { Icon: ThumbsUp, title: "Committed!", subtitle: "Confidence activated.", color: "#6366F1" },
    { Icon: Layers, title: "Layer locked!", subtitle: "Stacking progress.", color: "#0D9488" },
];

const HYPE_STREAK: HypeMessage[] = [
    { Icon: Flame, title: "On fire!", subtitle: "", color: "#F43F5E" },
    { Icon: Zap, title: "Unstoppable!", subtitle: "", color: "#F59E0B" },
    { Icon: Sparkles, title: "Combo master!", subtitle: "", color: "#0EA5E9" },
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

function getHype(speedRatio: number, streak: number): HypeMessage {
    if (streak >= 5) {
        const base = pick(HYPE_STREAK);
        return { ...base, title: "UNSTOPPABLE!", subtitle: `${streak} in a row — you're on fire!` };
    }
    if (streak >= 3) {
        const base = pick(HYPE_STREAK);
        return { ...base, subtitle: `${streak} in a row!` };
    } else if (streak >= 3 && speedRatio < 0.25) {
        const base = pick(HYPE_STREAK);
        return { ...base, subtitle: `${streak} in a row! Speed demon!` };
    }
    if (speedRatio < 0.25) return pick(HYPE_LIGHTNING);
    if (speedRatio < 0.5) return pick(HYPE_FAST);
    return pick(HYPE_NORMAL);
}

export function useGameInteraction(sessionId: string | null, playerId: string | null) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [hypeMessage, setHypeMessage] = useState<HypeMessage | null>(null);
    const [answerStreak, setAnswerStreak] = useState(0);
    const submittedRef = useRef(false);

    const submitAnswer = api.game.submitAnswer.useMutation({
        onSuccess: (data: SubmitAnswerOutput) => {
            setIsSubmitted(true);
            submittedRef.current = true;
            if (data.isCorrect) {
                setAnswerStreak(prev => prev + 1);
            } else {
                setAnswerStreak(0);
            }
            // Speed calculation needs context but for now we calculate simplistic
            // Ideally we pass in speedRatio or calculate it here if we had start time
            // For now, we'll let the caller handle hype or do it here if passed
        }
    });

    // We expose a wrapper to calculate hype
    const submit = (questionId: string, optionId: string, questionStartTime: string | null, timeLimit: number) => {
        if (isSubmitted || !sessionId || !playerId) return;

        setSelectedOption(optionId);
        submitAnswer.mutate({ sessionId, playerId, questionId, optionId }, {
            onSuccess: (data: SubmitAnswerOutput) => {
                // Rely on the perfectly accurate timeTakenMs calculated by the server transaction
                const timeTakenMs = data.timeTaken || 5000;
                const speedRatio = timeTakenMs / (timeLimit * 1000);

                const currentStreak = data.isCorrect ? answerStreak + 1 : 0;
                setHypeMessage(getHype(speedRatio, currentStreak));
            }
        });
    };

    const resetForNewQuestion = useCallback((keepStreak: boolean) => {
        setSelectedOption(null);
        setIsSubmitted(false);
        setHypeMessage(null);
        if (!keepStreak) {
            setAnswerStreak(0);
        }
        submittedRef.current = false;
    }, []);

    return {
        selectedOption,
        isSubmitted,
        hypeMessage,
        submit,
        resetForNewQuestion,
        submittedRef,
        isPending: submitAnswer.isPending
    };
}
