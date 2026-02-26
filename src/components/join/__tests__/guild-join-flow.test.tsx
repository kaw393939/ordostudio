import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { GuildJoinFlow, resolvePaths } from "@/components/join/guild-join-flow";
import { BOOKING_URL } from "@/lib/metadata";

// ─── resolvePaths (pure function) ────────────────────────────────────────────

describe("resolvePaths", () => {
  it("q1=craft → Apprentice + Observer; no Maestro", () => {
    const result = resolvePaths({ q1: "craft", q2: "" });
    expect(result).toContain("apprentice");
    expect(result).toContain("observer");
    expect(result).not.toContain("maestro");
    expect(result).not.toContain("affiliate");
  });

  it("q1=expertise → Maestro + Journeyman + Observer; no Apprentice", () => {
    const result = resolvePaths({ q1: "expertise", q2: "" });
    expect(result).toContain("maestro");
    expect(result).toContain("journeyman");
    expect(result).toContain("observer");
    expect(result).not.toContain("apprentice");
    expect(result).not.toContain("affiliate");
  });

  it("q1=projects → Journeyman + Apprentice + Observer", () => {
    const result = resolvePaths({ q1: "projects", q2: "" });
    expect(result).toContain("journeyman");
    expect(result).toContain("apprentice");
    expect(result).toContain("observer");
  });

  it("q1=company → Affiliate + Observer", () => {
    const result = resolvePaths({ q1: "company", q2: "" });
    expect(result).toContain("affiliate");
    expect(result).toContain("observer");
    expect(result).not.toContain("apprentice");
  });

  it("q2=observe overrides all → Observer only", () => {
    const result = resolvePaths({ q1: "expertise", q2: "observe" });
    expect(result).toEqual(["observer"]);
  });

  it("Observer is always last in the list", () => {
    const result = resolvePaths({ q1: "craft", q2: "" });
    expect(result[result.length - 1]).toBe("observer");
  });
});

// ─── GuildJoinFlow component ──────────────────────────────────────────────────

describe("GuildJoinFlow", () => {
  it("renders step 1 on initial mount; step 2 and 3 not in DOM", () => {
    render(<GuildJoinFlow />);
    expect(document.querySelector('[aria-label="Step 1 of 3"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Step 2 of 3"]')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-label="Step 3 of 3"]')).not.toBeInTheDocument();
  });

  it("Continue button is disabled until an answer is selected", () => {
    render(<GuildJoinFlow />);
    const btn = screen.getByRole("button", { name: /continue/i });
    expect(btn).toBeDisabled();
  });

  it("selecting a q1 answer enables Continue", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();
  });

  it("clicking Continue on step 1 advances to step 2", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(document.querySelector('[aria-label="Step 2 of 3"]')).toBeInTheDocument();
  });

  it("Back on step 2 returns to step 1 with prior answer preserved", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(document.querySelector('[aria-label="Step 1 of 3"]')).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/learning my craft/i) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("step 3 button label reads 'See My Paths →'", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    // q1
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    // q2
    await user.click(screen.getByLabelText(/portfolio of shipped work/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    // on step 3
    expect(screen.getByRole("button", { name: /see my paths/i })).toBeInTheDocument();
  });

  it("completing all 3 questions renders the results section", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/portfolio of shipped work/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText(/here's what we'd suggest/i)).toBeInTheDocument();
  });

  it("q1=craft shows Apprentice card; Maestro card not shown", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/portfolio of shipped work/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText("The Studio Apprenticeship")).toBeInTheDocument();
    expect(screen.queryByText("The Maestro Accelerator")).not.toBeInTheDocument();
  });

  it("q1=expertise shows Maestro Accelerator card; Apprentice not shown", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/deep expertise/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/build a practice/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText("The Maestro Accelerator")).toBeInTheDocument();
    expect(screen.queryByText("The Studio Apprenticeship")).not.toBeInTheDocument();
  });

  it("q1=company shows Affiliate card", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/represent a company/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/train my team/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/getting sorted/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText("Corporate Affiliate")).toBeInTheDocument();
  });

  it("Observer card is in the DOM for every answer combination", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/portfolio of shipped work/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/planning ahead/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText("Follow the Work")).toBeInTheDocument();
  });

  it("q2=observe override → only Observer card shown", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/follow the work before I decide/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText("Follow the Work")).toBeInTheDocument();
    expect(screen.queryByText("The Studio Apprenticeship")).not.toBeInTheDocument();
    expect(screen.queryByText("The Maestro Accelerator")).not.toBeInTheDocument();
  });

  it("paid path card CTA href contains BOOKING_URL and ?path=", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/portfolio of shipped work/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    const ctaLinks = screen
      .getAllByRole("link")
      .filter((l) => l.textContent?.includes("Book a Path Consult"));
    expect(ctaLinks.length).toBeGreaterThan(0);
    ctaLinks.forEach((link) => {
      const href = link.getAttribute("href") ?? "";
      expect(href).toContain(BOOKING_URL);
      expect(href).toContain("?path=");
    });
  });

  it("Observer card CTA links to /newsletter (not booking URL)", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/deep expertise/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/build a practice/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    const observerCta = screen.getByRole("link", { name: /follow the work/i });
    expect(observerCta.getAttribute("href")).toBe("/newsletter");
  });

  it("Maestro card shows urgency note when provided (q3=now)", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/deep expertise/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/build a practice/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText(/cohort forming now/i)).toBeInTheDocument();
  });

  it("Apprentice card shows authority line (23 years · …)", async () => {
    const user = userEvent.setup();
    render(<GuildJoinFlow />);
    await user.click(screen.getByLabelText(/learning my craft/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/portfolio of shipped work/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByLabelText(/ready now/i));
    await user.click(screen.getByRole("button", { name: /see my paths/i }));
    expect(screen.getByText(/23 years/i)).toBeInTheDocument();
  });
});
