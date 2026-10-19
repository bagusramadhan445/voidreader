/**
 * Server-side input validation utilities for Void Verse
 */

export function isValidUrl(input: unknown): input is string {
  if (typeof input !== "string" || !input.trim()) return false;
  try {
    const u = new URL(input.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeString(
  input: unknown,
  maxLength = 1000,
  defaultValue = ""
): string {
  if (typeof input !== "string") return defaultValue;
  return input.trim().slice(0, maxLength);
}

export function isValidToolId(toolId: unknown): toolId is string {
  if (typeof toolId !== "string") return false;
  return /^[a-z0-9_-]{2,64}$/i.test(toolId.trim());
}

export function isValidProviderId(providerId: unknown): providerId is string {
  if (typeof providerId !== "string") return false;
  return /^[a-z0-9_-]{2,32}$/i.test(providerId.trim());
}

export function sanitizeTitle(input: unknown, defaultTitle = "file"): string {
  if (typeof input !== "string" || !input.trim()) return defaultTitle;
  return input
    .slice(0, 80)
    .replace(/[^a-zA-Z0-9_\-.]/g, "_")
    .replace(/_+/g, "_");
}

export function toSafeErrorMessage(
  error: unknown,
  fallbackMessage = "Terjadi kesalahan internal pada server."
): string {
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isProd) {
    return fallbackMessage;
  }
  return error instanceof Error ? error.message : fallbackMessage;
}

