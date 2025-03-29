import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut, FileText, Users, Files, Activity } from "lucide-react";

export function NavigationBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // Completely simplified navigation structure
  return (
    <header className="border-b bg-primary text-white sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={user ? "/" : "/auth"} className="text-xl font-bold">
          ResumeBook
        </Link>
        
        {user && (
          <div className="flex items-center space-x-6">
            <Link href="/feed">
              <div className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${location === "/feed" ? "bg-white/20" : ""}`}>
                <Activity className="h-5 w-5" />
                <span>Activity Feed</span>
              </div>
            </Link>
            
            <Link href="/">
              <div className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${location === "/" ? "bg-white/20" : ""}`}>
                <FileText className="h-5 w-5" />
                <span>Your Resumes</span>
              </div>
            </Link>
            
            <Link href="/network">
              <div className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${location === "/network" ? "bg-white/20" : ""}`}>
                <Users className="h-5 w-5" />
                <span>Network</span>
              </div>
            </Link>
            
            <Link href="/network/resumes">
              <div className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${location === "/network/resumes" ? "bg-white/20" : ""}`}>
                <Files className="h-5 w-5" />
                <span>Network Resumes</span>
              </div>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="bg-white/10 border-none text-white hover:bg-white/20">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}