"use client";

import * as React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AlertOptions {
    title: string;
    description: string;
    mode: "alert" | "confirm";
}

interface AlertContextType {
    alert: (message: string, title?: string) => Promise<void>;
    confirm: (message: string, title?: string) => Promise<boolean>;
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
    const context = React.useContext(AlertContext);
    if (!context) {
        throw new Error("useAlert must be used within an AlertProvider");
    }
    return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const [options, setOptions] = React.useState<AlertOptions>({
        title: "Alert",
        description: "",
        mode: "alert",
    });

    const resolveRef = React.useRef<((value: any) => void) | null>(null);

    const alert = React.useCallback((message: string, title?: string) => {
        return new Promise<void>((resolve) => {
            setOptions({
                title: title || "Notice",
                description: message,
                mode: "alert",
            });
            resolveRef.current = resolve;
            setOpen(true);
        });
    }, []);

    const confirm = React.useCallback((message: string, title?: string) => {
        return new Promise<boolean>((resolve) => {
            setOptions({
                title: title || "Confirm",
                description: message,
                mode: "confirm",
            });
            resolveRef.current = resolve;
            setOpen(true);
        });
    }, []);

    const handleConfirm = () => {
        setOpen(false);
        if (resolveRef.current) {
            resolveRef.current(options.mode === "confirm" ? true : undefined);
            resolveRef.current = null;
        }
    };

    const handleCancel = () => {
        setOpen(false);
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
    };

    return (
        <AlertContext.Provider value={{ alert, confirm }}>
            {children}
            <AlertDialog open={open} onOpenChange={(val) => {
                if (!val) handleCancel();
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{options.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {options.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {options.mode === "confirm" && (
                            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
                        )}
                        <AlertDialogAction onClick={handleConfirm}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AlertContext.Provider>
    );
}

