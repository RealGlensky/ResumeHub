import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, UserPlus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ResumeCard } from "@/components/resume-card";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedResume {
  id: string;
  title: string;
  fileUrl: string;
  isPublic: boolean;
  isGlobalPublic: boolean;
  mode: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  owner: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
  };
}

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: publicResumes = [], isLoading, refetch } = useQuery<FeedResume[]>({
    queryKey: ["/api/feed/resumes"],
  });

  const sendInvitation = useMutation({
    mutationFn: async (receiverId: number) => {
      return fetch("/api/network/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      }).then(res => {
        if (!res.ok) throw new Error("Failed to send invitation");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
      toast({
        title: "Invitation Sent",
        description: "Connection request has been sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
        <Button variant="outline" onClick={handleRefresh}>
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Public Resumes</CardTitle>
          <CardDescription>
            Discover publicly shared resumes from the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              // Loading skeleton
              <>
                {[1, 2].map((i) => (
                  <Card key={i} className="mb-4">
                    <CardHeader className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </>
            ) : publicResumes.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">
                  No public resumes available. Check back later as more users share their resumes publicly.
                </p>
                <Link href="/network">
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Grow Your Network
                  </Button>
                </Link>
              </div>
            ) : (
              publicResumes.map((resume) => (
                <ResumeCard 
                  key={resume.id} 
                  resume={resume} 
                  user={user}
                  ownerName={`${resume.owner.firstName} ${resume.owner.lastName}`}
                />
              ))
            )}
            
            {!user?.firstName && (
              <div className="rounded-md bg-muted p-4 mt-6">
                <p className="text-sm">
                  Complete your profile to get personalized feed updates and connect with more professionals.
                </p>
                <Link href="/profile">
                  <Button size="sm" variant="outline" className="mt-2">
                    Update Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}