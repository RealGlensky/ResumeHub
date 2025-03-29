import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserCircle, LogOut, FileText, Users, Files } from "lucide-react";

export function NavigationBar() {
  const { user, logoutMutation } = useAuth();

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'white',
      color: 'black',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        height: '56px',
        alignItems: 'center',
        padding: '0 16px',
        backgroundColor: 'white'
      }}>
        <Link href="/">
          <a style={{
            marginRight: '24px',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 'bold',
            color: 'black',
            textDecoration: 'none'
          }}>
            ResumeBook
          </a>
        </Link>
        
        <div style={{ display: 'flex', flex: 1, backgroundColor: 'white' }}>
          <Link href="/">
            <a style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              marginRight: '8px',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: 'black',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none'
            }}>
              <FileText style={{ marginRight: '8px', width: '16px', height: '16px', color: 'black' }} />
              Your Resumes
            </a>
          </Link>
          
          <Link href="/network">
            <a style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              marginRight: '8px',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: 'black',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none'
            }}>
              <Users style={{ marginRight: '8px', width: '16px', height: '16px', color: 'black' }} />
              Network
            </a>
          </Link>
          
          <Link href="/network/resumes">
            <a style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              marginRight: '8px',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: 'black',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none'
            }}>
              <Files style={{ marginRight: '8px', width: '16px', height: '16px', color: 'black' }} />
              Network Resumes
            </a>
          </Link>
        </div>

        {user && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => window.location.href = '/profile'}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                borderRadius: '4px',
                color: 'black'
              }}
            >
              <UserCircle style={{ width: '20px', height: '20px', color: 'black' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}