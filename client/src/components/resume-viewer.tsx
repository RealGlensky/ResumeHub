import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Resume } from "@db/schema";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ResumeViewerProps {
  resume: Resume;
  mode: "share" | "create";
}

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
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
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
                  disabled={!numPages || pageNumber >= numPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-muted rounded-lg p-4">
              <Document
                file={resume.fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                className="flex justify-center"
              >
                <Page
                  pageNumber={pageNumber}
                  renderAnnotationLayer={mode === "create"}
                  renderTextLayer={mode === "create"}
                  className="shadow-lg"
                />
              </Document>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
