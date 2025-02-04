import { useState, useEffect } from "react";
import { Document, Page } from "react-pdf";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Resume } from "@db/schema";

// Configure PDF.js worker
import { pdfjs } from 'react-pdf';

// Use a CDN-hosted worker file for better compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface ResumeViewerProps {
  resume: Resume;
  mode: "share" | "create";
}

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset states when dialog opens
    if (isOpen) {
      setError(null);
      setIsLoading(true);
      setPageNumber(1);
    }
  }, [isOpen]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
    setIsLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setError("Failed to load PDF. Please try refreshing the page or using a different browser.");
    setIsLoading(false);
  }

  function changePage(offset: number) {
    setPageNumber((prevPage) => {
      const nextPage = prevPage + offset;
      if (numPages === null) return prevPage;
      if (nextPage < 1) return 1;
      if (nextPage > numPages) return numPages;
      return nextPage;
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setIsOpen(true)}
      >
        <Maximize2 className="h-4 w-4 mr-2" />
        View Resume
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh]">
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{resume.title}</h2>
              <div className="flex items-center gap-2">
                {numPages && (
                  <div className="text-sm text-muted-foreground">
                    Page {pageNumber} of {numPages}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(-1)}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(1)}
                  disabled={!numPages || pageNumber >= numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-muted rounded-lg p-4">
              {error ? (
                <div className="flex items-center justify-center h-full text-destructive">
                  {error}
                </div>
              ) : (
                <Document
                  file={resume.fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Loading PDF...
                    </div>
                  }
                  className="flex justify-center"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Loading PDF...
                    </div>
                  ) : (
                    <Page
                      pageNumber={pageNumber}
                      renderAnnotationLayer={mode === "create"}
                      renderTextLayer={mode === "create"}
                      className="shadow-lg"
                      loading={
                        <div className="flex items-center justify-center p-4">
                          Loading page...
                        </div>
                      }
                    />
                  )}
                </Document>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}