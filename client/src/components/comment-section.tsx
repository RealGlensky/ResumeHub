import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, CornerDownRight } from "lucide-react";
import type { Comment } from "@db/schema";
import { useState } from "react";

type FormData = {
  content: string;
};

type ThreadedComment = Comment & {
  replies?: ThreadedComment[];
};

function CommentForm({ onSubmit, placeholder = "Add a comment..." }: {
  onSubmit: (data: FormData) => void;
  placeholder?: string;
}) {
  const form = useForm<FormData>();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          onSubmit(data);
          form.reset();
        })}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder={placeholder}
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
        >
          Post Comment
        </Button>
      </form>
    </Form>
  );
}

function CommentItem({ comment, onReply }: {
  comment: ThreadedComment;
  onReply: (parentId: number, data: FormData) => void;
}) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className="space-y-2">
      <div className="p-3 bg-secondary rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">
            {comment.userId === user?.id ? "You" : "User"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Reply
          </Button>
        </div>
        <div className="text-sm">{comment.content}</div>
      </div>

      {showReplyForm && (
        <div className="ml-8">
          <CommentForm
            onSubmit={(data) => {
              onReply(comment.id, data);
              setShowReplyForm(false);
            }}
            placeholder="Write a reply..."
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2">
              <CornerDownRight className="h-4 w-4 mt-3 text-muted-foreground" />
              <div className="flex-1">
                <CommentItem comment={reply} onReply={onReply} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ resumeId }: { resumeId: string }) {
  const { user } = useAuth();

  const { data: comments = [] } = useQuery<ThreadedComment[]>({
    queryKey: [`/api/resumes/${resumeId}/comments`],
  });

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: number }) => {
      const res = await apiRequest(
        "POST",
        `/api/resumes/${resumeId}/comments`,
        { content, parentId }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resumeId}/comments`] });
    },
  });

  const handleComment = (data: FormData) => {
    commentMutation.mutate({ content: data.content });
  };

  const handleReply = (parentId: number, data: FormData) => {
    commentMutation.mutate({ content: data.content, parentId });
  };

  return (
    <div className="space-y-6">
      <CommentForm onSubmit={handleComment} />

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={handleReply}
          />
        ))}
      </div>
    </div>
  );
}