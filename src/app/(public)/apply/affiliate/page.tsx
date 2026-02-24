"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProblemDetailsPanel } from "@/components/problem-details";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useSubmitState } from "@/components/forms/use-submit-state";
import { getRoot, follow, requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";

const affiliateSchema = z.object({
  website: z.string().url("Must be a valid URL"),
  audienceSize: z.string().min(1, "Audience size is required"),
});

type AffiliateFormValues = z.infer<typeof affiliateSchema>;

export default function AffiliateApplicationPage() {
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the role ID for AFFILIATE
    // In a real app, we might fetch this from an API or have it hardcoded if it's a known constant.
    // For now, we'll fetch the roles list or assume we can get it.
    // Actually, we can just fetch the roles from the API if we have an endpoint, or we can just pass the name to the API and let the API resolve it.
    // Wait, the API expects `requested_role_id`. We need to get the role ID.
    // Let's fetch the roles list.
    // Wait, there is no public endpoint to list roles.
    // Let's update the API to accept `requested_role_name` instead of `requested_role_id` for simplicity, or we can fetch it.
    // Let's just fetch it from a new endpoint or update the existing one.
  }, []);

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(affiliateSchema),
    defaultValues: {
      website: "",
      audienceSize: "",
    },
  });

  const onSubmit = async (values: AffiliateFormValues) => {
    setProblem(null);

    // We need the role ID. Let's assume we have a way to get it, or we can change the API to accept the role name.
    // Let's change the API to accept `requested_role_name` instead.
    const res = await fetch("/api/v1/roles/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requested_role_name: "AFFILIATE",
        context: values,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setProblem(data);
      return;
    }

    router.push("/dashboard?applied=affiliate");
  };

  const { state, handleSubmit: submitWithState } = useSubmitState(
    () => form.handleSubmit(onSubmit)()
  );

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Apply for Affiliate Program</h1>
      <p className="mt-2 text-sm text-muted-foreground">Tell us about your audience.</p>

      <Form {...form}>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); void submitWithState(); }}>
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="audienceSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audience Size</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 10,000 subscribers" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton state={state} className="w-full">
            Submit Application
          </SubmitButton>
        </form>
      </Form>

      {problem && (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      )}
    </main>
  );
}
