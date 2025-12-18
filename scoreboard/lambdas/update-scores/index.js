// Lambda handler to replace a user's scores for a given difficulty.
// Inputs (from `event`):
//   - userId (string) [required]
//   - difficulty (string) [required] -> stored as levelId
//   - scores (number[]) [required]   -> replaces the saved scores array

const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.HIGHSCORES_TABLE || "MinesweeperHighScores";
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

const parseBody = (event) => {
  if (typeof event?.body === "string") {
    try {
      return JSON.parse(event.body || "{}");
    } catch {
      return {};
    }
  }
  if (event?.body && typeof event.body === "object") return event.body;
  return {};
};

const sanitizeScores = (scores) => {
  if (!Array.isArray(scores)) return [];
  return scores
    .map((v) => (typeof v === "string" ? Number(v) : v))
    .filter((v) => typeof v === "number" && Number.isFinite(v));
};

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

const derivePathParamsFromRaw = (event) => {
  const path =
    event?.rawPath || event?.requestContext?.http?.path || event?.path || "";
  const parts = path.split("/").filter(Boolean);
  // Expect pattern: /{userId}/minesweeper/{level}
  const mineIndex = parts.findIndex((p) => p.toLowerCase() === "minesweeper");
  if (mineIndex > 0 && mineIndex + 1 < parts.length) {
    return {
      userId: parts[mineIndex - 1],
      level: parts[mineIndex + 1],
    };
  }
  return {};
};

exports.handler = async (event) => {
  try {
    const normalizedEvent = normalizeEvent(event);
    const body = parseBody(normalizedEvent);
    const rawPathParams = derivePathParamsFromRaw(normalizedEvent);
    const userId =
      normalizedEvent?.pathParameters?.userId ||
      normalizedEvent?.pathParameters?.userid ||
      rawPathParams.userId ||
      normalizedEvent?.queryStringParameters?.userId ||
      body.userId ||
      normalizedEvent?.userId;
    const difficulty =
      normalizedEvent?.pathParameters?.level ||
      normalizedEvent?.pathParameters?.difficulty ||
      rawPathParams.level ||
      normalizedEvent?.queryStringParameters?.level ||
      normalizedEvent?.queryStringParameters?.difficulty ||
      body.difficulty ||
      body.levelId ||
      normalizedEvent?.difficulty ||
      normalizedEvent?.levelId;
    const scores = sanitizeScores(body.scores ?? normalizedEvent?.scores);

    if (!userId || !difficulty) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required parameters: userId and difficulty",
        }),
      };
    }

    const now = Date.now();
    const maxScore =
      scores.length > 0
        ? Math.max(...scores.filter(Number.isFinite))
        : undefined;

    const item = {
      userId: { S: userId },
      levelId: { S: difficulty },
      updatedAt: { N: String(now) },
      scores: { L: scores.map((n) => ({ N: String(n) })) },
      attempts: { N: String(scores.length) },
    };

    if (typeof maxScore === "number" && Number.isFinite(maxScore)) {
      item.highScore = { N: String(maxScore) };
    }

    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        userId,
        difficulty,
        count: scores.length,
      }),
    };
  } catch (err) {
    console.error("Update scores lambda error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
