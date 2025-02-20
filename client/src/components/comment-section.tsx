import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, CornerDownRight, Pencil } from "lucide-react";
import type { Comment } from "@db/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type FormData = {
  content: string;
};

type ThreadedComment = Comment & {
  username: string;
  profilePictureUrl?: string;
  replies?: ThreadedComment[];
};

function CommentForm({ onSubmit, placeholder = "Add a comment...", defaultValue = "" }: {
  onSubmit: (data: FormData) => void;
  placeholder?: string;
  defaultValue?: string;
}) {
  const form = useForm<FormData>({
    defaultValues: {
      content: defaultValue
    }
  });

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
          {defaultValue ? "Save Changes" : "Post Comment"}
        </Button>
      </form>
    </Form>
  );
}

function CommentItem({ comment, onReply, onEdit, isResumeOwner, resumeUserId }: {
  comment: ThreadedComment;
  onReply: (parentId: number, data: FormData) => void;
  onEdit: (commentId: number, data: FormData) => void;
  isResumeOwner: boolean;
  resumeUserId: number;
}) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isOwnComment = comment.userId === user?.id;

  if (!isResumeOwner && !isOwnComment && comment.userId !== resumeUserId) {
    return null;
  }

  const displayName = isOwnComment
    ? "You"
    : comment.username;

  return (
    <div className="space-y-2">
      <div className="p-3 bg-secondary rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {comment.profilePictureUrl ? (
                <AvatarImage src={comment.profilePictureUrl} alt={displayName} />
              ) : (
                <AvatarFallback className="bg-gray-200 text-gray-700">
                  {displayName[0].toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="font-medium">
              {displayName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwnComment && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Reply
            </Button>
          </div>
        </div>
        {isEditing ? (
          <CommentForm
            onSubmit={(data) => {
              onEdit(comment.id, data);
              setIsEditing(false);
            }}
            defaultValue={comment.content}
            placeholder="Edit your comment..."
          />
        ) : (
          <div className="text-sm">{comment.content}</div>
        )}
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
          {comment.replies.map((reply: ThreadedComment) => {
            const isReplyFromResumeOwner = reply.userId === resumeUserId;
            const canSeeReply =
              isResumeOwner ||
              isOwnComment ||
              reply.userId === user?.id ||
              isReplyFromResumeOwner;

            if (!canSeeReply) {
              return null;
            }

            return (
              <div key={reply.id} className="flex items-start gap-2">
                <CornerDownRight className="h-4 w-4 mt-3 text-muted-foreground" />
                <div className="flex-1">
                  <CommentItem
                    comment={reply}
                    onReply={onReply}
                    onEdit={onEdit}
                    isResumeOwner={isResumeOwner}
                    resumeUserId={resumeUserId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ resumeId, resumeUserId }: { resumeId: string; resumeUserId: number }) {
  const { user } = useAuth();

  const { data: comments = [] } = useQuery<ThreadedComment[]>({
    queryKey: [`/api/resumes/${resumeId}/comments`],
    enabled: !!user, // Only fetch when user is logged in
  });

  const isResumeOwner = user?.id === resumeUserId;

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
      // Invalidate both the specific resume's comments and the resume itself
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resumeId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/resumes/${resumeId}/comments/${commentId}`,
        { content }
      );
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both the specific resume's comments and the resume itself
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resumeId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
  });

  const handleComment = (data: FormData) => {
    commentMutation.mutate({ content: data.content });
  };

  const handleReply = (parentId: number, data: FormData) => {
    commentMutation.mutate({ content: data.content, parentId });
  };

  const handleEdit = (commentId: number, data: FormData) => {
    editCommentMutation.mutate({ commentId, content: data.content });
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
            onEdit={handleEdit}
            isResumeOwner={isResumeOwner}
            resumeUserId={resumeUserId}
          />
        ))}
      </div>
    </div>
  );
}