import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ResumeCard } from "@/components/resume-card";
import { Link } from "wouter";
import { Home, Users } from "lucide-react";
import type { Resume } from "@db/schema";
import { NetworkResumeFilters, type SortOption } from "@/components/network-resume-filters";
import { useState, useMemo } from "react";

interface NetworkResume extends Resume {
  owner: {
    id: number;
    username: string;
  };
}

export default function NetworkResumesPage() {
  const { user, logoutMutation } = useAuth();
  const [activeSort, setActiveSort] = useState<SortOption>({ 
    type: 'date', 
    order: 'desc' 
  });

  const { data: networkResumes = [] } = useQuery<NetworkResume[]>({ 
    queryKey: ["/api/network/resumes"],
    enabled: !!user
  });

  const sortedResumes = useMemo(() => {
    return [...networkResumes].sort((a, b) => {
      switch (activeSort.type) {
        case 'date':
          return activeSort.order === 'desc'
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'user':
          return activeSort.order === 'desc'
            ? b.owner.username.localeCompare(a.owner.username)
            : a.owner.username.localeCompare(b.owner.username);
        case 'mode':
          return activeSort.order === 'desc'
            ? b.mode.localeCompare(a.mode)
            : a.mode.localeCompare(b.mode);
        default:
          return 0;
      }
    });
  }, [networkResumes, activeSort]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ResumeTrack</h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <Home className="h-4 w-4" />
                Your Resumes
              </Button>
            </Link>
            <Link href="/network">
              <Button variant="ghost" className="gap-2">
                <Users className="h-4 w-4" />
                Network
              </Button>
            </Link>
            <span>Welcome, {user?.username}</span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Network Resumes</h2>
          <NetworkResumeFilters 
            onSortChange={setActiveSort}
            activeSort={activeSort}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedResumes.map((resume) => (
            <ResumeCard 
              key={resume.id} 
              resume={resume}
              user={user || undefined}
              ownerName={resume.owner.username}
            />
          ))}
        </div>

        {sortedResumes.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No network resumes yet</h3>
            <p className="text-muted-foreground">
              Connect with other users to see their resumes
            </p>
          </div>
        )}
      </main>
    </div>
  );
}