import { useState } from "react";
import { api } from "@mce-quiz/trpc/react";
import { useAlert } from "@/components/providers/alert-provider";

export function useGameSession() {
    const { alert } = useAlert();
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [joinStep, setJoinStep] = useState<1 | 2>(1);

    const joinSession = api.game.joinSession.useMutation({
        onSuccess: (data) => {
            setPlayerId(data.playerId);
            setSessionId(data.sessionId);
        },
        onError: async (error) => {
            await alert(error.message || "Failed to join session", "Error");
        }
    });

    return {
        name, setName,
        code, setCode,
        playerId, setPlayerId,
        sessionId, setSessionId,
        joinStep, setJoinStep,
        joinSession
    };
}
