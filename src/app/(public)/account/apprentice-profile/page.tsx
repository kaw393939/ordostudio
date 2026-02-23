"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button, Card } from "@/components/primitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { requestHal, type ProblemDetails } from "@/lib/hal-client";

type ApprenticeProfile = {
  user_id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  tags: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
};

type MyProfileResponse = {
  profile: ApprenticeProfile | null;
  suggested_handle: string;
};

export default function AccountApprenticeProfilePage() {
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [profile, setProfile] = useState<ApprenticeProfile | null>(null);

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tags, setTags] = useState("");

  const load = useCallback(async () => {
    setPending(true);
    const response = await requestHal<MyProfileResponse>("/api/v1/account/apprentice-profile");
    if (!response.ok) {
      setProblem(response.problem);
      setPending(false);
      return;
    }

    setProblem(null);
    setProfile(response.data.profile);

    const existing = response.data.profile;
    setHandle(existing?.handle ?? response.data.suggested_handle);
    setDisplayName(existing?.display_name ?? "");
    setHeadline(existing?.headline ?? "");
    setBio(existing?.bio ?? "");
    setLocation(existing?.location ?? "");
    setWebsiteUrl(existing?.website_url ?? "");
    setTags(existing?.tags ?? "");

    setPending(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    setProblem(null);

    const response = await requestHal<{ profile: ApprenticeProfile }>("/api/v1/account/apprentice-profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle,
        display_name: displayName,
        headline: headline.trim().length > 0 ? headline : null,
        bio: bio.trim().length > 0 ? bio : null,
        location: location.trim().length > 0 ? location : null,
        website_url: websiteUrl.trim().length > 0 ? websiteUrl : null,
        tags,
      }),
    });

    if (!response.ok) {
      setProblem(response.problem);
      setSaving(false);
      return;
    }

    setProfile(response.data.profile);
    setSaving(false);
  };

  return (
    <PageShell
      title="Apprentice profile"
      subtitle="Create your public profile for the Studio Ordo directory. Profiles require approval before publishing."
      breadcrumbs={[{ label: "Account", href: "/account" }, { label: "Apprentice profile" }]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/account" className="type-label underline">
          Back to account
        </Link>
        <Button intent="secondary" onClick={() => void load()} disabled={pending}>
          Refresh
        </Button>
      </div>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {pending ? <p className="mt-4 type-meta text-text-muted">Loading…</p> : null}

      <Card className="mt-4 p-4">
        {profile ? (
          <p className="type-meta text-text-muted">Current status: {profile.status}</p>
        ) : (
          <p className="type-meta text-text-muted">Status: not submitted yet</p>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ap-handle">Handle</Label>
            <Input id="ap-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="e.g., jane-doe" />
            <p className="type-meta text-text-muted">Used in your public URL: /apprentices/{handle || "handle"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-name">Display name</Label>
            <Input id="ap-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., Jane Doe" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ap-headline">Headline</Label>
            <Input id="ap-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g., AI reliability + automation for teams" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ap-bio">Bio</Label>
            <Textarea id="ap-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-24" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-location">Location</Label>
            <Input id="ap-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., NYC" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-website">Website</Label>
            <Input id="ap-website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ap-tags">Tags</Label>
            <Input id="ap-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma-separated (e.g., evals, automation, reliability)" />
          </div>
        </div>

        <Button intent="primary" className="mt-4" onClick={() => void onSave()} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </Card>
    </PageShell>
  );
}
