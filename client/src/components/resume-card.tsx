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
import { useToast } from "@/hooks/use-toast";

interface ResumeCardProps {
  resume: Resume;
  user?: { id: number; username: string };
  ownerName?: string;
}

function ResumeCard({ resume, user, ownerName }: ResumeCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"offers" | "comments">("offers");
  
  // Debug: Log resume data to check if accessType is populated
  console.log('Resume data:', resume);
  console.log('accessType:', resume.accessType);
  console.log('isOwner:', isOwner);
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
      setIsDeleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete resume",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Resume visibility updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update resume visibility",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: `Resume mode set to ${resume.mode === 'share' ? 'collaborate' : 'share'}`,
      });
    },
    onError: (error) => {
      console.error("Toggle mode error:", error);
      toast({
        title: "Error",
        description: "Failed to update resume mode. You may not have permission.",
        variant: "destructive",
      });
    },
  });
  
  const toggleAccess = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/resumes/${resume.id}/access`, {
        accessType: resume.accessType === 'connections' ? 'everyone' : 'connections'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
      toast({
        title: "Success",
        description: `Resume access set to ${resume.accessType === 'connections' ? 'everyone' : 'connections only'}`,
      });
    },
    onError: (error) => {
      console.error("Toggle access error:", error);
      toast({
        title: "Error",
        description: "Failed to update resume access. You may not have permission.",
        variant: "destructive",
      });
    },
  });

  const isOwner = user?.id === resume.userId;

  const deleteJobOfferMutation = useMutation({
    mutationFn: async (offerId: number) => {
      return apiRequest("DELETE", `/api/resumes/${resume.id}/offers/${offerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes/${resume.id}/offers`] });
      toast({
        title: "Success",
        description: "Job offer deleted successfully",
      });
      const dialogElement = document.querySelector('[role="dialog"]');
      if (dialogElement) {
        const closeButton = dialogElement.querySelector('button[type="button"]');
        if (closeButton) closeButton.click();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete job offer",
        variant: "destructive",
      });
    },
  });


  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold">{resume.title}</CardTitle>
            {ownerName && (
              <p className="text-sm text-muted-foreground">
                Uploaded by {ownerName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteResume.mutate()}
                        disabled={deleteResume.isPending}
                      >
                        {deleteResume.isPending ? "Deleting..." : "Delete"}
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
                checked={resume.isPublic ?? false}
                onCheckedChange={() => toggleVisibility.mutate()}
                disabled={toggleVisibility.isPending}
              />
            </div>

            <div className="flex items-center justify-between p-2 bg-secondary rounded-lg">
              <div className="space-y-1">
                <h4 className="font-medium">Resume Access</h4>
                <p className="text-sm text-muted-foreground">
                  {resume.accessType === 'everyone' ? 'Everyone can view' : 'Only your connections can view'}
                </p>
              </div>
              <Switch
                checked={resume.accessType === 'everyone'}
                onCheckedChange={() => toggleAccess.mutate()}
                disabled={toggleAccess.isPending}
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
                    className="p-3 bg-secondary rounded-lg flex justify-between items-start"
                  >
                    <div>
                      <div className="font-medium">{offer.company}</div>
                      <div className="text-sm text-muted-foreground">
                        {offer.position}
                      </div>
                      <div className="text-sm text-primary mt-1">
                        Status: {offer.status}
                      </div>
                    </div>
                    {isOwner && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogTitle>Delete Job Offer</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this job offer? This action cannot be undone.
                          </DialogDescription>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                const dialogElement = document.querySelector('[role="dialog"]');
                                if (dialogElement) {
                                  const closeButton = dialogElement.querySelector('button[type="button"]');
                                  if (closeButton) closeButton.click();
                                }
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                deleteJobOfferMutation.mutate(offer.id);
                              }}
                              disabled={deleteJobOfferMutation.isPending}
                            >
                              {deleteJobOfferMutation.isPending ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
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