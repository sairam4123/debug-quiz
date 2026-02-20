"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SectionContainerProps {
    id: string; // The section name or default title
    items: string[]; // Question IDs
    children: React.ReactNode;
    onRename?: (oldName: string, newName: string) => void;
    isDefaultFallback?: boolean;
}

export function SectionContainer({ id, items, children, onRename, isDefaultFallback }: SectionContainerProps) {
    const { setNodeRef } = useDroppable({ id });
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(id);

    const handleSave = () => {
        setIsEditing(false);
        if (editValue.trim() && editValue !== id && onRename) {
            onRename(id, editValue.trim());
        } else {
            setEditValue(id); // Reset if empty
        }
    };

    return (
        <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
            <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border/40">
                <div className="flex items-center gap-3 flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted/50"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    {isEditing ? (
                        <div className="flex items-center gap-2 max-w-sm flex-1">
                            <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSave();
                                    if (e.key === "Escape") {
                                        setIsEditing(false);
                                        setEditValue(id);
                                    }
                                }}
                                autoFocus
                                className="h-8"
                            />
                            <Button size="sm" variant="default" onClick={handleSave}>Save</Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h3 className="font-semibold text-lg flex items-center">
                                {id}
                                {isDefaultFallback && <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Default Section</span>}
                            </h3>
                            {!isDefaultFallback && onRename && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                        setEditValue(id);
                                        setIsEditing(true);
                                    }}
                                >
                                    <Edit2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background/50 px-3 py-1 rounded-full border border-border/50">
                    {items.length} Question{items.length !== 1 ? 's' : ''}
                </div>
            </div>

            {isExpanded && (
                <div ref={setNodeRef} className="p-4 space-y-4 min-h-[100px]">
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                        {children}
                    </SortableContext>
                    {items.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed border-border/50 rounded-lg">
                            Empty Section. Drag questions here.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
