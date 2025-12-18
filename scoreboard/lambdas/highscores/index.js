// Lambda handler to fetch highscores by userId and optional levelId.
// Inputs (from `event`):
//   - userId (string) [required]
//   - levelId (string) [optional, exact match]
//
// Output: { statusCode: 200, body: '{"items":[...]} }

const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.HIGHSCORES_TABLE || "MinesweeperHighScores";
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

/**
 * @typedef {object} NormalizedEvent
 * @property {Record<string, string>=} pathParameters
 * @property {Record<string, string>=} queryStringParameters
 * @property {unknown=} body
 * @property {string=} rawPath
 * @property {{ http?: { path?: string } }=} requestContext
 * @property {string=} userId
 * @property {string=} levelId
 */

const parseNumber = (val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val);
  return undefined;
};

const parseScores = (attr) => {
  if (!attr || !Array.isArray(attr.L)) return [];
  return attr.L.map((v) => parseNumber(v.N ?? v.S)).filter((n) =>
    Number.isFinite(n),
  );
};

const mapItem = (item) => ({
  userId: item.userId?.S,
  levelId: item.levelId?.S,
  scores: parseScores(item.scores),
  highScore: parseNumber(item.highScore?.N),
  updatedAt: parseNumber(item.updatedAt?.N) ?? item.updatedAt?.S,
  attempts: parseNumber(item.attempts?.N),
  bestTimeMs: parseNumber(item.bestTimeMs?.N),
  metadata: item.metadata?.S ? safeJson(item.metadata.S) : undefined,
});

const safeJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/**
 * @param {unknown} body
 * @returns {Record<string, unknown>}
 */
const parseBody = (body) => {
  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      return {};
    }
  }
  if (body && typeof body === "object") return body;
  return {};
};

/**
 * @param {unknown} event
 * @returns {NormalizedEvent}
 */
const normalizeEvent = (event) => {
  if (typeof event === "string") {
    try {
      return JSON.parse(event);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(event)) {
    try {
      return JSON.parse(event.toString("utf-8"));
    } catch {
      return {};
    }
  }
  return event || {};
};

exports.handler = async (event) => {
  try {
    /** @type {NormalizedEvent} */
    const normalized = normalizeEvent(event);
    const params = normalized.pathParameters || {};
    const query = normalized.queryStringParameters || {};
    const body = parseBody(normalized.body);

    const userId =
      params.userId ||
      params.userid ||
      query.userId ||
      query.userid ||
      body.userId ||
      normalized.userId;
    const levelId =
      params.level ||
      params.levelId ||
      query.level ||
      query.levelId ||
      body.levelId ||
      body.difficulty ||
      normalized.levelId;

    if (!userId) {
      return {
        statusCode: 200,
        body: JSON.stringify({ items: [] }),
      };
    }

    const keyCondition = ["userId = :uid"];
    const expressionValues = { ":uid": { S: userId } };

    if (levelId) {
      keyCondition.push("levelId = :lvl");
      expressionValues[":lvl"] = { S: levelId };
    }

    const queryRes = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: keyCondition.join(" AND "),
        ExpressionAttributeValues: expressionValues,
      }),
    );

    const items = (queryRes.Items || []).map(mapItem);

    return {
      statusCode: 200,
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    console.error("Highscores lambda error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
