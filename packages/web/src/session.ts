import type { GunsoleClient } from "@gunsole/core";

export const GUNSOLE_SESSION_COOKIE = "gunsole_session";

/**
 * Persist session ID in a cookie. Reads an existing cookie if present,
 * otherwise writes the client's auto-generated session ID to the cookie.
 * Returns the session ID.
 */
export function persistSession(
  client: GunsoleClient,
  cookieName: string = GUNSOLE_SESSION_COOKIE,
): string {
  if (typeof document === "undefined") {
    return client.getSessionId() ?? "";
  }

  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${cookieName}=`));

  if (match) {
    const value = match.split("=")[1];
    client.setSessionId(value);
    return value;
  }

  const sessionId = client.getSessionId() ?? "";
  if (sessionId) {
    document.cookie = `${cookieName}=${sessionId}; path=/; SameSite=Lax`;
  }
  return sessionId;
}
