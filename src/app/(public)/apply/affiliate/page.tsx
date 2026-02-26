"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { useSubmitState } from "@/components/forms/use-submit-state";
import { type ProblemDetails } from "@/lib/hal-client";

const affiliateSchema = z.object({
  website: z.string().url("Must be a valid URL"),
  audienceSize: z.string().min(1, "Audience size is required"),
  platform: z.string().min(1, "Please describe where you share content or refer work"),
  audience_description: z.string().min(10, "Please describe your audience or network"),
});

type AffiliateFormValues = z.infer<typeof affiliateSchema>;

export default function AffiliateApplicationPage() {
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(affiliateSchema),
    defaultValues: {
      website: "",
      audienceSize: "",
      platform: "",
      audience_description: "",
    },
  });

  const onSubmit = async (values: AffiliateFormValues) => {
    setProblem(null);

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
    () => form.handleSubmit(onSubmit)(),
  );

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Apply for Affiliate Program</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us about your audience.
      </p>

      <Form {...form}>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submitWithState();
          }}
        >
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

          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Where do you share content or refer work?</FormLabel>
                <FormControl>
                  <Input
                    placeholder="LinkedIn, GitHub, community, etc."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="audience_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Who&apos;s in your audience or network?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the people you reach — their roles, industries, interests..."
                    {...field}
                  />
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
