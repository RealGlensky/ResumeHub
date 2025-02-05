import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Check, X } from "lucide-react";

type NetworkInvitation = {
  id: number;
  status: string;
  createdAt: string;
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

export function NetworkManager() {
  const { data: invitations = [] } = useQuery<NetworkInvitation[]>({
    queryKey: ["/api/network/invitations"],
  });

  const { data: connections = [] } = useQuery<NetworkConnection[]>({
    queryKey: ["/api/network/connections"],
  });

  const handleInvitation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'accept' | 'reject' }) => {
      return apiRequest(`/api/network/invitations/${id}/${action}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/connections"] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Network Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-muted-foreground">No pending invitations</p>
          ) : (
            <div className="space-y-4">
              {invitations
                .filter((inv) => inv.status === "pending")
                .map((invitation) => (
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