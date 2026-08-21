import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Download, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentSection } from "./comment-section";
import type { Resume } from "@db/schema";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from "mammoth";
import { cn } from "@/lib/utils";

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

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Get the absolute URL for the resume file
  const fileUrl = resume.fileUrl.startsWith('http')
    ? resume.fileUrl
    : `${window.location.origin}${resume.fileUrl}`;

  const isDocx = fileUrl.toLowerCase().endsWith('.docx');

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

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
        // Size the ref array before the canvases mount, so the ref
        // callbacks below aren't clobbered by a later reset.
        canvasRefs.current = Array(pdf.numPages).fill(null);
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

  // Render PDF pages once the canvas elements have actually mounted
  useEffect(() => {
    if (isDocx || isLoading || loadError || !pdfDocRef.current) return;

    const renderPages = async () => {
      const pdf = pdfDocRef.current!;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRefs.current[pageNum - 1];

        if (canvas) {
          const viewport = page.getViewport({ scale: 1.5 });
          const context = canvas.getContext('2d');

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;
        }
      }
    };

    renderPages();
  }, [isDocx, isLoading, loadError, numPages]);

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
          if (!open) setIsFullscreen(false);
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

          <div className="flex-1 overflow-y-auto bg-muted rounded-lg relative mt-4">
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
                      className={cn(
                        "prose prose-sm max-w-3xl mx-auto bg-white p-8 shadow-lg",
                        isFullscreen ? "cursor-zoom-out" : "cursor-zoom-in"
                      )}
                      onClick={() => setIsFullscreen((prev) => !prev)}
                      title={isFullscreen ? "Click to shrink" : "Click to expand"}
                      dangerouslySetInnerHTML={{ __html: docxHtml ?? "" }}
                    />
                  ) : (
                    <div
                      className={cn("space-y-4", isFullscreen ? "cursor-zoom-out" : "cursor-zoom-in")}
                      onClick={() => setIsFullscreen((prev) => !prev)}
                      title={isFullscreen ? "Click to shrink" : "Click to expand"}
                    >
                      {Array.from({ length: numPages }, (_, i) => (
                        <div key={i} className="flex justify-center">
                          <canvas
                            ref={el => canvasRefs.current[i] = el}
                            className="shadow-lg"
                          />
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
    </>
  );
}