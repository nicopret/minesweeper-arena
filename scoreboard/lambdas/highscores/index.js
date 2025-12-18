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

const parseNumber = (val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val);
  return undefined;
};

const mapItem = (item) => ({
  userId: item.userId?.S,
  levelId: item.levelId?.S,
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

exports.handler = async (event) => {
  try {
    const bodyData =
      typeof event?.body === "string"
        ? JSON.parse(event.body || "{}")
        : event?.body || {};
    const userId =
      bodyData.userId ||
      event?.queryStringParameters?.userId ||
      event?.pathParameters?.userId;
    const levelId =
      bodyData.levelId ||
      event?.queryStringParameters?.levelId ||
      event?.pathParameters?.levelId;

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
