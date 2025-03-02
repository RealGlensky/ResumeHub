import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { JobOfferForm } from "./job-offer-form";
import { CommentSection } from "./comment-section";
import { ResumeViewer } from "./resume-viewer";
import { Share2, FileText, Briefcase, UserPlus, MessageSquare, Trash2, EyeOff } from "lucide-react";
import type { Resume } from "@db/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { JobOffer } from "@db/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ResumeCardProps {
  resume: Resume;
  user?: { id: number; username: string };
  ownerName?: string;
  ownerInfo?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  };
}

function ResumeCard({ resume, user, ownerName, ownerInfo }: ResumeCardProps) {
  const [activeTab, setActiveTab] = useState<"offers" | "comments">("offers");
  const { data: jobOffers = [] } = useQuery<JobOffer[]>({ 
    queryKey: [`/api/resumes/${resume.id}/offers`],
  });

  const deleteResume = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/resumes/${resume.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/resumes/${resume.id}/visibility`, {
        isVisible: !resume.isPublic
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
  });

  const sendInvitation = useMutation({
    mutationFn: async (receiverId: number) => {
      return apiRequest("POST", "/api/network/invite", { receiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
    },
  });

  const toggleMode = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/resumes/${resume.id}/mode`, {
        mode: resume.mode === 'share' ? 'collaborate' : 'share'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
  });

  const isOwner = user?.id === resume.userId;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold">{resume.title}</CardTitle>
            {ownerName && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {ownerInfo?.profilePictureUrl ? (
                    <AvatarImage
                      src={ownerInfo.profilePictureUrl}
                      alt={ownerInfo.username}
                      className="aspect-square h-full w-full"
                    />
                  ) : (
                    <AvatarFallback>
                      {ownerInfo?.firstName?.charAt(0)}
                      {ownerInfo?.lastName?.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <p className="text-sm text-muted-foreground">
                  Uploaded by {ownerName}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle>Delete Resume</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this resume? This action cannot be undone.
                    </DialogDescription>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="destructive"
                        onClick={() => deleteResume.mutate()}
                        disabled={deleteResume.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {user && user.id !== resume.userId && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Connect with {ownerName || "user"}</DialogTitle>
                  <DialogDescription>
                    Send a connection request to view and share resumes
                  </DialogDescription>
                  <Button
                    onClick={() => sendInvitation.mutate(resume.userId)}
                    disabled={sendInvitation.isPending}
                  >
                    Send Connection Request
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium">Resume Visibility</h4>
                <p className="text-sm text-muted-foreground">
                  {resume.isPublic ? 'Visible to connections' : 'Hidden from connections'}
                </p>
              </div>
              <Switch
                checked={resume.isPublic}
                onCheckedChange={() => toggleVisibility.mutate()}
                disabled={toggleVisibility.isPending}
              />
            </div>

            <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium">Resume Mode</h4>
                <p className="text-sm text-muted-foreground">
                  {resume.mode === 'share' ? 'Share Mode - Others can only view' : 'Collaborate Mode - Others can comment'}
                </p>
              </div>
              <Switch
                checked={resume.mode === 'collaborate'}
                onCheckedChange={() => toggleMode.mutate()}
                disabled={toggleMode.isPending}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <ResumeViewer
            resume={resume}
            mode={resume.mode === 'collaborate' ? 'collaborate' : 'share'}
          />

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={activeTab === "offers" ? "bg-secondary" : ""}
              onClick={() => setActiveTab("offers")}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Job Offers ({jobOffers.length})
            </Button>
            {(isOwner || resume.mode === 'collaborate') && (
              <Button
                variant="ghost"
                size="sm"
                className={activeTab === "comments" ? "bg-secondary" : ""}
                onClick={() => setActiveTab("comments")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
              </Button>
            )}
          </div>

          {activeTab === "offers" ? (
            <div className="space-y-4">
              {isOwner && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      Add Job Offer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <JobOfferForm resumeId={resume.id} />
                  </DialogContent>
                </Dialog>
              )}

              <div className="space-y-2">
                {jobOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-3 bg-secondary rounded-lg"
                  >
                    <div className="font-medium">{offer.company}</div>
                    <div className="text-sm text-muted-foreground">
                      {offer.position}
                    </div>
                    <div className="text-sm text-primary mt-1">
                      Status: {offer.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            (isOwner || resume.mode === 'collaborate') && (
              <CommentSection 
                resumeId={resume.id} 
                resumeUserId={resume.userId}
              />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { ResumeCard };
export default ResumeCard;