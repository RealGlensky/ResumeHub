import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { JobOfferForm } from "./job-offer-form";
import { CommentSection } from "./comment-section";
import { ResumeViewer } from "./resume-viewer";
import { Share2, FileText, Briefcase, UserPlus } from "lucide-react";
import type { Resume } from "@db/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { JobOffer } from "@db/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";


export function ResumeCard({ resume, user }: { resume: Resume; user?: { id: number; username: string } }) {
  const [activeTab, setActiveTab] = useState<"offers" | "comments">("offers");
  const { data: jobOffers = [] } = useQuery<JobOffer[]>({
    queryKey: [`/api/resumes/${resume.id}/offers`],
  });

  const sendInvitation = useMutation({
    mutationFn: async (receiverId: number) => {
      return apiRequest("POST", "/api/network/invite", { receiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold">{resume.title}</CardTitle>
          {user && user.id !== resume.userId && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Connect with {user.username}</DialogTitle>
                <DialogDescription>
                  Send a connection request to view and share resumes
                </DialogDescription>
                <Button
                  onClick={() => sendInvitation.mutate(user.id)}
                  disabled={sendInvitation.isPending}
                >
                  Send Connection Request
                </Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ResumeViewer
            resume={resume}
            mode={activeTab === "comments" ? "create" : "share"}
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
            <Button
              variant="ghost"
              size="sm"
              className={activeTab === "comments" ? "bg-secondary" : ""}
              onClick={() => setActiveTab("comments")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Comments
            </Button>
          </div>

          {activeTab === "offers" ? (
            <div className="space-y-4">
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
            <CommentSection resumeId={resume.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}