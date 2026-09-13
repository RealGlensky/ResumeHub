import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, CornerDownRight, Pencil, Trash2 } from "lucide-react";
import type { Comment } from "@db/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type FormData = {
  content: string;
  suggestedText?: string;
  isAnonymous?: boolean;
};

export type ThreadedComment = Comment & {
  username: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
  replies?: ThreadedComment[];
};

export function CommentForm({ onSubmit, placeholder = "Add a comment...", defaultValue = "", defaultSuggestedText = "", defaultAnonymous = false, showSuggestField = false, submitLabel }: {
  onSubmit: (data: FormData) => void;
  placeholder?: string;
  defaultValue?: string;
  defaultSuggestedText?: string;
  defaultAnonymous?: boolean;
  showSuggestField?: boolean;
  submitLabel?: string;
}) {
  const [suggestMode, setSuggestMode] = useState(!!defaultSuggestedText);
  const form = useForm<FormData>({
    defaultValues: {
      content: defaultValue,
      suggestedText: defaultSuggestedText,
      isAnonymous: defaultAnonymous,
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          onSubmit({ ...data, suggestedText: suggestMode ? data.suggestedText : undefined });
          form.reset();
          setSuggestMode(false);
        })}
        className="space-y-3"
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

        {showSuggestField && (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`suggest-${placeholder}`}
                checked={suggestMode}
                onCheckedChange={(v) => setSuggestMode(!!v)}
              />
              <Label htmlFor={`suggest-${placeholder}`} className="text-sm font-normal cursor-pointer">
                Suggest a replacement
              </Label>
            </div>
            {suggestMode && (
              <FormField
                control={form.control}
                name="suggestedText"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Replace with..." className="resize-none" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="isAnonymous"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`anon-${placeholder}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor={`anon-${placeholder}`} className="text-sm font-normal cursor-pointer">
                  Post anonymously
                </Label>
              </div>
            )}
          />
          <Button type="submit" size="sm">
            {submitLabel ?? (defaultValue ? "Save Changes" : "Post Comment")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CommentItem({ comment, onReply, onEdit, isResumeOwner }: {
  comment: ThreadedComment;
  onReply: (parentId: number, data: FormData) => void;
  onEdit: (commentId: number, data: FormData) => void;
  isResumeOwner: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwnComment = comment.userId === user?.id;
  // The server already masks identity fields to null for anonymous comments
  // the viewer isn't entitled to see -- trust that rather than re-deciding here.
  const isAnonymousToViewer = comment.username === null;

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "DELETE",
        `/api/resumes/${comment.resumeId}/comments/${comment.id}`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${comment.resumeId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${comment.resumeId}/highlights`] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const displayName = isOwnComment
    ? "You"
    : isAnonymousToViewer
      ? "Anonymous"
      : comment.username;

  const canDelete = isOwnComment || isResumeOwner;

  return (
    <div className="space-y-2">
      <div className="p-3 bg-secondary rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {comment.profilePictureUrl ? (
                <AvatarImage src={comment.profilePictureUrl} alt={displayName ?? "User"} />
              ) : (
                <AvatarFallback className="bg-gray-200 text-gray-700 text-xs uppercase">
                  {isAnonymousToViewer ? "?" : `${comment.firstName?.charAt(0) ?? ""}${comment.lastName?.charAt(0) ?? ""}`}
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
            {canDelete && (
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Delete Comment</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this comment? This action cannot be undone.
                  </DialogDescription>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteCommentMutation.mutate()}
                      disabled={deleteCommentMutation.isPending}
                    >
                      {deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
            defaultSuggestedText={comment.suggestedText ?? ""}
            defaultAnonymous={!!comment.isAnonymous}
            showSuggestField={comment.highlightId != null}
            placeholder="Edit your comment..."
            submitLabel="Save Changes"
          />
        ) : (
          <>
            <div className="text-sm">{comment.content}</div>
            {comment.suggestedText && (
              <div className="mt-2 rounded bg-background p-2 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Suggested replacement:</p>
                {comment.suggestedText}
              </div>
            )}
          </>
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
          {comment.replies.map((reply: ThreadedComment) => (
            <div key={reply.id} className="flex items-start gap-2">
              <CornerDownRight className="h-4 w-4 mt-3 text-muted-foreground" />
              <div className="flex-1">
                <CommentItem
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  isResumeOwner={isResumeOwner}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentSectionProps {
  resumeId: string;
  resumeUserId: number;
  highlightId?: number;
  showSuggestField?: boolean;
}

export function CommentSection({ resumeId, resumeUserId, highlightId, showSuggestField }: CommentSectionProps) {
  const { user } = useAuth();

  const queryKey = highlightId
    ? [`/api/resumes/${resumeId}/comments?highlightId=${highlightId}`]
    : [`/api/resumes/${resumeId}/comments`];

  const { data: comments = [] } = useQuery<ThreadedComment[]>({
    queryKey,
    enabled: !!user,
  });

  const isResumeOwner = user?.id === resumeUserId;

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId, suggestedText, isAnonymous }: FormData & { parentId?: number }) => {
      const res = await apiRequest(
        "POST",
        `/api/resumes/${resumeId}/comments`,
        { content, parentId, highlightId, suggestedText, isAnonymous }
      );
      return res.json();
    },
    onSuccess: (_, variables) => {
      trackEvent("comment_created", {
        kind: variables.parentId ? "reply" : "comment",
        is_resume_owner: isResumeOwner,
      });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content, suggestedText, isAnonymous }: FormData & { commentId: number }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/resumes/${resumeId}/comments/${commentId}`,
        { content, suggestedText, isAnonymous }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
  });

  const handleComment = (data: FormData) => {
    commentMutation.mutate(data);
  };

  const handleReply = (parentId: number, data: FormData) => {
    commentMutation.mutate({ ...data, parentId });
  };

  const handleEdit = (commentId: number, data: FormData) => {
    editCommentMutation.mutate({ ...data, commentId });
  };

  return (
    <div className="space-y-6">
      <CommentForm onSubmit={handleComment} showSuggestField={showSuggestField} />

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={handleReply}
            onEdit={handleEdit}
            isResumeOwner={isResumeOwner}
          />
        ))}
      </div>
    </div>
  );
}
