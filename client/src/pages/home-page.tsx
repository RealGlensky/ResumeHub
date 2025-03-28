import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ResumeCard } from "@/components/resume-card";
import { UploadResume } from "@/components/upload-resume";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Resume } from "@db/schema";

interface NetworkResume extends Resume {
  owner: {
    id: number;
    username: string;
  };
}

export default function HomePage() {
  const { user } = useAuth();
  const { data: resumes = [] } = useQuery<Resume[]>({ 
    queryKey: ["/api/resumes"],
    enabled: !!user, // Only fetch when user is logged in
  });

  // Fetch public resumes (available even if not logged in)
  const { data: publicResumes = [] } = useQuery<NetworkResume[]>({ 
    queryKey: ["/api/public-resumes"],
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <Tabs defaultValue="my-resumes" className="space-y-8">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="my-resumes">Your Resumes</TabsTrigger>
            <TabsTrigger value="public-resumes">Public Resumes</TabsTrigger>
          </TabsList>

          {user && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Upload Resume</Button>
              </DialogTrigger>
              <DialogContent>
                <UploadResume />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="my-resumes">
          {user ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {resumes.map((resume) => (
                  <ResumeCard 
                    key={resume.id} 
                    resume={resume} 
                    user={user || undefined}
                  />
                ))}
              </div>

              {resumes.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
                  <p className="text-muted-foreground">
                    Upload your first resume to start tracking your job applications
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Please sign in</h3>
              <p className="text-muted-foreground">
                You need to be logged in to view your resumes
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="public-resumes">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publicResumes.map((resume) => (
              <ResumeCard 
                key={resume.id} 
                resume={resume} 
                user={user || undefined}
                ownerName={resume.owner?.username || "Anonymous"}
              />
            ))}
          </div>

          {publicResumes.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">No public resumes available</h3>
              <p className="text-muted-foreground">
                When users make their resumes public, they will appear here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}