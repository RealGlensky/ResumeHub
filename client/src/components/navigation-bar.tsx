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

  // Define the type for nav links
  type NavLink = {
    href: string;
    icon: React.ElementType;
    label: string;
  };

  // Navigation links configuration
  const navLinks: NavLink[] = [
    { href: "/feed", icon: Activity, label: "Activity Feed" },
    { href: "/", icon: FileText, label: "Your Resumes" },
    { href: "/network", icon: Users, label: "Network" },
    { href: "/network/resumes", icon: Files, label: "Network Resumes" }
  ];

  // Simple navigation item rendering
  const renderNavItem = (link: NavLink) => {
    const isActive = location === link.href;
    return (
      <NavigationMenuItem key={link.href}>
        <Link href={link.href}>
          <Button 
            variant={isActive ? "secondary" : "ghost"} 
            className="flex items-center gap-2"
          >
            <link.icon className="h-4 w-4" />
            <span>{link.label}</span>
          </Button>
        </Link>
      </NavigationMenuItem>
    );
  };

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container flex h-14 items-center">
        <Link href={user ? "/" : "/auth"} className="mr-6 flex items-center space-x-2">
          <span className="font-bold">ResumeBook</span>
        </Link>
        
        {user && (
          <NavigationMenu className="flex-1">
            <NavigationMenuList className="flex gap-1">
              {navLinks.map(renderNavItem)}
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