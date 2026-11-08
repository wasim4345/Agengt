import { describe, expect, it } from "vitest";
import { pickChannel, pickOrganization } from "./api";

const orgs = [
  { id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "DTW" },
  { id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Other" },
];

const channels = [
  { id: "111111111111111111111111", name: "DTW LinkedIn", service: "linkedin" },
  { id: "222222222222222222222222", name: "DTW X", service: "twitter" },
];

describe("Buffer account guards", () => {
  it("only uses an organization on the connected account", () => {
    expect(pickOrganization(orgs, "bbbbbbbbbbbbbbbbbbbbbbbb").name).toBe("Other");
    expect(() =>
      pickOrganization(orgs, "cccccccccccccccccccccccc"),
    ).toThrow(/not on this connected account/);
  });

  it("only queues to a channel on the connected account", () => {
    expect(
      pickChannel(channels, "111111111111111111111111", "linkedin").service,
    ).toBe("linkedin");
    expect(() =>
      pickChannel(channels, "999999999999999999999999", "linkedin"),
    ).toThrow(/not on this connected account/);
  });

  it("finds a LinkedIn channel when none is specified", () => {
    expect(pickChannel(channels, undefined, "linkedin").id).toBe(
      "111111111111111111111111",
    );
    expect(() => pickChannel(channels, undefined, "instagram")).toThrow(
      /No instagram channel/,
    );
  });
});
