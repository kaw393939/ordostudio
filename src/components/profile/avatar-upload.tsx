"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/primitives";
import { Camera, Trash2, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentUrl: string | null | undefined;
  displayName: string | null | undefined;
  email: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function AvatarUpload({
  currentUrl,
  displayName,
  email,
  onUploaded,
  onRemoved,
}: AvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const effectiveUrl = previewUrl ?? currentUrl ?? null;
  const initials = getInitials(displayName, email);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/account/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? "Upload failed");
      }

      const data = await res.json();
      setPreviewUrl(null);
      onUploaded(data.url);
      toast.success("Profile picture updated");
    } catch (err) {
      setPreviewUrl(null);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const res = await fetch("/api/v1/account/avatar", { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to remove avatar");
      }
      setPreviewUrl(null);
      onRemoved();
      toast.success("Profile picture removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar size="lg" className="size-16">
          {effectiveUrl ? (
            <AvatarImage src={effectiveUrl} alt={displayName ?? email} />
          ) : null}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            intent="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="mr-1.5 size-3.5" />
            {currentUrl ? "Change" : "Upload"}
          </Button>
          {currentUrl ? (
            <Button
              type="button"
              intent="secondary"
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="type-meta text-text-muted">JPG, PNG, WebP, or GIF. Max 5 MB.</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload profile picture"
      />
    </div>
  );
}
