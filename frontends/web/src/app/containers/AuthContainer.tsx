import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  initAuthFromStorage,
  link,
  loadLeaderboard,
  login,
  logout,
  setMessage,
} from "../store/scoreServerSlice";
import { getModeFromGameState } from "../utils/modeUtils";
import type { Provider } from "../lib/scoreServerApi";

type PendingProviderAction =
  | { kind: "login"; provider: Provider }
  | { kind: "link"; provider: Provider }
  | null;

const AuthContainer = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const game = useAppSelector((s) => s.game);
  const { token, displayName, message, loginStatus, linkStatus } =
    useAppSelector((s) => s.scoreServer);

  const mode = useMemo(() => getModeFromGameState(game), [game]);
  const pendingActionRef = useRef<PendingProviderAction>(null);
  const googleInitializedRef = useRef(false);
  const facebookInitializedRef = useRef(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  const hasGoogleClientId =
    !!googleClientId &&
    googleClientId !== "undefined" &&
    googleClientId !== "null";

  useEffect(() => {
    void dispatch(initAuthFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (!token) return;
    void dispatch(loadLeaderboard({ mode }));
  }, [dispatch, mode, token]);

  const ensureGoogleInitialized = useCallback((): boolean => {
    if (!hasGoogleClientId) return false;
    if (googleInitializedRef.current) return true;
    if (!window.google?.accounts?.id) return false;

    window.google.accounts.id.initialize({
      client_id: googleClientId!,
      callback: (response) => {
        const credential = response.credential;
        if (!credential) {
          dispatch(setMessage("Google login failed: missing credential."));
          return;
        }

        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        if (!action) {
          dispatch(
            setMessage(
              "Received Google credential, but no action was pending.",
            ),
          );
          return;
        }

        if (action.kind === "login") {
          void dispatch(login({ provider: "google", token: credential }));
        } else {
          void dispatch(link({ provider: "google", token: credential }));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    googleInitializedRef.current = true;
    return true;
  }, [dispatch, googleClientId, hasGoogleClientId]);

  // Best-effort: initialize if the SDK is already available.
  useEffect(() => {
    ensureGoogleInitialized();
  }, [ensureGoogleInitialized]);

  // Initialize Facebook SDK callback. The script calls window.fbAsyncInit when ready.
  useEffect(() => {
    if (!facebookAppId) return;
    if (facebookInitializedRef.current) return;

    window.fbAsyncInit = () => {
      if (!window.FB) return;
      window.FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      facebookInitializedRef.current = true;
    };
  }, [facebookAppId]);

  const triggerGoogle = useCallback(
    (kind: "login" | "link") => {
      if (!hasGoogleClientId) {
        dispatch(
          setMessage(
            "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in score-server/.env (restart dev server after adding it).",
          ),
        );
        return;
      }
      if (!window.google?.accounts?.id) {
        dispatch(
          setMessage("Google SDK not loaded yet. Try again in a moment."),
        );
        return;
      }

      if (!ensureGoogleInitialized()) {
        dispatch(
          setMessage("Google SDK not initialized yet. Try again in a moment."),
        );
        return;
      }

      pendingActionRef.current = { kind, provider: "google" };

      // This triggers the Google One Tap / prompt flow. If it doesn't appear,
      // you may need to use the provider's full OAuth flow (or allow third-party cookies).
      window.google.accounts.id.prompt();
    },
    [dispatch, ensureGoogleInitialized, hasGoogleClientId],
  );

  const triggerFacebook = useCallback(
    (kind: "login" | "link") => {
      if (!facebookAppId) {
        dispatch(
          setMessage(
            "Missing NEXT_PUBLIC_FACEBOOK_APP_ID in score-server/.env.",
          ),
        );
        return;
      }
      if (!window.FB) {
        dispatch(
          setMessage("Facebook SDK not loaded yet. Try again in a moment."),
        );
        return;
      }

      pendingActionRef.current = { kind, provider: "facebook" };

      window.FB.login(
        (response) => {
          const accessToken = response.authResponse?.accessToken;
          const action = pendingActionRef.current;
          pendingActionRef.current = null;

          if (!accessToken) {
            dispatch(setMessage("Facebook login failed or was cancelled."));
            return;
          }
          if (!action) {
            dispatch(
              setMessage("Received Facebook token, but no action was pending."),
            );
            return;
          }

          if (action.kind === "login") {
            void dispatch(login({ provider: "facebook", token: accessToken }));
          } else {
            void dispatch(link({ provider: "facebook", token: accessToken }));
          }
        },
        { scope: "public_profile,email" },
      );
    },
    [dispatch, facebookAppId],
  );

  const onLogin = useCallback(
    (provider: Provider) => {
      if (provider === "google") return triggerGoogle("login");
      return triggerFacebook("login");
    },
    [triggerFacebook, triggerGoogle],
  );

  const onLink = useCallback(
    (provider: Provider) => {
      if (provider === "google") return triggerGoogle("link");
      return triggerFacebook("link");
    },
    [triggerFacebook, triggerGoogle],
  );

  const onLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return (
    <div className="mb-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="small text-muted">
          Mode: <code>{mode}</code>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {!token ? (
            <>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                disabled={loginStatus === "loading"}
                onClick={() => onLogin("google")}
              >
                Login (Google)
              </button>
              <button
                type="button"
                className="btn btn-outline-dark btn-sm"
                disabled={loginStatus === "loading"}
                onClick={() => onLogin("facebook")}
              >
                Login (Facebook)
              </button>
            </>
          ) : (
            <>
              <span className="small">
                Logged in as{" "}
                <strong>{displayName ? displayName : "user"}</strong>
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {token ? (
        <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
          <span className="small text-muted">Link account:</span>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            disabled={linkStatus === "loading"}
            onClick={() => onLink("google")}
          >
            Link Google
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            disabled={linkStatus === "loading"}
            onClick={() => onLink("facebook")}
          >
            Link Facebook
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="alert alert-info py-2 px-3 mt-2 mb-0" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <span>{message}</span>
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none"
              onClick={() => dispatch(setMessage(null))}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AuthContainer;
