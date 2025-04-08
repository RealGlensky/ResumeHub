import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, AlertCircle } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type FormData = {
  title: string;
  file: FileList;
  isPublic: boolean;
  accessType: "connections" | "everyone";
};

export function UploadResume() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const form = useForm<FormData>({
    defaultValues: {
      title: "",
      isPublic: false,
      accessType: "connections",
    }
  });

  const validateFileSize = (files: FileList) => {
    if (files[0]?.size > MAX_FILE_SIZE) {
      return "File size must be less than 5MB";
    }
    return true;
  };

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const file = data.file[0];
      if (!file) throw new Error("No file selected");

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", data.title);
      formData.append("isPublic", String(data.isPublic));
      formData.append("accessType", data.accessType);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open("POST", "/api/resumes", true);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      setUploadProgress(0);
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });
    },
    onError: (error) => {
      setUploadProgress(0);
      toast({
        title: "Error",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-4">
      <DialogHeader>
        <DialogTitle>Upload Resume</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => uploadMutation.mutate(data))}
          className="space-y-4 mt-4"
        >
          <FormField
            control={form.control}
            name="title"
            rules={{ required: "Title is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="My Resume v1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="file"
            rules={{ 
              required: "File is required",
              validate: validateFileSize
            }}
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>File</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files?.length) {
                          onChange(files);
                        }
                      }}
                      {...field}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum file size: 5MB
                    </p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Make Public</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accessType"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>Resume Access</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    {field.value === 'everyone' ? 'Everyone can view' : 'Only my connections can view'}
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value === 'everyone'}
                    onCheckedChange={(checked) => 
                      field.onChange(checked ? 'everyone' : 'connections')
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Uploading: {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              "Uploading..."
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}