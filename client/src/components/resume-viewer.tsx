import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import type { Resume } from "@db/schema";

interface ResumeViewerProps {
  resume: Resume;
  mode: "share" | "create";
}

export function ResumeViewer({ resume, mode }: ResumeViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Check if the URL is a data URL or an external URL
  const viewerUrl = resume.fileUrl.startsWith('data:') 
    ? resume.fileUrl 
    : `https://mozilla.github.io/pdf.js/legacy/web/viewer.html?file=${encodeURIComponent(resume.fileUrl)}`;

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
            </div>

            <div className="flex-1 overflow-hidden bg-muted rounded-lg">
              {loadError ? (
                <div className="flex items-center justify-center h-full p-4 text-destructive">
                  Failed to load PDF. Please try downloading it directly.
                </div>
              ) : (
                <iframe
                  src={viewerUrl}
                  className="w-full h-full border-0"
                  title={`PDF viewer for ${resume.title}`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals"
                  onError={() => setLoadError(true)}
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}