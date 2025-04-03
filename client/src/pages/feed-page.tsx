import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

export default function FeedPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
        <Button variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Network Activity</CardTitle>
          <CardDescription>
            Stay updated with the latest activities from your network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Activity feed will display updates from your network connections, including new resumes, 
              job offers, and profile updates.
            </p>
            {!user?.firstName && (
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm">
                  Complete your profile to get personalized feed updates and connect with more professionals.
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  Update Profile
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}