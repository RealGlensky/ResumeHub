import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// This is a placeholder for the actual Feed page
// Later it can be updated to show real activity feed data
export default function FeedPage() {
  const { user } = useAuth();
  const { data: feedItems = [], isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/feed"],
    enabled: !!user, // Only fetch when user is logged in
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold">Activity Feed</h2>
        <p className="text-muted-foreground mt-2">
          Stay updated with the latest activities from your network
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {feedItems.length > 0 ? (
            feedItems.map((item, index) => (
              <Card key={index}>
                <CardContent className="py-4">
                  {/* Feed item content would go here */}
                  <p>Feed item {index + 1}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  When you connect with others and interact with resumes, activities will 
                  appear here. Start by connecting with professionals in your network.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
