import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ResumeCard } from "@/components/resume-card";
import type { Resume } from "@db/schema";
import { NetworkResumeFilters, type SortOption } from "@/components/network-resume-filters";
import { useState, useMemo } from "react";

interface NetworkResume extends Resume {
  owner: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    email?: string;
    jobTitle?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export default function NetworkResumesPage() {
  const { user } = useAuth();
  const [activeSort, setActiveSort] = useState<SortOption>({ 
    type: 'date', 
    order: 'desc' 
  });

  const { data: networkResumes = [] } = useQuery<NetworkResume[]>({ 
    queryKey: ["/api/network/resumes"],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const sortedResumes = useMemo(() => {
    return [...networkResumes].sort((a, b) => {
      switch (activeSort.type) {
        case 'date':
          return activeSort.order === 'desc'
            ? new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
            : new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
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
            ownerInfo={{
              id: resume.owner.id,
              username: resume.owner.username,
              firstName: resume.owner.firstName,
              lastName: resume.owner.lastName,
              profilePictureUrl: resume.owner.profilePictureUrl,
            }}
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
  );
}