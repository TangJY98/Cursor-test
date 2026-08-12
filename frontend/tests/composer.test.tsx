import { describe, expect, it } from "vitest";
import { EMPTY_MESSAGE, MESSAGE_TOO_LONG } from "../src/lib/errors";
import {
  MAX_MESSAGE_LENGTH,
  validateMessage,
} from "../src/lib/validation";

describe("validateMessage", () => {
  it("rejects empty messages", () => {
    expect(validateMessage("")).toBe(EMPTY_MESSAGE);
    expect(validateMessage("   ")).toBe(EMPTY_MESSAGE);
    expect(validateMessage("\n\t")).toBe(EMPTY_MESSAGE);
  });

  it("rejects messages longer than the limit", () => {
    const tooLong = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateMessage(tooLong)).toBe(MESSAGE_TOO_LONG);
  });

  it("accepts valid messages", () => {
    expect(validateMessage("你好")).toBeNull();
    expect(validateMessage("a".repeat(MAX_MESSAGE_LENGTH))).toBeNull();
  });
});

describe("empty-message guard", () => {
  it("blocks whitespace-only composer input before send", () => {
    const candidates = ["", " ", "  \n  "];
    for (const text of candidates) {
      expect(validateMessage(text)).toBe(EMPTY_MESSAGE);
    }
  });
});
