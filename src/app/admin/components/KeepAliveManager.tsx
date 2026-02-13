"use client";

import { useEffect, useRef, useState } from "react";
import { Coffee, Lock, Unlock, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface KeepAliveManagerProps {
    autoAdvance: boolean;
    onAutoAdvanceChange: (enabled: boolean) => void;
}

export function KeepAliveManager({ autoAdvance, onAutoAdvanceChange }: KeepAliveManagerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isActive, setActive] = useState(false);
    const [wakeLock, setWakeLock] = useState<any>(null); // WakeLockSentinel type might not be available

    useEffect(() => {
        // Silent MP3 (short loop)
        const silentMp3 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAAAMAAAAEAAABHAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAAAMAAAAEAAABHAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP//OEAAAAAAAAAAAAAAAAAAAAAAAMAAAAEAAABHAAAAAAAAAAAA";
        const audio = new Audio(silentMp3);
        audio.loop = true;
        audio.volume = 0.01;
        audioRef.current = audio;

        return () => {
            audio.pause();
            if (wakeLock) (wakeLock as any).release();
        };
    }, []);

    const toggleKeepAlive = async () => {
        if (!isActive) {
            try {
                await audioRef.current?.play();
                setActive(true);

                if ('wakeLock' in navigator) {
                    try {
                        const lock = await (navigator as any).wakeLock.request('screen');
                        setWakeLock(lock);
                    } catch (err) {
                        console.error('Wake Lock error:', err);
                    }
                }
            } catch (e) {
                console.error("Audio play failed", e);
            }
        } else {
            audioRef.current?.pause();
            if (wakeLock) {
                await (wakeLock as any).release();
                setWakeLock(null);
            }
            setActive(false);
        }
    };

    return (
        <Card className="border-amber-500/20 bg-amber-500/5 mb-4">
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={toggleKeepAlive}
                        className={isActive ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-500/50 text-amber-600 hover:bg-amber-500/10"}
                    >
                        {isActive ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                        {isActive ? "Prevent Sleep (Active)" : "Enable Sleep Prevention"}
                    </Button>
                    {isActive && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 font-medium animate-pulse">
                            <Coffee className="h-3 w-3" />
                            <span className="hidden sm:inline">Keeping session alive...</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <Label htmlFor="auto-advance" className="text-sm font-medium flex items-center gap-2 cursor-pointer select-none">
                        Auto-Advance Questions
                        {autoAdvance ? <Zap className="h-3 w-3 text-amber-500" /> : <ZapOff className="h-3 w-3 text-muted-foreground" />}
                    </Label>
                    <Switch
                        id="auto-advance"
                        checked={autoAdvance}
                        onCheckedChange={onAutoAdvanceChange}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
