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

export function NavigationBarNew() {
  const { user, logoutMutation } = useAuth();

  return (
    <header style={{ borderBottom: "1px solid #e5e5e5", backgroundColor: "#f6f6f6" }}>
      <div style={{ display: "flex", height: "48px", alignItems: "center", padding: "0 16px" }}>
        <Link href="/" style={{ marginRight: "32px", display: "flex", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>ResumeBook</span>
        </Link>
        
        <div style={{ display: "flex", gap: "32px" }}>
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", fontSize: "14px", fontWeight: 500, color: "#4b5563" }}>
              <FileText style={{ marginRight: "8px", height: "16px", width: "16px" }} />
              Your Resumes
            </div>
          </Link>
          
          <Link href="/network">
            <div style={{ display: "flex", alignItems: "center", fontSize: "14px", fontWeight: 500, color: "#4b5563" }}>
              <Users style={{ marginRight: "8px", height: "16px", width: "16px" }} />
              Network
            </div>
          </Link>
          
          <Link href="/network/resumes">
            <div style={{ display: "flex", alignItems: "center", fontSize: "14px", fontWeight: 500, color: "#4b5563" }}>
              <Files style={{ marginRight: "8px", height: "16px", width: "16px" }} />
              Network Resumes
            </div>
          </Link>
        </div>
        
        <div style={{ flex: 1 }}></div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" style={{ borderRadius: "9999px" }}>
                <UserCircle style={{ height: "20px", width: "20px", color: "#4b5563" }} />
                <span style={{ position: "absolute", width: "1px", height: "1px", padding: "0", margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: "0" }}>User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                style={{ color: "#dc2626" }}
              >
                <LogOut style={{ marginRight: "8px", height: "16px", width: "16px" }} />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}