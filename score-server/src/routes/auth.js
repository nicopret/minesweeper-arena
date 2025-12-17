const { verifyGoogleIdToken } = require("../providers/google");
const { verifyFacebookAccessToken } = require("../providers/facebook");

function providerVerifier(provider) {
  if (provider === "google") return verifyGoogleIdToken;
  if (provider === "facebook") return verifyFacebookAccessToken;
  const err = new Error(`Unsupported provider: ${provider}`);
  err.statusCode = 400;
  throw err;
}

async function findOrCreateUserFromIdentity(prisma, identity) {
  const existing = await prisma.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      },
    },
    include: { user: true },
  });

  if (existing && existing.user) {
    // Backfill email opportunistically (best-effort).
    if (identity.email && !existing.email) {
      await prisma.authIdentity.update({
        where: { id: existing.id },
        data: { email: identity.email },
      });
    }
    return existing.user;
  }

  return prisma.user.create({
    data: {
      displayName: identity.displayName,
      isGuest: false,
      identities: {
        create: {
          provider: identity.provider,
          providerUserId: identity.providerUserId,
          email: identity.email,
        },
      },
    },
  });
}

async function linkIdentityToUser(prisma, userId, identity) {
  const existing = await prisma.authIdentity.findUnique({
    where: {
      provider_providerUserId: {
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      },
    },
  });

  if (existing) {
    if (existing.userId !== userId) {
      const err = new Error("Identity already linked to another user.");
      err.statusCode = 409;
      throw err;
    }
    return existing;
  }

  return prisma.authIdentity.create({
    data: {
      userId,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      email: identity.email,
    },
  });
}

module.exports = async function (fastify) {
  // POST /auth/google/login, /auth/facebook/login
  fastify.post("/auth/:provider/login", {
    schema: {
      params: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["google", "facebook"] },
        },
        required: ["provider"],
      },
      body: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
        required: ["token"],
      },
    },
    handler: async (request) => {
      const provider = request.params.provider;
      const verify = providerVerifier(provider);
      const verified = await verify(request.body.token);

      const user = await findOrCreateUserFromIdentity(fastify.prisma, verified);

      const jwt = fastify.jwt.sign(
        {
          sub: user.id,
          displayName: user.displayName,
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
      );

      return {
        token: jwt,
        user: {
          id: user.id,
          displayName: user.displayName,
          isGuest: user.isGuest,
          createdAt: user.createdAt,
        },
      };
    },
  });

  // POST /auth/google/link, /auth/facebook/link (requires JWT)
  fastify.post("/auth/:provider/link", {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["google", "facebook"] },
        },
        required: ["provider"],
      },
      body: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
        required: ["token"],
      },
    },
    handler: async (request, reply) => {
      const provider = request.params.provider;
      const verify = providerVerifier(provider);
      const verified = await verify(request.body.token);

      const userId = request.user && request.user.sub;
      if (!userId) {
        reply.code(401);
        return { error: "Unauthorized" };
      }

      const identity = await linkIdentityToUser(
        fastify.prisma,
        userId,
        verified,
      );
      return {
        linked: true,
        identity: {
          id: identity.id,
          provider: identity.provider,
          providerUserId: identity.providerUserId,
          email: identity.email,
          createdAt: identity.createdAt,
        },
      };
    },
  });
};
