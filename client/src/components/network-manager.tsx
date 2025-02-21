import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Check, X, User, Mail, Briefcase, MapPin, User2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type NetworkInvitation = {
  id: number;
  status: string;
  createdAt: string;
  type: 'sent' | 'received';
  sender: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email?: string;
    profilePictureUrl?: string;
    jobTitle?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  receiver: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email?: string;
    profilePictureUrl?: string;
    jobTitle?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type NetworkConnection = {
  id: number;
  createdAt: string;
  connectedUser: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email?: string;
    profilePictureUrl?: string;
    jobTitle?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

export function NetworkManager() {
  const { toast } = useToast();

  const { data: invitations = [] } = useQuery<NetworkInvitation[]>({
    queryKey: ["/api/network/invitations"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: connections = [] } = useQuery<NetworkConnection[]>({
    queryKey: ["/api/network/connections"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleInvitation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "accept" | "reject" }) => {
      return apiRequest("POST", `/api/network/invitations/${id}/${action}`);
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Invitation ${variables.action}ed`,
        description: `You have successfully ${variables.action}ed the connection request.`,
      });

      // Invalidate both invitations and connections queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ["/api/network/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/connections"] });
      // Also invalidate network resumes as they might change based on connections
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process the invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeConnection = useMutation({
    mutationFn: async (connectionId: number) => {
      return apiRequest("DELETE", `/api/network/connections/${connectionId}`);
    },
    onSuccess: () => {
      // Invalidate both connections and network resumes queries
      queryClient.invalidateQueries({ queryKey: ["/api/network/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/resumes"] });
      toast({
        title: "Connection removed",
        description: "The user has been removed from your network.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove connection. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Split invitations into sent and received
  const receivedInvitations = invitations.filter(inv => inv.type === 'received' && inv.status === 'pending');
  const sentInvitations = invitations.filter(inv => inv.type === 'sent' && inv.status === 'pending');

  return (
    <div className="space-y-6">
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
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      {invitation.sender.profilePictureUrl ? (
                        <AvatarImage
                          src={invitation.sender.profilePictureUrl}
                          alt={invitation.sender.username}
                          className="aspect-square h-full w-full"
                        />
                      ) : (
                        <AvatarFallback>
                          {invitation.sender.firstName?.charAt(0)}
                          {invitation.sender.lastName?.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {invitation.sender.firstName} {invitation.sender.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3" />
                          {invitation.sender.username}
                        </span>
                        {invitation.sender.email && (
                          <span className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            {invitation.sender.email}
                          </span>
                        )}
                        {invitation.sender.jobTitle && (
                          <span className="flex items-center gap-1 text-xs">
                            <Briefcase className="h-3 w-3" />
                            {invitation.sender.jobTitle}
                          </span>
                        )}
                        {(invitation.sender.city ||
                          invitation.sender.state ||
                          invitation.sender.country) && (
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {[
                              invitation.sender.city,
                              invitation.sender.state,
                              invitation.sender.country
                            ].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700"
                      onClick={() =>
                        handleInvitation.mutate({
                          id: invitation.id,
                          action: "accept",
                        })
                      }
                      disabled={handleInvitation.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
                      onClick={() =>
                        handleInvitation.mutate({
                          id: invitation.id,
                          action: "reject",
                        })
                      }
                      disabled={handleInvitation.isPending}
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
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      {invitation.receiver.profilePictureUrl ? (
                        <AvatarImage
                          src={invitation.receiver.profilePictureUrl}
                          alt={invitation.receiver.username}
                          className="aspect-square h-full w-full"
                        />
                      ) : (
                        <AvatarFallback>
                          {invitation.receiver.firstName?.charAt(0)}
                          {invitation.receiver.lastName?.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {invitation.receiver.firstName} {invitation.receiver.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3" />
                          {invitation.receiver.username}
                        </span>
                        {invitation.receiver.email && (
                          <span className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            {invitation.receiver.email}
                          </span>
                        )}
                        {invitation.receiver.jobTitle && (
                          <span className="flex items-center gap-1 text-xs">
                            <Briefcase className="h-3 w-3" />
                            {invitation.receiver.jobTitle}
                          </span>
                        )}
                        {(invitation.receiver.city ||
                          invitation.receiver.state ||
                          invitation.receiver.country) && (
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {[
                              invitation.receiver.city,
                              invitation.receiver.state,
                              invitation.receiver.country
                            ].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pending response
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
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      {connection.connectedUser.profilePictureUrl ? (
                        <AvatarImage
                          src={connection.connectedUser.profilePictureUrl}
                          alt={connection.connectedUser.username}
                          className="aspect-square h-full w-full"
                        />
                      ) : (
                        <AvatarFallback>
                          {connection.connectedUser.firstName?.charAt(0)}
                          {connection.connectedUser.lastName?.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {connection.connectedUser.firstName} {connection.connectedUser.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3" />
                          {connection.connectedUser.username}
                        </span>
                        {connection.connectedUser.email && (
                          <span className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            {connection.connectedUser.email}
                          </span>
                        )}
                        {connection.connectedUser.jobTitle && (
                          <span className="flex items-center gap-1 text-xs">
                            <Briefcase className="h-3 w-3" />
                            {connection.connectedUser.jobTitle}
                          </span>
                        )}
                        {(connection.connectedUser.city ||
                          connection.connectedUser.state ||
                          connection.connectedUser.country) && (
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {[
                              connection.connectedUser.city,
                              connection.connectedUser.state,
                              connection.connectedUser.country
                            ].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
                    onClick={() => removeConnection.mutate(connection.id)}
                    disabled={removeConnection.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}