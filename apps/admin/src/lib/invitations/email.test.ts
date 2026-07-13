import { describe, expect, it } from "vitest";
import { buildInvitationUrl } from "./email";

describe("invitation email helpers", () => {
  it("builds tokenized invitation acceptance links from the configured base URL", () => {
    expect(buildInvitationUrl("http://localhost:3000", "raw token")).toBe(
      "http://localhost:3000/invite/accept?token=raw+token",
    );
  });
});
