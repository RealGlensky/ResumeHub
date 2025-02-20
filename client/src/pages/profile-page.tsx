import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { ImageCropper } from "@/components/image-cropper";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  jobTitle: z.string().optional(),
  profileDescription: z.string().max(500, "Description must be less than 500 characters").optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      linkedinUrl: user?.linkedinUrl || "",
      jobTitle: user?.jobTitle || "",
      profileDescription: user?.profileDescription || "",
      city: user?.city || "",
      state: user?.state || "",
      country: user?.country || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfilePictureMutation = useMutation({
    mutationFn: async (file: Blob) => {
      const formData = new FormData();
      // Convert blob to file with original file extension
      const fileExtension = selectedFile?.name.split('.').pop() || 'jpg';
      const newFile = new File([file], `cropped.${fileExtension}`, { type: `image/${fileExtension}` });
      formData.append('profilePicture', newFile);
      const res = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to update profile picture');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
      setCropperOpen(false);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCropperOpen(true);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    updateProfilePictureMutation.mutate(croppedBlob);
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setSelectedFile(null);
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {user.profilePictureUrl ? (
                  <AvatarImage src={user.profilePictureUrl} alt={user.username} />
                ) : (
                  <AvatarFallback>
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <label
                htmlFor="profile-picture"
                className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-full cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  id="profile-picture"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                  disabled={updateProfilePictureMutation.isPending}
                />
              </label>
            </div>
            {updateProfilePictureMutation.isPending && (
              <div className="mt-2 text-sm text-muted-foreground">
                Uploading...
              </div>
            )}
          </div>

          {selectedFile && (
            <ImageCropper
              file={selectedFile}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
              open={cropperOpen}
            />
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Software Engineer" />
                    </FormControl>
                    <FormDescription>
                      Your current job title (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://linkedin.com/in/username" />
                    </FormControl>
                    <FormDescription>
                      Your LinkedIn profile URL (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profileDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tell us about yourself..."
                        className="h-32"
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description about yourself and your work (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="San Francisco" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="California" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="United States" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full"
              >
                {updateProfileMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}