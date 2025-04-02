import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { CustomNavBar } from "@/components/custom-nav-bar";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NetworkPage from "@/pages/network";
import NetworkResumesPage from "@/pages/network-resumes";
import ProfilePage from "@/pages/profile-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "white" }}>
      <CustomNavBar />
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
        <Switch>
          <ProtectedRoute path="/" component={HomePage} />
          <ProtectedRoute path="/network" component={NetworkPage} />
          <ProtectedRoute path="/network/resumes" component={NetworkResumesPage} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;