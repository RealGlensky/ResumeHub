import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ResumeCard } from "@/components/resume-card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import type { Resume } from "@db/schema";

// Extend Resume type to include owner information
interface FeedResume extends Omit<Resume, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  owner: {
    id: number;
    username: string;
  };
}

export default function FeedPage() {
  const { user } = useAuth();
  const { data: feedResumes = [], refetch, isLoading, isError } = useQuery<FeedResume[]>({
    queryKey: ["/api/feed"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Public Feed</h1>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Publicly Shared Resumes</CardTitle>
          <CardDescription>
            Browse resumes shared by professionals with everyone on the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive">
              <p>There was an error loading the feed. Please try again later.</p>
            </div>
          ) : feedResumes.length === 0 ? (
            <div className="rounded-md bg-muted p-6 text-center">
              <h3 className="font-medium mb-2">No public resumes found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No one has shared their resume publicly yet. Be the first to share yours!
              </p>
              {user ? (
                <Link to="/profile">
                  <Button>Share Your Resume</Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button>Sign In to Share</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {feedResumes.length} public {feedResumes.length === 1 ? 'resume' : 'resumes'}
                </p>
              </div>
              <Separator />
              <div className="grid gap-6 md:grid-cols-2">
                {feedResumes.map((resume) => (
                  <ResumeCard 
                    key={resume.id} 
                    resume={resume} 
                    user={user ? { id: user.id, username: user.username } : undefined}
                    ownerName={resume.owner.username}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}