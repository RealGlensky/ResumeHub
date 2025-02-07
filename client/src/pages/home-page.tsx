import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ResumeCard } from "@/components/resume-card";
import { UploadResume } from "@/components/upload-resume";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { Users, FileText } from "lucide-react";
import type { Resume } from "@db/schema";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { data: resumes = [] } = useQuery<Resume[]>({ queryKey: ["/api/resumes"] });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ResumeTrack</h1>
          <div className="flex items-center gap-4">
            <Link href="/network">
              <Button variant="ghost" className="gap-2">
                <Users className="h-4 w-4" />
                Network
              </Button>
            </Link>
            <Link href="/network/resumes">
              <Button variant="ghost" className="gap-2">
                <FileText className="h-4 w-4" />
                Network Resumes
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
          <h2 className="text-3xl font-bold">Your Resumes</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Upload Resume</Button>
            </DialogTrigger>
            <DialogContent>
              <UploadResume />
            </DialogContent>
          </Dialog>
        </div>

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
      </main>
    </div>
  );
}