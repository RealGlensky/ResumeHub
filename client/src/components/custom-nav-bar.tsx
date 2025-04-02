import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserCircle, FileText, Users, Files } from "lucide-react";
import "../custom-navbar.css";

export function CustomNavBar() {
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <nav className="custom-navbar">
      <div className="custom-navbar-container">
        <div style={{ display: "flex", alignItems: "center", backgroundColor: "white" }}>
          <Link href="/">
            <div className="custom-navbar-brand">
              ResumeBook
            </div>
          </Link>
          
          <div className="custom-navbar-links">
            <Link href="/">
              <div className={`custom-navbar-link ${location === "/" ? "custom-navbar-link-active" : ""}`}>
                <FileText className="custom-navbar-link-icon" />
                Your Resumes
              </div>
            </Link>
            
            <Link href="/network">
              <div className={`custom-navbar-link ${location === "/network" ? "custom-navbar-link-active" : ""}`}>
                <Users className="custom-navbar-link-icon" />
                Network
              </div>
            </Link>
            
            <Link href="/network/resumes">
              <div className={`custom-navbar-link ${location === "/network/resumes" ? "custom-navbar-link-active" : ""}`}>
                <Files className="custom-navbar-link-icon" />
                Network Resumes
              </div>
            </Link>
          </div>
        </div>

        {user && (
          <div>
            <Link href="/profile">
              <div className="custom-navbar-profile">
                <UserCircle style={{ width: "20px", height: "20px", color: "black" }} />
              </div>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}