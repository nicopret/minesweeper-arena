"use client";

import React, { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearUser, setUser } from "../../store/authSlice";
import { decodeJwtPayload } from "../../utils/jwtUtils";

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleIdTokenPayload = {
  given_name?: string;
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
};

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_SCRIPT_ID = "google-identity-services";

let googleScriptPromise: Promise<void> | null = null;
let nativeGoogleAuthInitPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      GOOGLE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google login script.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google login script."));

    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

const getFirstName = (payload: GoogleIdTokenPayload): string => {
  if (payload.given_name) return payload.given_name;
  if (payload.name) return payload.name.split(" ")[0];
  return "Player";
};

const isGoogleCredentialResponse = (
  value: unknown,
): value is GoogleCredentialResponse => {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Record<string, unknown>;
  return (
    !("credential" in maybe) ||
    typeof maybe.credential === "string" ||
    typeof maybe.credential === "undefined"
  );
};

const ensureNativeGoogleAuthInitialized = async (
  clientId: string,
): Promise<void> => {
  if (nativeGoogleAuthInitPromise) return nativeGoogleAuthInitPromise;

  nativeGoogleAuthInitPromise = (async () => {
    const mod = await import("@codetrix-studio/capacitor-google-auth");
    const GoogleAuth = (mod as { GoogleAuth?: unknown }).GoogleAuth as
      | {
          initialize?: (opts: { clientId: string; scopes?: string[] }) => void;
        }
      | undefined;

    GoogleAuth?.initialize?.({ clientId, scopes: ["profile", "email"] });
  })();

  return nativeGoogleAuthInitPromise;
};

export default function GoogleLoginPanel() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const scoreboardApiBase = process.env.NEXT_PUBLIC_SCOREBOARD_API_BASE_URL;
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isNative = Capacitor.isNativePlatform?.() ?? false;

  const buttonRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);

  const callScoreboardIdentity = async (
    provider: string,
    providerUserId: string | undefined,
  ): Promise<{
    userId?: string;
    createdAt?: string | null;
    lastSeenAt?: string | null;
  } | null> => {
    if (!scoreboardApiBase || !providerUserId) return null;
    const url = `${scoreboardApiBase.replace(/\/$/, "")}/user`;
    try {
      setIdentityLoading(true);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, providerUserId }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        userId?: string;
        createdAt?: string;
        lastSeenAt?: string;
      };
      return {
        userId: data.userId,
        createdAt: data.createdAt ?? null,
        lastSeenAt: data.lastSeenAt ?? null,
      };
    } catch (err) {
      console.warn("Scoreboard identity lookup failed:", err);
      return null;
    } finally {
      setIdentityLoading(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      const menuEl = menuRef.current;
      const buttonEl = avatarButtonRef.current;
      if (!target || !menuEl || !buttonEl) return;
      if (menuEl.contains(target) || buttonEl.contains(target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (isNative) return;
    if (!clientId) return;

    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleScript();
        if (cancelled) return;

        const google = window.google;
        const googleId = google?.accounts?.id;
        if (!googleId) {
          setError("Google login failed to initialize.");
          return;
        }

        if (!initializedRef.current) {
          if (typeof googleId.initialize !== "function") {
            setError("Google login failed to initialize.");
            return;
          }

          googleId.initialize({
            client_id: clientId,
            callback: (response: unknown) => {
              try {
                if (!isGoogleCredentialResponse(response)) return;
                if (!response.credential) return;
                const payload = decodeJwtPayload<GoogleIdTokenPayload>(
                  response.credential,
                );
                void (async () => {
                  const identity = await callScoreboardIdentity(
                    "google",
                    payload.sub,
                  );
                  dispatch(
                    setUser({
                      firstName: getFirstName(payload),
                      fullName: payload.name,
                      email: payload.email,
                      pictureUrl: payload.picture,
                      userId: identity?.userId,
                      createdAt: identity?.createdAt,
                      lastSeenAt: identity?.lastSeenAt,
                    }),
                  );
                })();
              } catch {
                setError("Could not read Google profile data.");
              }
            },
          });
          initializedRef.current = true;
        }

        // When the user logs out, the button DOM node is recreated. Re-render
        // the Google button into the current container.
        if (user) return;
        if (!buttonRef.current) return;

        if (typeof googleId.renderButton !== "function") {
          setError("Google login failed to initialize.");
          return;
        }

        buttonRef.current.innerHTML = "";
        googleId.renderButton(buttonRef.current, {
          theme: "outline",
          size: "medium",
          shape: "pill",
          text: "signin_with",
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Google login failed.");
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [clientId, dispatch, isNative, user]);

  if (user) {
    return (
      <div className="position-relative">
        <button
          ref={avatarButtonRef}
          type="button"
          className="btn p-0 border-0 bg-transparent"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Open account menu"
          onClick={() => setMenuOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMenuOpen(false);
          }}
        >
          {user.pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.pictureUrl}
              alt="Google profile"
              width={32}
              height={32}
              style={{ borderRadius: "50%", display: "block" }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#e9ecef",
                color: "#212529",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {user.firstName?.[0]?.toUpperCase() ?? "U"}
            </span>
          )}
        </button>

        {user.userId ? (
          <div className="small text-muted text-end mt-1">
            User ID: {user.userId}
          </div>
        ) : null}

        {menuOpen ? (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Account menu"
            className="dropdown-menu show"
            style={{ right: 0, left: "auto" }}
          >
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                void (async () => {
                  setMenuOpen(false);
                  try {
                    if (isNative && clientId) {
                      await ensureNativeGoogleAuthInitialized(clientId);
                      const mod =
                        await import("@codetrix-studio/capacitor-google-auth");
                      const GoogleAuth = (mod as { GoogleAuth?: unknown })
                        .GoogleAuth as
                        | { signOut?: () => Promise<void> }
                        | undefined;
                      await GoogleAuth?.signOut?.();
                    } else {
                      window.google?.accounts?.id?.disableAutoSelect?.();
                    }
                  } finally {
                    dispatch(clearUser());
                  }
                })();
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="small text-muted">
        Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable Google login.
      </div>
    );
  }

  if (isNative) {
    return (
      <div className="d-flex flex-column align-items-end gap-1">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            void (async () => {
              try {
                setError(null);
                await ensureNativeGoogleAuthInitialized(clientId);
                const mod =
                  await import("@codetrix-studio/capacitor-google-auth");
                const GoogleAuth = (mod as { GoogleAuth?: unknown })
                  .GoogleAuth as
                  | { signIn?: () => Promise<unknown> }
                  | undefined;

                if (!GoogleAuth?.signIn) {
                  setError("Google sign-in is not available on this device.");
                  return;
                }

                const result = (await GoogleAuth.signIn()) as Record<
                  string,
                  unknown
                >;

                const givenName =
                  typeof result.givenName === "string"
                    ? result.givenName
                    : typeof result.given_name === "string"
                      ? result.given_name
                      : undefined;
                const fullName =
                  typeof result.name === "string" ? result.name : undefined;
                const email =
                  typeof result.email === "string" ? result.email : undefined;
                const pictureUrl =
                  typeof result.imageUrl === "string"
                    ? result.imageUrl
                    : typeof result.picture === "string"
                      ? result.picture
                      : undefined;

                const idToken =
                  typeof result.idToken === "string"
                    ? result.idToken
                    : typeof result.id_token === "string"
                      ? result.id_token
                      : undefined;

                let providerUserId: string | undefined;
                if (idToken) {
                  try {
                    const nativePayload =
                      decodeJwtPayload<GoogleIdTokenPayload>(idToken);
                    providerUserId = nativePayload.sub;
                  } catch {
                    providerUserId = undefined;
                  }
                }

                const identity = await callScoreboardIdentity(
                  "google",
                  providerUserId,
                );

                dispatch(
                  setUser({
                    firstName: givenName ?? fullName?.split(" ")[0] ?? "Player",
                    fullName,
                    email,
                    pictureUrl,
                    userId: identity?.userId,
                    createdAt: identity?.createdAt,
                    lastSeenAt: identity?.lastSeenAt,
                  }),
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Google sign-in failed.",
                );
              }
            })();
          }}
        >
          Sign in with Google
        </button>
        {error ? <div className="small text-muted">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column align-items-end gap-1">
      <div ref={buttonRef} />
      {error && !isNative ? (
        <div className="small text-danger">{error}</div>
      ) : null}
      {identityLoading ? (
        <div className="small text-muted">Syncing scoreboard identity…</div>
      ) : null}
    </div>
  );
}
