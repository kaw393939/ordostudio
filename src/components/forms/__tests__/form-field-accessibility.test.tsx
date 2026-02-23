/**
 * Sprint 46 — TDD Step 1: Form field accessibility contract.
 *
 * Every <FormField> wrapper must output correct id, htmlFor,
 * aria-describedby, aria-invalid, and aria-required attributes.
 * Every input must have a persistent visible <label>.
 */
import { render, screen } from "@testing-library/react";
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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// ── Test helpers ──────────────────────────────────────────────

const simpleSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  name: z.string().min(1, "Name is required."),
});

function TestForm({ onSubmit }: { onSubmit?: (v: z.infer<typeof simpleSchema>) => void }) {
  const form = useForm<z.infer<typeof simpleSchema>>({
    resolver: zodResolver(simpleSchema),
    defaultValues: { email: "", name: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit ?? (() => {}))(e)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., john@example.com" {...field} />
              </FormControl>
              <FormDescription>Your work email address.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
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

describe("Form field accessibility contract", () => {
  it("every input has a visible persistent <label> with correct htmlFor", () => {
    render(<TestForm />);

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput.tagName).toBe("INPUT");

    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toBeInTheDocument();
    expect(nameInput.tagName).toBe("INPUT");
  });

  it("label text is always visible (not placeholder-only)", () => {
    render(<TestForm />);

    // Labels are visible elements, not just placeholders
    const emailLabel = screen.getByText("Email");
    expect(emailLabel).toBeVisible();
    expect(emailLabel.tagName).toBe("LABEL");

    const nameLabel = screen.getByText("Name");
    expect(nameLabel).toBeVisible();
    expect(nameLabel.tagName).toBe("LABEL");
  });

  it("input has correct id matching label htmlFor", () => {
    render(<TestForm />);

    const emailLabel = screen.getByText("Email");
    const htmlFor = emailLabel.getAttribute("for");
    expect(htmlFor).toBeTruthy();

    const emailInput = document.getElementById(htmlFor!);
    expect(emailInput).toBeTruthy();
    expect(emailInput?.tagName).toBe("INPUT");
  });

  it("input has aria-describedby linking to description", () => {
    render(<TestForm />);

    const emailInput = screen.getByLabelText("Email");
    const describedBy = emailInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    // Should point to the description element
    const desc = document.getElementById(describedBy!.split(" ")[0]);
    expect(desc).toBeTruthy();
    expect(desc?.textContent).toContain("Your work email address");
  });

  it("input has aria-invalid=false when no errors", () => {
    render(<TestForm />);

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput.getAttribute("aria-invalid")).toBe("false");
  });

  it("input gets aria-invalid=true after validation error", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    // Submit empty form to trigger validation
    await user.click(screen.getByRole("button", { name: "Submit" }));

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("error message appears and is linked via aria-describedby", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    // Error message should be visible
    const errorMsg = screen.getByText("Enter a valid email address.");
    expect(errorMsg).toBeVisible();

    // The input's aria-describedby should include the error message id
    const emailInput = screen.getByLabelText("Email");
    const describedBy = emailInput.getAttribute("aria-describedby") || "";
    const ids = describedBy.split(" ");
    const errorId = errorMsg.getAttribute("id");
    expect(ids).toContain(errorId);
  });

  it("placeholder is supplementary hint, not the label", () => {
    render(<TestForm />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.placeholder).toBe("e.g., john@example.com");
    // The label "Email" is a separate visible element
    expect(screen.getByText("Email").tagName).toBe("LABEL");
  });
});
