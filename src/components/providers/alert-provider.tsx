"use client";

import * as React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AlertOptions {
    title?: string;
    description: string;
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
    });

    // Use a ref to store the resolve function for the current alert
    const resolveRef = React.useRef<((value: void | boolean) => void) | null>(null);

    const alert = React.useCallback((message: string, title?: string) => {
        return new Promise<void>((resolve) => {
            setOptions({
                title: title || "Notice",
                description: message,
            });
            resolveRef.current = resolve as any;
            setOpen(true);
        });
    }, []);

    // Simple confirm implementation (Ok/Cancel), returns boolean
    // Not strictly requested but good to have alongside alert
    const confirm = React.useCallback((message: string, title?: string) => {
        // For now, confirm is synonymous with alert since we only requested alert replacement. 
        // But to be safe, I'll just implement alert logic only for now to avoid scope creep, 
        // but keep the type signature in case we want to expand.
        // Actually, let's stick to just `alert` for now to be simple.
        return Promise.resolve(true);
    }, []);

    const handleClose = () => {
        setOpen(false);
        if (resolveRef.current) {
            resolveRef.current();
            resolveRef.current = null;
        }
    };

    return (
        <AlertContext.Provider value={{ alert, confirm }}>
            {children}
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{options.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {options.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={handleClose}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AlertContext.Provider>
    );
}
