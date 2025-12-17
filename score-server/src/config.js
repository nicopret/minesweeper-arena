const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_SSL =
  process.env.DATABASE_SSL === "false"
    ? false
    : process.env.DATABASE_SSL === "true" ||
      process.env.NODE_ENV === "production";
const DB_POOL_MAX = Number(process.env.DB_POOL_MAX || 10);

module.exports = {
  port: PORT,
  host: HOST,
  database: {
    connectionString: DATABASE_URL,
    ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
    poolMax: DB_POOL_MAX,
  },
};
