import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function FeedPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  
  // Mock data for now - this would connect to backend in future
  const { data: feedItems = [], isLoading } = useQuery({
    queryKey: ["/api/feed", activeTab],
    enabled: !!user,
  });

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Professional Feed</h1>
        <div>
          <Button variant="outline" className="mr-2">Refresh</Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="network">My Network</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : feedItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-10">
            <p className="text-muted-foreground mb-2">No feed items to display</p>
            <p className="text-sm text-muted-foreground">
              Connect with more professionals to see their activity and resume updates
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Professional Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This is where you'll see updates from your network, job offers, and resume activities.
              </p>
              <p className="text-muted-foreground mt-2">
                Coming soon: Real-time updates from your professional connections.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
