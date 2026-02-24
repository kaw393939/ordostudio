"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ProblemDetailsPanel } from "@/components/problem-details";
import { LoadingState } from "@/components/patterns";
import { follow, getRoot, requestHal, type HalResource, type ProblemDetails } from "@/lib/hal-client";
import { loginSchema, type LoginFormValues } from "@/lib/auth-forms";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useSubmitState } from "@/components/forms/use-submit-state";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const onSubmit = async (values: LoginFormValues) => {
    setProblem(null);

    const root = await getRoot();
    if (!root.ok) {
      setProblem(root.problem);
      return;
    }

    const loginLink = follow(root.data as HalResource, "auth_login");
    if (!loginLink) {
      setProblem({
        type: "about:blank",
        title: "Login Link Missing",
        status: 500,
        detail: "API root did not include auth_login link.",
      });
      return;
    }

    const result = await requestHal<unknown>(loginLink.href, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!result.ok) {
      setProblem(result.problem);
      return;
    }

    router.push(returnTo);
  };

  const { state, handleSubmit: submitWithState } = useSubmitState(
    () => form.handleSubmit(onSubmit)()
  );

  return (
    <main id="main-content" className="mx-auto max-w-md p-6">
      {/* i18n: page title */}
      <h1 className="text-2xl font-semibold">Login</h1>
      {/* i18n: page subtitle */}
      <p className="mt-2 text-sm text-muted-foreground">
        Use your account credentials to sign in.
      </p>

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
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* i18n: submit button */}
          <SubmitButton state={state} className="w-full">
            Sign in
          </SubmitButton>
        </form>
      </Form>

      {problem ? (
        <div className="mt-4">
          <ProblemDetailsPanel problem={problem} />
        </div>
      ) : null}

      {/* i18n: registration prompt */}
      <p className="mt-4 text-sm">
        Need an account? <Link className="underline" href="/register">Register</Link>
      </p>
      <p className="mt-2 text-xs">
        <Link className="underline" href="/terms">Terms</Link> · <Link className="underline" href="/privacy">Privacy</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading" description="Preparing login form." rows={2} />}>
      <LoginForm />
    </Suspense>
  );
}
