import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Download, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentSection } from "./comment-section";
import { HighlightPopover, type HighlightWithAuthor } from "./highlight-popover";
import type { Resume } from "@db/schema";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from "mammoth";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSelectionOffsets, clearHighlightMarks, applyHighlightMarks } from "@/lib/text-highlighting";

// Configure worker
const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface ResumeViewerProps {
  resume: Resume;
  mode: "share" | "collaborate";
}

interface PendingSelection {
  pageNumber: number | null;
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
}

interface ViewingHighlight {
  highlight: HighlightWithAuthor;
  x: number;
  y: number;
}

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [viewingHighlight, setViewingHighlight] = useState<ViewingHighlight | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const textLayerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const docxContentRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const isOwner = user?.id === resume.userId;
  const canAnnotate = isOwner || mode === "collaborate";

  // Get the absolute URL for the resume file
  const fileUrl = resume.fileUrl.startsWith('http')
    ? resume.fileUrl
    : `${window.location.origin}${resume.fileUrl}`;

  const isDocx = fileUrl.toLowerCase().endsWith('.docx');

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  const { data: highlightList = [] } = useQuery<HighlightWithAuthor[]>({
    queryKey: [`/api/resumes/${resume.id}/highlights`],
    enabled: isOpen && canAnnotate,
  });

  const createHighlight = useMutation({
    mutationFn: async (data: { pageNumber: number | null; startOffset: number; endOffset: number; quotedText: string; comment: string; suggestedText?: string }) => {
      return apiRequest("POST", `/api/resumes/${resume.id}/highlights`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resume.id}/highlights`] });
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();
    },
  });

  const editHighlight = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; comment: string; suggestedText?: string }) => {
      return apiRequest("PATCH", `/api/resumes/${resume.id}/highlights/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resume.id}/highlights`] });
      setViewingHighlight(null);
    },
  });

  const resolveHighlight = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "accepted" | "rejected" | "open" }) => {
      return apiRequest("PATCH", `/api/resumes/${resume.id}/highlights/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resume.id}/highlights`] });
      setViewingHighlight(null);
    },
  });

  const deleteHighlight = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/resumes/${resume.id}/highlights/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resume.id}/highlights`] });
      setViewingHighlight(null);
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const loadDocx = async () => {
      try {
        setIsLoading(true);
        setLoadError(false);

        const response = await fetch(fileUrl);
        const docxData = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: docxData });
        setDocxHtml(result.value);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading DOCX:', error);
        setLoadError(true);
        setIsLoading(false);
      }
    };

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setLoadError(false);

        // First fetch the PDF file as an array buffer
        const response = await fetch(fileUrl);
        const pdfData = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        // Size the ref arrays before the canvases mount, so the ref
        // callbacks below aren't clobbered by a later reset.
        canvasRefs.current = Array(pdf.numPages).fill(null);
        textLayerRefs.current = Array(pdf.numPages).fill(null);
        setNumPages(pdf.numPages);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoadError(true);
        setIsLoading(false);
      }
    };

    if (isDocx) {
      loadDocx();
    } else {
      loadPDF();
    }
  }, [isOpen, fileUrl, isDocx]);

  // Render PDF pages -- and their selectable text-layer overlay -- once the
  // canvas/text-layer elements have actually mounted.
  useEffect(() => {
    if (isDocx || isLoading || loadError || !pdfDocRef.current) return;

    const renderPages = async () => {
      const pdf = pdfDocRef.current!;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRefs.current[pageNum - 1];
        const textLayerDiv = textLayerRefs.current[pageNum - 1];

        if (canvas) {
          const viewport = page.getViewport({ scale: 1.5 });
          const context = canvas.getContext('2d');

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;

          if (textLayerDiv) {
            textLayerDiv.replaceChildren();
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.height = `${viewport.height}px`;
            const textContent = await page.getTextContent();
            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
            });
            await textLayer.render();
          }
        }
      }
    };

    renderPages();
  }, [isDocx, isLoading, loadError, numPages]);

  // Re-apply highlight marks whenever the highlight list changes
  useEffect(() => {
    if (!canAnnotate || isLoading || loadError) return;

    if (isDocx) {
      const container = docxContentRef.current;
      if (!container) return;
      clearHighlightMarks(container);
      applyHighlightMarks(
        container,
        highlightList.map((h) => ({ id: h.id, start: h.startOffset, end: h.endOffset }))
      );
      container.querySelectorAll<HTMLElement>('mark[data-highlight-id]').forEach((mark) => {
        const highlight = highlightList.find((h) => String(h.id) === mark.dataset.highlightId);
        if (highlight) mark.dataset.status = highlight.status;
      });
    } else {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const container = textLayerRefs.current[pageNum - 1];
        if (!container) continue;
        clearHighlightMarks(container);
        const pageHighlights = highlightList.filter((h) => h.pageNumber === pageNum);
        applyHighlightMarks(
          container,
          pageHighlights.map((h) => ({ id: h.id, start: h.startOffset, end: h.endOffset }))
        );
        container.querySelectorAll<HTMLElement>('mark[data-highlight-id]').forEach((mark) => {
          const highlight = pageHighlights.find((h) => String(h.id) === mark.dataset.highlightId);
          if (highlight) mark.dataset.status = highlight.status;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightList, isDocx, isLoading, loadError, numPages, docxHtml]);

  const handleMouseUp = () => {
    if (!canAnnotate || isDocx === undefined) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (isDocx) {
      const container = docxContentRef.current;
      if (!container) return;
      const offsets = getSelectionOffsets(container);
      if (!offsets) return;
      const rect = range.getBoundingClientRect();
      setPendingSelection({ pageNumber: null, start: offsets.start, end: offsets.end, text: offsets.text, x: rect.right, y: rect.bottom });
      return;
    }

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const container = textLayerRefs.current[pageNum - 1];
      if (!container || !container.contains(range.startContainer)) continue;
      const offsets = getSelectionOffsets(container);
      if (!offsets) return;
      const rect = range.getBoundingClientRect();
      setPendingSelection({ pageNumber: pageNum, start: offsets.start, end: offsets.end, text: offsets.text, x: rect.right, y: rect.bottom });
      return;
    }
  };

  const handleContentClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const mark = target.closest<HTMLElement>('mark[data-highlight-id]');

    if (mark) {
      event.stopPropagation();
      const highlight = highlightList.find((h) => String(h.id) === mark.dataset.highlightId);
      if (highlight) {
        const rect = mark.getBoundingClientRect();
        setViewingHighlight({ highlight, x: rect.right, y: rect.bottom });
      }
      return;
    }

    // Don't toggle fullscreen if the user just finished dragging a text selection
    if (window.getSelection()?.toString()) return;

    setIsFullscreen((prev) => !prev);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full flex items-center gap-2"
        onClick={() => {
          setIsOpen(true);
          setIsLoading(true);
          setLoadError(false);
          setIsFullscreen(false);
        }}
      >
        <FileText className="h-4 w-4" />
        View Resume
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setIsFullscreen(false);
            setPendingSelection(null);
            setViewingHighlight(null);
          }
        }}
      >
        <DialogContent
          className={cn(
            "flex flex-col",
            isFullscreen
              ? "max-w-none w-screen h-screen top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none"
              : "max-w-4xl w-full h-[90vh]"
          )}
        >
          <DialogTitle className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {resume.title}
            </span>
            <div className="flex items-center gap-2">
              {mode === "collaborate" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showComments ? "Hide Comments" : "Show Comments"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>

          {canAnnotate && (
            <p className="text-xs text-muted-foreground -mt-2">
              Select text to leave a comment or suggest an edit.
            </p>
          )}

          <div className="flex-1 overflow-y-auto bg-muted rounded-lg relative mt-2" onMouseUp={handleMouseUp}>
            <div className="p-4">
              {loadError ? (
                <div className="flex items-center justify-center h-full p-4 text-destructive gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Failed to load document. Please try downloading it directly.
                </div>
              ) : (
                <>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="w-full h-full" />
                    </div>
                  ) : isDocx ? (
                    <div
                      ref={docxContentRef}
                      className={cn(
                        "prose prose-sm max-w-3xl mx-auto bg-white p-8 shadow-lg",
                        isFullscreen ? "cursor-zoom-out" : "cursor-zoom-in"
                      )}
                      onClick={handleContentClick}
                      title={isFullscreen ? "Click to shrink" : "Click to expand"}
                      dangerouslySetInnerHTML={{ __html: docxHtml ?? "" }}
                    />
                  ) : (
                    <div
                      className={cn("space-y-4", isFullscreen ? "cursor-zoom-out" : "cursor-zoom-in")}
                      onClick={handleContentClick}
                      title={isFullscreen ? "Click to shrink" : "Click to expand"}
                    >
                      {Array.from({ length: numPages }, (_, i) => (
                        <div key={i} className="flex justify-center">
                          <div className="relative shadow-lg">
                            <canvas ref={el => canvasRefs.current[i] = el} />
                            <div ref={el => textLayerRefs.current[i] = el} className="textLayer" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {mode === "collaborate" && showComments && (
              <div className="border-t bg-background p-4">
                <CommentSection
                  resumeId={resume.id}
                  resumeUserId={resume.userId}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {pendingSelection && (
        <HighlightPopover
          mode="create"
          position={{ x: pendingSelection.x, y: pendingSelection.y }}
          quotedText={pendingSelection.text}
          isPending={createHighlight.isPending}
          onCancel={() => {
            setPendingSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          onSubmit={({ comment, suggestedText }) =>
            createHighlight.mutate({
              pageNumber: pendingSelection.pageNumber,
              startOffset: pendingSelection.start,
              endOffset: pendingSelection.end,
              quotedText: pendingSelection.text,
              comment,
              suggestedText,
            })
          }
        />
      )}

      {viewingHighlight && (
        <HighlightPopover
          mode="view"
          position={{ x: viewingHighlight.x, y: viewingHighlight.y }}
          highlight={viewingHighlight.highlight}
          canEdit={viewingHighlight.highlight.userId === user?.id}
          canResolve={isOwner}
          isPending={editHighlight.isPending || resolveHighlight.isPending || deleteHighlight.isPending}
          onClose={() => setViewingHighlight(null)}
          onSave={({ comment, suggestedText }) =>
            editHighlight.mutate({ id: viewingHighlight.highlight.id, comment, suggestedText })
          }
          onDelete={() => deleteHighlight.mutate(viewingHighlight.highlight.id)}
          onResolve={(status) => resolveHighlight.mutate({ id: viewingHighlight.highlight.id, status })}
        />
      )}
    </>
  );
}
