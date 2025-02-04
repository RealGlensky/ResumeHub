import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type FormData = {
  title: string;
  file: File[];
  isPublic: boolean;
};

export function UploadResume() {
  const form = useForm<FormData>({
    defaultValues: {
      title: "",
      isPublic: false,
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // In a real app, we'd upload the file to a storage service
      // and get back a URL. For this demo, we'll create a fake URL
      const fakeFileUrl = `https://storage.example.com/${data.file[0].name}`;

      const res = await apiRequest("POST", "/api/resumes", {
        title: data.title,
        fileUrl: fakeFileUrl,
        isPublic: data.isPublic,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="My Resume v1" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="file"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>File</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files?.length) {
                        onChange(Array.from(files));
                      }
                    }}
                    {...field}
                  />
                </FormControl>
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

          <Button
            type="submit"
            className="w-full"
            disabled={uploadMutation.isPending}
          >
            Upload
          </Button>
        </form>
      </Form>
    </div>
  );
}