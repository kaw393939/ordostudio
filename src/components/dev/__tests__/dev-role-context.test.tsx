import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { DevRoleProvider, useDevRole } from "../dev-role-context";

describe("DevRoleContext", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DevRoleProvider>{children}</DevRoleProvider>
  );

  it("starts with no override active", () => {
    const { result } = renderHook(() => useDevRole(), { wrapper });
    expect(result.current.isOverrideActive).toBe(false);
    expect(result.current.roleOverride).toBeNull();
  });

  it("setRoleOverride activates the override", () => {
    const { result } = renderHook(() => useDevRole(), { wrapper });
    act(() => result.current.setRoleOverride(["ADMIN"]));
    expect(result.current.isOverrideActive).toBe(true);
    expect(result.current.roleOverride).toEqual(["ADMIN"]);
  });

  it("clearOverride resets to no override", () => {
    const { result } = renderHook(() => useDevRole(), { wrapper });
    act(() => result.current.setRoleOverride(["SUPER_ADMIN"]));
    act(() => result.current.clearOverride());
    expect(result.current.isOverrideActive).toBe(false);
    expect(result.current.roleOverride).toBeNull();
  });
});
