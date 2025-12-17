import { describe, expect, it } from "vitest";
import { decodeJwtPayload } from "./jwtUtils";

const base64UrlEncodeJson = (value: unknown): string => {
  const json = JSON.stringify(value);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

describe("decodeJwtPayload", () => {
  it("decodes the payload portion of a JWT", () => {
    const header = base64UrlEncodeJson({ alg: "none", typ: "JWT" });
    const payload = base64UrlEncodeJson({
      given_name: "Nico",
      name: "Nico Pretorius",
      email: "nico@example.com",
    });

    const jwt = `${header}.${payload}.sig`;
    const decoded = decodeJwtPayload<{ given_name: string; email: string }>(
      jwt,
    );

    expect(decoded.given_name).toBe("Nico");
    expect(decoded.email).toBe("nico@example.com");
  });

  it("throws on invalid JWTs", () => {
    expect(() => decodeJwtPayload("not-a-jwt")).toThrow(/Invalid JWT/i);
  });
});
