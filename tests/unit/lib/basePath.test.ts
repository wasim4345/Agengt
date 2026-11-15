import { afterEach, describe, expect, it } from "vitest";
import { getBasePath, withBasePath } from "@/lib/basePath";

describe("basePath helpers", () => {
  const original = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = original;
  });

  it("returns empty base locally", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(getBasePath()).toBe("");
    expect(withBasePath("/leadership/")).toBe("/leadership/");
  });

  it("prefixes GitHub Pages project base", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/Agengt";
    expect(withBasePath("/leadership/")).toBe("/Agengt/leadership/");
    expect(withBasePath("/Agengt/leadership/")).toBe("/Agengt/leadership/");
  });
});
