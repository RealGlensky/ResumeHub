import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, AlertCircle, FileText } from "lucide-react";
import type { Resume } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface ResumeViewerProps {
  resume: Resume;
  mode: "share" | "create";
}

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Check if the URL is a data URL or an external URL
  const viewerUrl = resume.fileUrl.startsWith('data:')
    ? resume.fileUrl
    : `https://mozilla.github.io/pdf.js/legacy/web/viewer.html?file=${encodeURIComponent(resume.fileUrl)}`;

  const handleIframeLoad = () => {
    setIsLoading(false);
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
        }}
      >
        <FileText className="h-4 w-4" />
        View Resume
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh]">
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {resume.title}
              </h2>
            </div>

            <div className="flex-1 overflow-hidden bg-muted rounded-lg relative">
              {loadError ? (
                <div className="flex items-center justify-center h-full p-4 text-destructive gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Failed to load PDF. Please try downloading it directly.
                </div>
              ) : (
                <>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <Skeleton className="w-full h-full" />
                    </div>
                  )}
                  <iframe
                    src={viewerUrl}
                    className="w-full h-full border-0"
                    title={`PDF viewer for ${resume.title}`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals"
                    onError={() => {
                      setLoadError(true);
                      setIsLoading(false);
                    }}
                    onLoad={handleIframeLoad}
                    loading="lazy"
                  />
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}