"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { LoadingState } from "@/components/patterns";
import { follow, getRoot, requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";
import { registerSchema, type RegisterFormValues } from "@/lib/auth-forms";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useSubmitState } from "@/components/forms/use-submit-state";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
    mode: "onTouched",
  });

  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const onSubmit = async (values: RegisterFormValues) => {
    setProblem(null);

    const root = await getRoot();
    if (!root.ok) {
      setProblem(root.problem);
      return;
    }

    const registerLink = follow(root.data as HalResource, "auth_register");
    if (!registerLink) {
      setProblem({
        type: "about:blank",
        title: "Register Link Missing",
        status: 500,
        detail: "API root did not include auth_register link.",
      });
      return;
    }

    const result = await requestHal<unknown>(registerLink.href, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        terms_accepted: values.termsAccepted,
      }),
    });

    if (!result.ok) {
      setProblem(result.problem);
      return;
    }

    if (role === "affiliate") {
      router.push("/login?returnTo=/apply/affiliate");
    } else if (role === "apprentice") {
      router.push("/login?returnTo=/apply/apprentice");
    } else {
      router.push("/login");
    }
  };

  const { state, handleSubmit: submitWithState } = useSubmitState(
    () => form.handleSubmit(onSubmit)()
  );

  return (
    <main id="main-content" className="mx-auto max-w-md p-6">
      {/* i18n: page title */}
      <h1 className="text-2xl font-semibold">Register</h1>
      {/* i18n: page subtitle */}
      <p className="mt-2 text-sm text-muted-foreground">Create a new account.</p>

      <Form {...form}>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); void submitWithState(); }}
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="e.g., john@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Must be at least 8 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I agree to the{" "}
                    <Link className="underline" href="/terms">Terms</Link> and{" "}
                    <Link className="underline" href="/privacy">Privacy</Link>.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* i18n: submit button */}
          <SubmitButton state={state} className="w-full">
            Create account
          </SubmitButton>
        </form>
      </Form>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {/* i18n: login prompt */}
      <p className="mt-4 text-sm">
        Already have an account? <Link className="underline" href="/login">Login</Link>
      </p>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading" description="Preparing registration form." rows={2} />}>
      <RegisterForm />
    </Suspense>
  );
}
