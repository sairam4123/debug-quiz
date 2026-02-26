"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, Edit2, GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SectionContainerProps {
  id: string; // The section name or default title
  items: string[]; // Question IDs
  children: React.ReactNode;
  onRename?: (oldName: string, newName: string) => void;
  isDefaultFallback?: boolean;
  onTimeAdjust?: (sectionId: string, delta: number) => void;
  timeSummary?: string;
}

export function SectionContainer({
  id,
  items,
  children,
  onRename,
  isDefaultFallback,
  onTimeAdjust,
  timeSummary,
}: SectionContainerProps) {
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id });
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    data: {
      type: "Section",
      sectionName: id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <div
      ref={setSortableNodeRef}
      style={style}
      className="border-border/60 bg-card/40 overflow-hidden rounded-xl border"
    >
      <div className="bg-muted/30 border-border/40 flex items-center justify-between border-b p-4">
        <div className="flex flex-1 items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="hover:bg-muted/50 cursor-grab rounded-md p-1 active:cursor-grabbing"
          >
            <GripVertical className="text-muted-foreground h-5 w-5" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted/50 h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {isEditing ? (
            <div className="flex max-w-sm flex-1 items-center gap-2">
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
              <Button size="sm" variant="default" onClick={handleSave}>
                Save
              </Button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h3 className="flex items-center text-lg font-semibold">
                {id}
                {isDefaultFallback && (
                  <span className="text-muted-foreground bg-muted ml-2 rounded-full px-2 py-0.5 text-xs font-normal">
                    Default Section
                  </span>
                )}
              </h3>
              {!isDefaultFallback && onRename && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
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
        <div className="flex items-center gap-3">
          {onTimeAdjust && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <span className="bg-background/50 border-border/50 rounded-md border px-2 py-1 font-semibold tracking-wider uppercase">
                {timeSummary || "Time"}
              </span>
              {[-10, -5, 5, 10].map((delta) => (
                <Button
                  key={delta}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onTimeAdjust(id, delta)}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </Button>
              ))}
            </div>
          )}
          <div className="text-muted-foreground bg-background/50 border-border/50 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">
            {items.length} Question{items.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div ref={setDroppableNodeRef} className="min-h-[100px] space-y-4 p-4">
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
          {items.length === 0 && (
            <div className="text-muted-foreground border-border/50 rounded-lg border-2 border-dashed py-8 text-center text-sm">
              Empty Section. Drag questions here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
