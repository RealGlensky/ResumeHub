import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Activity, FileText, LogOut, User, Users } from "lucide-react";

// A completely new navigation component created from scratch
export function TopNavigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // Return empty div if user is not logged in to avoid null return
  if (!user) return <div></div>;

  return (
    <nav className="bg-blue-600 text-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/">
              <span className="text-xl font-bold">ResumeBook</span>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            {/* Feed Link - First Item */}
            <Link href="/feed">
              <div className={`flex items-center rounded-md px-3 py-2 ${
                location === "/feed" 
                  ? "bg-white text-blue-600 font-medium"
                  : "hover:bg-blue-500"
              }`}>
                <Activity className="h-5 w-5 mr-2" />
                <span className="font-medium">Feed</span>
              </div>
            </Link>

            {/* Resumes Link */}
            <Link href="/">
              <div className={`flex items-center rounded-md px-3 py-2 ${
                location === "/" 
                  ? "bg-white text-blue-600 font-medium" 
                  : "hover:bg-blue-500"
              }`}>
                <FileText className="h-5 w-5 mr-2" />
                <span className="font-medium">Your Resumes</span>
              </div>
            </Link>

            {/* Network Link */}
            <Link href="/network">
              <div className={`flex items-center rounded-md px-3 py-2 ${
                location === "/network" 
                  ? "bg-white text-blue-600 font-medium" 
                  : "hover:bg-blue-500"
              }`}>
                <Users className="h-5 w-5 mr-2" />
                <span className="font-medium">Network</span>
              </div>
            </Link>

            {/* Network Resumes Link */}
            <Link href="/network/resumes">
              <div className={`flex items-center rounded-md px-3 py-2 ${
                location === "/network/resumes" 
                  ? "bg-white text-blue-600 font-medium" 
                  : "hover:bg-blue-500"
              }`}>
                <FileText className="h-5 w-5 mr-2" />
                <span className="font-medium">Network Resumes</span>
              </div>
            </Link>

            {/* User/Profile Menu */}
            <div className="flex items-center ml-4">
              <Link href="/profile">
                <Button variant="ghost" className="text-white hover:bg-blue-500">
                  <User className="h-5 w-5 mr-2" />
                  <span>Profile</span>
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                className="text-white hover:bg-blue-500"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}