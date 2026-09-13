import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Trash2 } from "lucide-react";
import { CommentForm, CommentSection } from "./comment-section";
import type { Highlight } from "@db/schema";

interface Position {
  x: number;
  y: number;
}

type HighlightPopoverProps =
  | {
      mode: "create";
      position: Position;
      quotedText: string;
      onSubmit: (data: { comment: string; suggestedText?: string; isAnonymous?: boolean }) => void;
      onCancel: () => void;
      isPending: boolean;
    }
  | {
      mode: "view";
      position: Position;
      highlight: Highlight & { color: string };
      resumeId: string;
      resumeUserId: number;
      canResolve: boolean;
      canDeleteHighlight: boolean;
      isPending: boolean;
      onClose: () => void;
      onDeleteHighlight: () => void;
      onResolve: (status: "accepted" | "rejected" | "open") => void;
    };

function clampPosition(pos: Position, width = 340, height = 300) {
  const x = Math.min(Math.max(pos.x, 12), window.innerWidth - width - 12);
  const y = Math.min(Math.max(pos.y, 12), window.innerHeight - height - 12);
  return { x, y };
}

export function HighlightPopover(props: HighlightPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (props.mode === "create") props.onCancel();
        else props.onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = clampPosition(props.position);

  return (
    <div
      ref={containerRef}
      className="fixed z-[100] w-[340px] max-h-[80vh] overflow-y-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      {props.mode === "create" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-2">"{props.quotedText}"</p>
          <CommentForm
            placeholder="Leave a comment..."
            showSuggestField
            submitLabel={props.isPending ? "Saving..." : "Add"}
            onSubmit={({ content, suggestedText, isAnonymous }) =>
              props.onSubmit({ comment: content, suggestedText, isAnonymous })
            }
          />
          <Button variant="outline" size="sm" className="w-full" onClick={props.onCancel}>
            Cancel
          </Button>
        </div>
      )}

      {props.mode === "view" && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground line-clamp-2">"{props.highlight.quotedText}"</p>
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

          {props.canResolve && props.highlight.status === "open" && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => props.onResolve("accepted")} disabled={props.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => props.onResolve("rejected")} disabled={props.isPending}>
                <X className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}

          <CommentSection
            resumeId={props.resumeId}
            resumeUserId={props.resumeUserId}
            highlightId={props.highlight.id}
            showSuggestField
          />

          <div className="flex justify-between border-t pt-2">
            {props.canDeleteHighlight ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={props.onDeleteHighlight}
                disabled={props.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete highlight
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" variant="ghost" onClick={props.onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
