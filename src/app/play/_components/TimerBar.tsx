import { useState, useEffect } from "react";

export function TimerBar({ startTime, timeLimit, onExpire, clockOffset }: { startTime: string | null; timeLimit: number; onExpire?: () => void; clockOffset?: number }) {
    const [progress, setProgress] = useState(100);
    const [hasFired, setHasFired] = useState(false);

    useEffect(() => {
        setHasFired(false);
    }, [startTime]);

    useEffect(() => {
        if (!startTime) return;
        const start = new Date(startTime).getTime();
        const durationMs = timeLimit * 1000;
        const offset = clockOffset || 0;

        const tick = () => {
            // Adjust Date.now() by adding the offset to match Server Time
            const now = Date.now() + offset;
            const elapsed = now - start;
            const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
            setProgress(remaining);
            if (remaining <= 0 && !hasFired) {
                setHasFired(true);
                onExpire?.();
            }
        };

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [startTime, timeLimit, hasFired, onExpire, clockOffset]);

    const barColor =
        progress > 50 ? "bg-gradient-to-r from-teal-500 to-cyan-500" : progress > 20 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-rose-400 to-rose-500";

    const textColor =
        progress > 50 ? "text-teal-500" : progress > 20 ? "text-amber-500" : "text-rose-500";

    const remainingSeconds = Math.ceil((progress / 100) * timeLimit);

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted/50 rounded-full overflow-hidden">
                <div
                    className={`h-full ${barColor} rounded-full transition-all duration-100 ease-linear`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className={`text-lg font-bold tabular-nums min-w-[2ch] text-right ${textColor} ${remainingSeconds <= 5 ? "animate-pulse" : ""}`}>
                {remainingSeconds}
            </span>
        </div>
    );
}
