import { NetworkManager } from "@/components/network-manager";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function NetworkPage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ResumeBook</h1>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <Home className="h-4 w-4" />
                Your Resumes
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

      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">My Network</h1>
        <NetworkManager />
      </div>
    </div>
  );
}