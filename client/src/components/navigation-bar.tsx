import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut, FileText, Users, Files, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavigationBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // Only show navigation items when user is logged in
  const showNav = !!user;

  const NavItem = ({ href, icon: Icon, children }: { 
    href: string; 
    icon: React.ElementType;
    children: React.ReactNode;
  }) => {
    const isActive = location === href;
    
    return (
      <NavigationMenuItem>
        <Link href={href}>
          <NavigationMenuLink className={cn(
            "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
            isActive ? "bg-accent/50" : "bg-background"
          )}>
            <Icon className="mr-2 h-4 w-4" />
            {children}
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
    );
  };

  return (
    <header className="border-b bg-background">
      <div className="container flex h-14 items-center">
        <Link href={user ? "/" : "/auth"} className="mr-6 flex items-center space-x-2">
          <span className="font-bold">ResumeBook</span>
        </Link>
        
        {showNav && (
          <NavigationMenu className="flex-1">
            <NavigationMenuList>
              <NavItem href="/feed" icon={Activity}>Feed</NavItem>
              <NavItem href="/" icon={FileText}>Your Resumes</NavItem>
              <NavItem href="/network" icon={Users}>Network</NavItem>
              <NavItem href="/network/resumes" icon={Files}>Network Resumes</NavItem>
            </NavigationMenuList>
          </NavigationMenu>
        )}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
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