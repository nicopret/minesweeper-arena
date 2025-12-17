const fp = require("fastify-plugin");
const { Pool } = require("pg");
const config = require("../config");

module.exports = fp(async (fastify) => {
  if (!config.database.connectionString) {
    throw new Error("DATABASE_URL is required to start the Postgres pool.");
  }

  const pool = new Pool({
    connectionString: config.database.connectionString,
    max: config.database.poolMax,
    ssl: config.database.ssl,
  });

  pool.on("error", (err) => {
    fastify.log.error({ err }, "Unexpected Postgres client error");
  });

  fastify.decorate("pg", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
