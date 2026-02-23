import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/api/auth";
import { updateUserProfile } from "@/lib/api/users";
import { z } from "zod";

const updateProfileSchema = z.object({
  display_name: z.string().optional(),
  bio: z.string().optional(),
  profile_picture_url: z.string().url().optional().or(z.literal("")),
});

export async function PUT(request: Request) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    updateUserProfile(user.id, {
      display_name: parsed.display_name,
      bio: parsed.bio,
      profile_picture_url: parsed.profile_picture_url === "" ? undefined : parsed.profile_picture_url,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
