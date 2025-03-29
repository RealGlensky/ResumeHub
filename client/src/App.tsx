import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { NavigationBar } from "@/components/navigation-bar";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import FeedPage from "@/pages/feed-page";
import AuthPage from "@/pages/auth-page";
import NetworkPage from "@/pages/network";
import NetworkResumesPage from "@/pages/network-resumes";
import ProfilePage from "@/pages/profile-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container py-6">
        <Switch>
          {/* Explicitly define the feed route first */}
          <ProtectedRoute path="/feed" component={FeedPage} />
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