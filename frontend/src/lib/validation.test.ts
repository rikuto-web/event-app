import { describe, expect, it } from "vitest";
import { validateEmail, validatePassword } from "./validation";

describe("validation", () => {
  it("rejects invalid email formats", () => {
    expect(validateEmail("not-an-email")).toBe("形式が正しくありません");
    expect(validateEmail("missing@domain")).toBe("形式が正しくありません");
  });

  it("accepts valid email", () => {
    expect(validateEmail("alice@example.com")).toBeNull();
  });

  it("rejects short passwords while typing", () => {
    expect(validatePassword("abc")).toBe("8文字以上で入力");
  });

  it("accepts valid password", () => {
    expect(validatePassword("secret123")).toBeNull();
  });
});
