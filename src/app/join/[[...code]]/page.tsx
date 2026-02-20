"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameJoin } from "@/app/play/_components/GameJoin";
import { useGameSession } from "@/app/play/_hooks/useGameSession";
import { useAlert } from "@/components/providers/alert-provider";

export default function JoinPage() {
    const params = useParams();
    const router = useRouter();
    const routerCode = params?.code?.[0] || "";
    const { alert } = useAlert();

    const {
        name, setName,
        code, setCode,
        joinStep, setJoinStep,
        joinSession,
        playerId,
        sessionId
    } = useGameSession();

    useEffect(() => {
        if (routerCode) {
            setCode(routerCode);
            if (routerCode.length >= 4) {
                setJoinStep(2);
            }
        }
    }, [routerCode, setCode, setJoinStep]);

    // Redirect to play page once joined
    useEffect(() => {
        if (playerId && sessionId) {
            localStorage.setItem(`quiz_player_${sessionId}`, playerId);
            router.push(`/play/${sessionId}?playerId=${playerId}`);
        }
    }, [playerId, sessionId, router]);

    const handleJoin = (selectedClass: string) => {
        if (!code || !name || !selectedClass) {
            alert("Please fill in all details.", "Validation Error");
            return;
        }
        joinSession.mutate({ code, name, class: selectedClass as any });
    };

    return (
        <div className="min-h-screen">
            <GameJoin
                step={joinStep}
                code={code}
                name={name}
                onCodeChange={setCode}
                onNameChange={setName}
                onStepChange={setJoinStep}
                onJoin={handleJoin}
                isLoading={joinSession.isPending}
            />
        </div>
    );
}
