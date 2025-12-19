export type JwtPayload = Record<string, unknown>;

const decodeBase64ToUtf8 = (base64: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf8");
  }

  if (typeof atob !== "function") {
    throw new Error("No base64 decoder available in this environment.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }

  let ascii = "";
  for (let i = 0; i < bytes.length; i++) {
    ascii += String.fromCharCode(bytes[i]);
  }
  return ascii;
};

const base64UrlToBase64 = (base64Url: string): string => {
  const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  return normalized + "=".repeat(padLength);
};

export const decodeJwtPayload = <T extends JwtPayload = JwtPayload>(
  jwt: string,
): T => {
  const parts = jwt.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid JWT: expected at least 2 parts.");
  }

  const payloadBase64 = base64UrlToBase64(parts[1]);
  const payloadJson = decodeBase64ToUtf8(payloadBase64);
  return JSON.parse(payloadJson) as T;
};
