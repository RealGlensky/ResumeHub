import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserCircle, FileText, Users, Files } from "lucide-react";

export function WhiteNavigationBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  return (
    <nav style={{
      backgroundColor: "#FFFFFF",
      color: "#000000",
      borderBottom: "1px solid #E5E7EB",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        height: "56px",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link href="/">
            <div style={{
              marginRight: "24px",
              fontWeight: "bold",
              fontSize: "18px",
              color: "#000000",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              cursor: "pointer"
            }}>
              ResumeBook
            </div>
          </Link>
          
          <div style={{ display: "flex" }}>
            <Link href="/">
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                marginRight: "8px",
                borderRadius: "4px",
                backgroundColor: location === "/" ? "#F3F4F6" : "transparent",
                color: "#000000",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer"
              }}>
                <FileText style={{ marginRight: "8px", width: "16px", height: "16px", color: "#000000" }} />
                Your Resumes
              </div>
            </Link>
            
            <Link href="/network">
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                marginRight: "8px",
                borderRadius: "4px",
                backgroundColor: location === "/network" ? "#F3F4F6" : "transparent",
                color: "#000000",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer"
              }}>
                <Users style={{ marginRight: "8px", width: "16px", height: "16px", color: "#000000" }} />
                Network
              </div>
            </Link>
            
            <Link href="/network/resumes">
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                marginRight: "8px",
                borderRadius: "4px",
                backgroundColor: location === "/network/resumes" ? "#F3F4F6" : "transparent",
                color: "#000000",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer"
              }}>
                <Files style={{ marginRight: "8px", width: "16px", height: "16px", color: "#000000" }} />
                Network Resumes
              </div>
            </Link>
          </div>
        </div>

        {user && (
          <div>
            <Link href="/profile">
              <div style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "8px",
                borderRadius: "4px",
                color: "#000000",
                textDecoration: "none"
              }}>
                <UserCircle style={{ width: "20px", height: "20px", color: "#000000" }} />
              </div>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}