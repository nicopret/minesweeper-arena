const { OAuth2Client } = require("google-auth-library");

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "GOOGLE_CLIENT_ID is required for Google token verification.",
    );
  }
  return clientId;
}

async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    const err = new Error("Missing Google token.");
    err.statusCode = 400;
    throw err;
  }

  const clientId = getGoogleClientId();
  const client = new OAuth2Client(clientId);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    const err = new Error("Invalid Google token payload.");
    err.statusCode = 401;
    throw err;
  }

  return {
    provider: "google",
    providerUserId: payload.sub,
    email: payload.email || null,
    displayName: payload.name || null,
  };
}

module.exports = { verifyGoogleIdToken };
