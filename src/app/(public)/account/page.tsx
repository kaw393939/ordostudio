"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/forms";
import { Textarea } from "@/components/ui/textarea";
import { requestHal } from "@/lib/hal-client";

type MeResponse = {
  id: string;
  email: string;
  status: string;
  display_name?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
};

export default function AccountPage() {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await requestHal<MeResponse>("/api/v1/me");
        if (result.ok) {
          setUser(result.data);
          setDisplayName(result.data.display_name || "");
          setBio(result.data.bio || "");
          setProfilePictureUrl(result.data.profile_picture_url || "");
        }
      } finally {
        setIsLoading(false);
      }
    };
    void loadUser();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          profile_picture_url: profilePictureUrl,
        }),
      });

      if (response.ok) {
        toast.success("Profile updated successfully");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageShell title="My Account">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-surface-sunken" />
          <div className="h-32 rounded bg-surface-sunken" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="My Account" subtitle="Manage your profile settings.">
      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled />
            <p className="type-meta text-text-muted">Your email address cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to be known"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
            <Input
              id="profilePictureUrl"
              type="url"
              value={profilePictureUrl}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a little about yourself"
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
}
