import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleGate } from "@/components/RoleGate";
import { createTestStore } from "@/store/store";
import { buildDefaultSeed } from "@/seed";

describe("RoleGate", () => {
  it("renders children for an allowed role", () => {
    createTestStore(buildDefaultSeed("2026-11-12"));
    render(
      <RoleGate allow={["leadership"]}>
        <p>Secret dashboard</p>
      </RoleGate>,
    );
    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
    expect(
      screen.queryByText("Not available for this role"),
    ).not.toBeInTheDocument();
  });

  it("renders the not-available card and omits children for other roles", () => {
    const store = createTestStore(buildDefaultSeed("2026-11-12"));
    store.getState().setUser("usr_rahul");

    render(
      <RoleGate allow={["leadership"]}>
        <p>Secret dashboard</p>
      </RoleGate>,
    );

    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
    expect(
      screen.getByText("Not available for this role"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Go to Client home/i }),
    ).toBeInTheDocument();
  });
});
