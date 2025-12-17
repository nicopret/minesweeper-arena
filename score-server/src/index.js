const createFastify = require("fastify");
const cors = require("@fastify/cors");
const config = require("./config");
const dbPlugin = require("./plugins/db");
const prismaPlugin = require("./plugins/prisma");
const authPlugin = require("./plugins/auth");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const scoreRoutes = require("./routes/scores");
const runRoutes = require("./routes/runs");
const leaderboardRoutes = require("./routes/leaderboards");

async function buildServer() {
  const app = createFastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  app.setErrorHandler((err, request, reply) => {
    const statusCode = err.statusCode || err.status || 500;
    if (statusCode >= 500) {
      request.log.error({ err }, "Unhandled error");
    }
    reply
      .code(statusCode)
      .send({ error: err.message || "Internal Server Error" });
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(dbPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(scoreRoutes, { prefix: "/api" });
  await app.register(runRoutes, { prefix: "/api" });
  await app.register(leaderboardRoutes);

  return app;
}

async function start() {
  try {
    const app = await buildServer();
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    // Fastify logs will capture startup errors; rethrow for Heroku visibility.
    console.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { buildServer };
