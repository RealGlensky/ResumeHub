
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Download } from "lucide-react";
import type { Resume } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ResumeViewerProps {
  resume: Resume;
  mode: "share" | "create";
}

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

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

        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        
        setNumPages(pdf.numPages);
        canvasRefs.current = Array(pdf.numPages).fill(null);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const canvas = canvasRefs.current[pageNum - 1];
          
          if (canvas) {
            const viewport = page.getViewport({ scale: 1.5 });
            const context = canvas.getContext('2d');
            
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              
              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;
            }
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
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogTitle>

          <div className="flex-1 overflow-y-auto bg-muted rounded-lg relative mt-4 p-4">
            {loadError ? (
              <div className="flex items-center justify-center h-full p-4 text-destructive gap-2">
                <AlertCircle className="h-5 w-5" />
                Failed to load PDF. Please try downloading it directly.
              </div>
            ) : isLoading ? (
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
