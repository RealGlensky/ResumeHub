import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { JobOfferForm } from "./job-offer-form";
import { CommentSection } from "./comment-section";
import { ResumeViewer } from "./resume-viewer";
import { Share2, FileText, Briefcase } from "lucide-react";
import type { Resume } from "@db/schema";
import { useQuery } from "@tanstack/react-query";
import type { JobOffer } from "@db/schema";

export function ResumeCard({ resume }: { resume: Resume }) {
  const [activeTab, setActiveTab] = useState<"offers" | "comments">("offers");
  const { data: jobOffers = [] } = useQuery<JobOffer[]>({
    queryKey: [`/api/resumes/${resume.id}/offers`],
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold">{resume.title}</CardTitle>
          <Button variant="ghost" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
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