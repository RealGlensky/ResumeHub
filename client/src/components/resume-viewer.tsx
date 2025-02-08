import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Download, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentSection } from "./comment-section";
import type { Resume } from "@db/schema";
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
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
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Get the absolute URL for the resume file
  const fileUrl = resume.fileUrl.startsWith('http') 
    ? resume.fileUrl 
    : `${window.location.origin}${resume.fileUrl}`;

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setLoadError(false);

        // First fetch the PDF file as an array buffer
        const response = await fetch(fileUrl);
        const pdfData = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);

        // Pre-render all pages
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

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoadError(true);
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [isOpen, fileUrl]);

  // Update canvas refs array when numPages changes
  useEffect(() => {
    canvasRefs.current = Array(numPages).fill(null);
  }, [numPages]);

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
        }}
      >
        <FileText className="h-4 w-4" />
        View Resume
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh]">
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
                  Failed to load PDF. Please try downloading it directly.
                </div>
              ) : (
                <>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="w-full h-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
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