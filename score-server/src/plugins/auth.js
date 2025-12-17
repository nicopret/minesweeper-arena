const fp = require("fastify-plugin");
const jwt = require("@fastify/jwt");

module.exports = fp(async (fastify) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required to start the server.");
  }

  await fastify.register(jwt, {
    secret,
  });

  fastify.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });
});
