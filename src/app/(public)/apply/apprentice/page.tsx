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
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { useSubmitState } from "@/components/forms/use-submit-state";
import { type ProblemDetails } from "@/lib/hal-client";

const apprenticeSchema = z.object({
  portfolio: z.string().url("Must be a valid URL"),
  experience: z
    .string()
    .min(10, "Please provide more detail about your experience"),
  current_role: z.string().min(1, "Please enter your current role"),
  years_experience: z
    .string()
    .min(1, "Please enter your years of experience")
    .regex(/^\d+$/, "Must be a number"),
});

type ApprenticeFormValues = z.infer<typeof apprenticeSchema>;

export default function ApprenticeApplicationPage() {
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)so_ref=([^;]+)/);
    if (match) setReferralCode(decodeURIComponent(match[1]));
  }, []);

  const form = useForm<ApprenticeFormValues>({
    resolver: zodResolver(apprenticeSchema),
    defaultValues: {
      portfolio: "",
      experience: "",
      current_role: "",
      years_experience: "",
    },
  });

  const onSubmit = async (values: ApprenticeFormValues) => {
    setProblem(null);

    const res = await fetch("/api/v1/roles/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requested_role_name: "APPRENTICE",
        context: {
          ...values,
          ...(referralCode ? { referral_code: referralCode } : {}),
        },
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setProblem(data);
      return;
    }

    router.push("/dashboard?applied=apprentice");
  };

  const { state, handleSubmit: submitWithState } = useSubmitState(
    () => form.handleSubmit(onSubmit)(),
  );

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Apply for Apprentice Program</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us about your background.
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
            name="portfolio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portfolio URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://github.com/yourusername"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your current job title or role</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Software Engineer, Product Manager"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="years_experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Years of professional experience</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="e.g., 3" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Tell us about your background and what brings you here
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Briefly describe your background and what you're looking to get from the program..."
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
