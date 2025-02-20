import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Mail, UserPlus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SearchResult = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  profilePictureUrl?: string;
};

export function UserSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: searchResults, isLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });

  const inviteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", "/api/network/invite", { receiverId: userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
      toast({
        title: "Invitation sent",
        description: "The user will be notified of your connection request.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="w-full max-w-md mx-auto">
      <Input
        type="search"
        placeholder="Search by name, email, or username..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />

      <div className="space-y-2">
        {isLoading && searchQuery && (
          <Card>
            <CardContent className="p-4">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-2 bg-slate-200 rounded"></div>
                  <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {searchResults?.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    {user.profilePictureUrl ? (
                      <img
                        src={user.profilePictureUrl}
                        alt={user.username}
                        className="aspect-square h-full w-full"
                      />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {user.username}
                      </span>
                      {user.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inviteMutation.mutate(user.id)}
                  disabled={inviteMutation.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {searchResults?.length === 0 && searchQuery && (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              No users found matching your search.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
