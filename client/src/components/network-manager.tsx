import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Check, X, Search, UserPlus } from "lucide-react";

type NetworkInvitation = {
  id: number;
  status: string;
  createdAt: string;
  type: 'sent' | 'received';
  sender: {
    id: number;
    username: string;
  };
};

type NetworkConnection = {
  id: number;
  createdAt: string;
  connectedUser: {
    id: number;
    username: string;
  };
};

type User = {
  id: number;
  username: string;
};

export function NetworkManager() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: () =>
      searchQuery
        ? fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`).then(r => r.json())
        : Promise.resolve([]),
    enabled: searchQuery.length > 0,
  });

  const { data: invitations = [] } = useQuery<NetworkInvitation[]>({
    queryKey: ["/api/network/invitations"],
  });

  const { data: connections = [] } = useQuery<NetworkConnection[]>({
    queryKey: ["/api/network/connections"],
  });

  const handleInvitation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "accept" | "reject" }) => {
      return apiRequest("POST", `/api/network/invitations/${id}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/connections"] });
    },
  });

  const sendInvitation = useMutation({
    mutationFn: async (receiverId: number) => {
      return apiRequest("POST", "/api/network/invite", { receiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
      setSearchQuery("");
    },
  });

  // Split invitations into sent and received
  const receivedInvitations = invitations.filter(inv => inv.type === 'received' && inv.status === 'pending');
  const sentInvitations = invitations.filter(inv => inv.type === 'sent' && inv.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Search and Invite Section remains the same */}
      <Card>
        <CardHeader>
          <CardTitle>Find Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="secondary" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <p className="font-medium">{user.username}</p>
                    <Button
                      size="sm"
                      onClick={() => sendInvitation.mutate(user.id)}
                      disabled={sendInvitation.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Received Invitations Section */}
      <Card>
        <CardHeader>
          <CardTitle>Received Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {receivedInvitations.length === 0 ? (
            <p className="text-muted-foreground">No pending invitations</p>
          ) : (
            <div className="space-y-4">
              {receivedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {invitation.sender.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      wants to connect with you
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleInvitation.mutate({
                          id: invitation.id,
                          action: "accept",
                        })
                      }
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleInvitation.mutate({
                          id: invitation.id,
                          action: "reject",
                        })
                      }
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Invitations Section */}
      {sentInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sent Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sentInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      Invitation sent to {invitation.sender.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pending response
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connections Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Network</CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground">No connections yet</p>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{connection.connectedUser.username}</p>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}