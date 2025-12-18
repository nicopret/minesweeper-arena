// Lambda handler to fetch or create a UserIdentity record.
// Inputs (from `event`):
//   - provider (string)
//   - providerUserId (string)
//
// Output: { statusCode: 200, body: '{"userId": "..."}' }

const crypto = require("node:crypto");
const {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.USER_IDENTITY_TABLE || "UserIdentity";
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

const nowIso = () => new Date().toISOString();

async function fetchUserId(provider, providerUserId) {
  const res = await client.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        provider: { S: provider },
        providerUserId: { S: providerUserId },
      },
      ProjectionExpression: "userId, createdAt, lastSeenAt",
    }),
  );
  if (!res.Item) return null;
  return {
    userId: res.Item.userId?.S || null,
    createdAt: res.Item.createdAt?.S || null,
    lastSeenAt: res.Item.lastSeenAt?.S || null,
  };
}

async function createUser(provider, providerUserId) {
  const userId = `u_${crypto.randomUUID()}`;
  const timestamp = nowIso();

  try {
    await client.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          provider: { S: provider },
          providerUserId: { S: providerUserId },
          userId: { S: userId },
          createdAt: { S: timestamp },
          lastSeenAt: { S: timestamp },
        },
        ConditionExpression:
          "attribute_not_exists(provider) AND attribute_not_exists(providerUserId)",
      }),
    );
    return { userId, createdAt: timestamp, lastSeenAt: timestamp };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      const existing = await fetchUserId(provider, providerUserId);
      if (existing?.userId) return existing;
    }
    throw err;
  }
}

async function touchLastSeen(provider, providerUserId) {
  const ts = nowIso();
  const res = await client.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        provider: { S: provider },
        providerUserId: { S: providerUserId },
      },
      UpdateExpression: "SET lastSeenAt = :ts",
      ExpressionAttributeValues: {
        ":ts": { S: ts },
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return {
    userId: res.Attributes?.userId?.S || null,
    createdAt: res.Attributes?.createdAt?.S || null,
    lastSeenAt: res.Attributes?.lastSeenAt?.S || ts,
  };
}

exports.handler = async (event) => {
  try {
    const provider =
      event?.provider ||
      event?.pathParameters?.provider ||
      event?.queryStringParameters?.provider ||
      JSON.parse(event?.body || "{}").provider;
    const providerUserId =
      event?.providerUserId ||
      event?.pathParameters?.providerUserId ||
      event?.queryStringParameters?.providerUserId ||
      JSON.parse(event?.body || "{}").providerUserId;

    if (!provider || !providerUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "provider and providerUserId are required",
        }),
      };
    }

    const existing = await fetchUserId(provider, providerUserId);
    let record = existing;

    if (!record || !record.userId) {
      record = await createUser(provider, providerUserId);
    } else {
      record = await touchLastSeen(provider, providerUserId);
    }

    const { userId, createdAt, lastSeenAt } = record;

    return {
      statusCode: 200,
      body: JSON.stringify({ userId, createdAt, lastSeenAt }),
    };
  } catch (err) {
    console.error("UserIdentity lambda error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
