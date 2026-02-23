/**
 * Sprint 46 — TDD Step 5: Combobox / searchable select.
 *
 * - Keyboard-navigable results
 * - Debounced remote search
 * - Loading indicator and empty-state
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchSelect } from "@/components/forms/search-select";

const options = [
  { value: "alice", label: "Alice Johnson" },
  { value: "bob", label: "Bob Smith" },
  { value: "carol", label: "Carol Williams" },
];

describe("SearchSelect (combobox)", () => {
  it("renders with placeholder text", () => {
    render(
      <SearchSelect
        options={options}
        value=""
        onValueChange={() => {}}
        placeholder="Select a user..."
      />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Select a user...")).toBeInTheDocument();
  });

  it("opens dropdown and shows all options when clicked", async () => {
    const user = userEvent.setup();

    render(
      <SearchSelect
        options={options}
        value=""
        onValueChange={() => {}}
        placeholder="Select a user..."
      />
    );

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeVisible();
      expect(screen.getByText("Bob Smith")).toBeVisible();
      expect(screen.getByText("Carol Williams")).toBeVisible();
    });
  });

  it("filters options when typing", async () => {
    const user = userEvent.setup();

    render(
      <SearchSelect
        options={options}
        value=""
        onValueChange={() => {}}
        placeholder="Select a user..."
      />
    );

    await user.click(screen.getByRole("combobox"));

    // Type to filter
    const searchInput = screen.getByPlaceholderText("Search...");
    await user.type(searchInput, "alice");

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeVisible();
      expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
    });
  });

  it("calls onValueChange when an option is selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SearchSelect
        options={options}
        value=""
        onValueChange={onValueChange}
        placeholder="Select a user..."
      />
    );

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByText("Bob Smith")).toBeVisible();
    });

    await user.click(screen.getByText("Bob Smith"));

    expect(onValueChange).toHaveBeenCalledWith("bob");
  });

  it("shows 'No results' when nothing matches", async () => {
    const user = userEvent.setup();

    render(
      <SearchSelect
        options={options}
        value=""
        onValueChange={() => {}}
        placeholder="Select a user..."
      />
    );

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search..."), "zzzzz");

    await waitFor(() => {
      expect(screen.getByText("No results found.")).toBeVisible();
    });
  });

  it("shows selected value label", () => {
    render(
      <SearchSelect
        options={options}
        value="bob"
        onValueChange={() => {}}
        placeholder="Select a user..."
      />
    );

    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
  });
});
