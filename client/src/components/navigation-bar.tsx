import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut, FileText, Users, Files } from "lucide-react";

export function NavigationBar() {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b bg-background">
      <div className="flex h-12 items-center px-4">
        <Link href="/" className="mr-8 flex items-center">
          <span className="font-bold text-sm">ResumeBook</span>
        </Link>
        
        <div className="flex space-x-6">
          <Link href="/">
            <div className="flex items-center text-sm font-medium hover:text-accent-foreground">
              <FileText className="mr-2 h-4 w-4" />
              Your Resumes
            </div>
          </Link>
          
          <Link href="/network">
            <div className="flex items-center text-sm font-medium hover:text-accent-foreground">
              <Users className="mr-2 h-4 w-4" />
              Network
            </div>
          </Link>
          
          <Link href="/network/resumes">
            <div className="flex items-center text-sm font-medium hover:text-accent-foreground">
              <Files className="mr-2 h-4 w-4" />
              Network Resumes
            </div>
          </Link>
        </div>
        
        <div className="flex-1"></div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle className="h-5 w-5" />
                <span className="sr-only">User menu</span>
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
        )}
      </div>
    </header>
  );
}