/**
 * Sprint 46 — TDD Step 2: Validation timing.
 *
 * - No error on pristine/untouched field
 * - Error appears on blur (first touch)
 * - Error clears on valid change (after first error)
 * - Validate on change after first blur error
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// ── Helper form that validates on blur then onChange ────────

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});

function BlurThenChangeForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
    mode: "onTouched",      // validate on blur first, then onChange after touch
  });

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(() => {})(e)}>
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
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

// ── Tests ─────────────────────────────────────────────────────

describe("Validation timing: blur-then-change strategy", () => {
  it("no error is shown on a pristine (untouched) field", () => {
    render(<BlurThenChangeForm />);
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
  });

  it("error appears after blur on an invalid field", async () => {
    const user = userEvent.setup();
    render(<BlurThenChangeForm />);

    const input = screen.getByLabelText("Email");
    await user.click(input);
    await user.tab(); // blur

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    });
  });

  it("error clears when the user types a valid value after blur", async () => {
    const user = userEvent.setup();
    render(<BlurThenChangeForm />);

    const input = screen.getByLabelText("Email");
    // Trigger blur validation
    await user.click(input);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    });

    // Now type a valid value — error should clear via onChange revalidation
    await user.click(input);
    await user.type(input, "valid@example.com");

    await waitFor(() => {
      expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    });
  });

  it("error reappears on change when the value becomes invalid again", async () => {
    const user = userEvent.setup();
    render(<BlurThenChangeForm />);

    const input = screen.getByLabelText("Email");

    // Trigger initial blur validation
    await user.click(input);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    });

    // Type valid value — error clears
    await user.click(input);
    await user.type(input, "valid@example.com");
    await waitFor(() => {
      expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    });

    // Clear the field — error should reappear via onChange
    await user.clear(input);

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    });
  });
});
