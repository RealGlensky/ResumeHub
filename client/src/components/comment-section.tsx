import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Comment } from "@db/schema";

type FormData = {
  content: string;
};

export function CommentSection({ resumeId }: { resumeId: string }) {
  const { user } = useAuth();
  const form = useForm<FormData>();
  
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/resumes/${resumeId}/comments`],
  });

  const commentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest(
        "POST",
        `/api/resumes/${resumeId}/comments`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resumeId}/comments`] });
      form.reset();
    },
  });

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => commentMutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Add a comment..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button
            type="submit"
            size="sm"
            disabled={commentMutation.isPending}
          >
            Post Comment
          </Button>
        </form>
      </Form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="p-3 bg-secondary rounded-lg">
            <div className="font-medium mb-1">
              {comment.userId === user?.id ? "You" : "User"}
            </div>
            <div className="text-sm">{comment.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
