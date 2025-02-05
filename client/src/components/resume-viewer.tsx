import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Download } from "lucide-react";
import type { Resume } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker with absolute path
const workerUrl = new URL('/pdf.worker.min.js', window.location.origin).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface ResumeViewerProps {
  resume: Resume;
  mode: "share" | "create";
}

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
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
        setLoadError(null);

        // Load the PDF document
        const pdf = await pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
          cMapPacked: true,
        }).promise;

        setNumPages(pdf.numPages);

        // Pre-render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const canvas = canvasRefs.current[pageNum - 1];

          if (canvas) {
            // Get the viewport at scale 1
            const viewport = page.getViewport({ scale: 1.0 });

            // Calculate scale to fit within a reasonable width
            const maxWidth = 800;
            const scale = maxWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            // Set canvas dimensions
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            const context = canvas.getContext('2d');
            if (!context) continue;

            // Render page
            await page.render({
              canvasContext: context,
              viewport: scaledViewport,
            }).promise;
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load PDF');
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
          setLoadError(null);
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
                {loadError}. Please try downloading it directly.
              </div>
            ) : (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="w-full h-[800px]" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from({ length: numPages }, (_, i) => (
                      <div key={i} className="flex justify-center bg-white rounded-lg shadow-lg p-4">
                        <canvas
                          ref={el => canvasRefs.current[i] = el}
                          className="max-w-full"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}