import { describe, expect, it } from "vitest";
import { rejectReason, type GuardInput } from "./apiGuard";

const req = (over: Partial<GuardInput>): GuardInput => ({
  method: "POST",
  host: "localhost:3000",
  origin: "http://localhost:3000",
  secFetchSite: "same-origin",
  ...over,
});

describe("rejectReason", () => {
  it("allows same-origin requests from the app", () => {
    expect(rejectReason(req({}))).toBeNull();
    expect(rejectReason(req({ method: "GET" }))).toBeNull();
  });

  it("allows every loopback host", () => {
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST"]) {
      expect(rejectReason(req({ host, origin: null, secFetchSite: null }))).toBeNull();
    }
  });

  it("rejects non-loopback hosts (DNS rebinding), even for GET", () => {
    expect(rejectReason(req({ method: "GET", host: "evil.example:3000" }))).toBe(
      "host_not_allowed",
    );
    expect(rejectReason(req({ host: "localhost.evil.example" }))).toBe("host_not_allowed");
    expect(rejectReason(req({ host: null }))).toBe("host_not_allowed");
  });

  it("rejects cross-site writes (CSRF)", () => {
    expect(rejectReason(req({ secFetchSite: "cross-site" }))).toBe("cross_site");
    expect(rejectReason(req({ secFetchSite: "same-site" }))).toBe("cross_site");
    expect(
      rejectReason(req({ secFetchSite: null, origin: "https://evil.example" })),
    ).toBe("cross_site");
    expect(rejectReason(req({ secFetchSite: null, origin: "null" }))).toBe("cross_site");
    expect(
      rejectReason(req({ secFetchSite: null, origin: "http://localhost:4000" })),
    ).toBe("cross_site");
  });

  it("does not apply the origin check to safe methods", () => {
    expect(rejectReason(req({ method: "GET", secFetchSite: "cross-site" }))).toBeNull();
  });

  it("allows non-browser clients with no origin headers", () => {
    expect(rejectReason(req({ origin: null, secFetchSite: null }))).toBeNull();
  });
});
