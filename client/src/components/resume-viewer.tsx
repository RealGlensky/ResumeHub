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

            <div className="flex-1 overflow-auto bg-muted rounded-lg">
              <object
                data={resume.fileUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <iframe
                  src={resume.fileUrl}
                  className="w-full h-full border-0"
                  title={`PDF viewer for ${resume.title}`}
                >
                  <p>
                    Your browser doesn't support embedded PDFs.
                    <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer">
                      Click here to download the PDF
                    </a>
                  </p>
                </iframe>
              </object>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}