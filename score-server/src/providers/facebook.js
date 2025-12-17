function getFacebookAppCreds() {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required for Facebook token verification.",
    );
  }
  return { appId, appSecret };
}

async function verifyFacebookAccessToken(accessToken) {
  if (!accessToken) {
    const err = new Error("Missing Facebook token.");
    err.statusCode = 400;
    throw err;
  }

  const { appId, appSecret } = getFacebookAppCreds();

  // Validate token using Graph API debug endpoint.
  // Docs: https://developers.facebook.com/docs/graph-api/reference/debug_token/
  const appAccessToken = `${appId}|${appSecret}`;
  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", appAccessToken);

  const debugRes = await fetch(debugUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!debugRes.ok) {
    const body = await debugRes.text();
    const err = new Error(`Facebook token verification failed: ${body}`);
    err.statusCode = 401;
    throw err;
  }

  const debugJson = await debugRes.json();
  const data = debugJson && debugJson.data;

  if (!data || !data.is_valid || !data.user_id) {
    const err = new Error("Invalid Facebook access token.");
    err.statusCode = 401;
    throw err;
  }

  if (String(data.app_id) !== String(appId)) {
    const err = new Error("Facebook token app_id mismatch.");
    err.statusCode = 401;
    throw err;
  }

  // Optional: fetch email/profile. Many apps require explicit permissions; treat as best-effort.
  let email = null;
  let displayName = null;
  try {
    const meUrl = new URL("https://graph.facebook.com/me");
    meUrl.searchParams.set("fields", "id,name,email");
    meUrl.searchParams.set("access_token", accessToken);
    const meRes = await fetch(meUrl, {
      headers: { Accept: "application/json" },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      email = me.email || null;
      displayName = me.name || null;
    }
  } catch {
    // ignore optional profile fetch errors
  }

  return {
    provider: "facebook",
    providerUserId: String(data.user_id),
    email,
    displayName,
  };
}

module.exports = { verifyFacebookAccessToken };
