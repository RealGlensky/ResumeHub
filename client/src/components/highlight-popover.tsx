import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Check, X, Pencil, Trash2, MessageSquarePlus } from "lucide-react";
import type { Highlight } from "@db/schema";

export interface HighlightWithAuthor extends Highlight {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface Position {
  x: number;
  y: number;
}

type HighlightPopoverProps =
  | {
      mode: "create";
      position: Position;
      quotedText: string;
      onSubmit: (data: { comment: string; suggestedText?: string }) => void;
      onCancel: () => void;
      isPending: boolean;
    }
  | {
      mode: "view";
      position: Position;
      highlight: HighlightWithAuthor;
      canEdit: boolean;
      canResolve: boolean;
      onSave: (data: { comment: string; suggestedText?: string }) => void;
      onDelete: () => void;
      onResolve: (status: "accepted" | "rejected" | "open") => void;
      onClose: () => void;
      isPending: boolean;
    };

function clampPosition(pos: Position, width = 320, height = 260) {
  const x = Math.min(Math.max(pos.x, 12), window.innerWidth - width - 12);
  const y = Math.min(Math.max(pos.y, 12), window.innerHeight - height - 12);
  return { x, y };
}

export function HighlightPopover(props: HighlightPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [suggestMode, setSuggestMode] = useState(
    props.mode === "view" ? !!props.highlight.suggestedText : false
  );
  const [comment, setComment] = useState(props.mode === "view" ? props.highlight.comment : "");
  const [suggestedText, setSuggestedText] = useState(
    props.mode === "view" ? props.highlight.suggestedText ?? "" : ""
  );
  const [isEditing, setIsEditing] = useState(props.mode === "create");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (props.mode === "create") props.onCancel();
        else if (!isEditing) props.onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const pos = clampPosition(props.position);

  const authorName =
    props.mode === "view"
      ? [props.highlight.firstName, props.highlight.lastName].filter(Boolean).join(" ") ||
        props.highlight.username ||
        "Someone"
      : "";

  return (
    <div
      ref={containerRef}
      className="fixed z-[100] w-80 rounded-md border bg-popover p-3 text-popover-foreground shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      {props.mode === "create" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-2">"{props.quotedText}"</p>
          <Textarea
            autoFocus
            placeholder="Leave a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[70px]"
          />
          <div className="flex items-center gap-2">
            <Checkbox id="suggest-edit" checked={suggestMode} onCheckedChange={(v) => setSuggestMode(!!v)} />
            <Label htmlFor="suggest-edit" className="text-sm font-normal cursor-pointer">
              Suggest a replacement
            </Label>
          </div>
          {suggestMode && (
            <Textarea
              placeholder="Replace with..."
              value={suggestedText}
              onChange={(e) => setSuggestedText(e.target.value)}
              className="min-h-[60px]"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={props.onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!comment.trim() || props.isPending}
              onClick={() =>
                props.onSubmit({
                  comment: comment.trim(),
                  suggestedText: suggestMode ? suggestedText.trim() : undefined,
                })
              }
            >
              <MessageSquarePlus className="h-4 w-4 mr-1" />
              {props.isPending ? "Saving..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      {props.mode === "view" && !isEditing && (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{authorName}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">"{props.highlight.quotedText}"</p>
            </div>
            {props.highlight.status !== "open" && (
              <span
                className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${
                  props.highlight.status === "accepted"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {props.highlight.status}
              </span>
            )}
          </div>

          <p className="text-sm">{props.highlight.comment}</p>

          {props.highlight.suggestedText && (
            <div className="rounded bg-secondary p-2 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Suggested replacement:</p>
              {props.highlight.suggestedText}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {props.canResolve && props.highlight.suggestedText && props.highlight.status === "open" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => props.onResolve("accepted")} disabled={props.isPending}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => props.onResolve("rejected")} disabled={props.isPending}>
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-1">
              {props.canEdit && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {(props.canEdit || props.canResolve) && (
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={props.onDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {props.mode === "view" && isEditing && (
        <div className="space-y-3">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[70px]" />
          <div className="flex items-center gap-2">
            <Checkbox id="suggest-edit-view" checked={suggestMode} onCheckedChange={(v) => setSuggestMode(!!v)} />
            <Label htmlFor="suggest-edit-view" className="text-sm font-normal cursor-pointer">
              Suggest a replacement
            </Label>
          </div>
          {suggestMode && (
            <Textarea
              placeholder="Replace with..."
              value={suggestedText}
              onChange={(e) => setSuggestedText(e.target.value)}
              className="min-h-[60px]"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!comment.trim() || props.isPending}
              onClick={() => {
                props.onSave({
                  comment: comment.trim(),
                  suggestedText: suggestMode ? suggestedText.trim() : undefined,
                });
                setIsEditing(false);
              }}
            >
              {props.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
