import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ReplaceResumeFileProps {
  resumeId: string;
  onDone?: () => void;
}

export function ReplaceResumeFile({ resumeId, onDone }: ReplaceResumeFileProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const replaceMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress((event.loaded / event.total) * 100);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(new Error("Failed to replace file"));
          }
        };

        xhr.onerror = () => reject(new Error("Failed to replace file"));

        xhr.open("PATCH", `/api/resumes/${resumeId}/file`, true);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
      setUploadProgress(0);
      toast({
        title: "Success",
        description: "Resume file replaced successfully",
      });
      onDone?.();
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Error",
        description: error.message || "Failed to replace resume file",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_FILE_SIZE) {
      setError("File size must be less than 5MB");
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  };

  return (
    <div className="p-4">
      <DialogHeader>
        <DialogTitle>Replace Resume File</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-4">
        <div className="space-y-2">
          <Input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
          <p className="text-sm text-muted-foreground">
            Uploading a new file keeps this resume's comments, job offers, and settings intact.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {uploadProgress > 0 && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-muted-foreground text-center">
              Uploading: {Math.round(uploadProgress)}%
            </p>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!file || replaceMutation.isPending}
          onClick={() => replaceMutation.mutate()}
        >
          {replaceMutation.isPending ? (
            "Replacing..."
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Replace File
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
