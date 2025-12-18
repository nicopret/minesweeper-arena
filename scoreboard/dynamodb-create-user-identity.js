// Create the UserIdentity DynamoDB table if it does not exist.
// Usage: npm run dynamodb:create
// Env:
//   AWS_REGION (default: us-east-1)
//   DYNAMODB_ENDPOINT (optional, e.g. http://localhost:8000 for Localstack/DynamoDB local)

const {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = "UserIdentity";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

async function tableExists() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function createTable() {
  const params = {
    TableName: TABLE_NAME,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "provider", AttributeType: "S" },
      { AttributeName: "providerUserId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "provider", KeyType: "HASH" },
      { AttributeName: "providerUserId", KeyType: "RANGE" },
    ],
  };

  await client.send(new CreateTableCommand(params));
  await waitUntilTableExists(
    { client, maxWaitTime: 30 },
    { TableName: TABLE_NAME },
  );
}

async function main() {
  const exists = await tableExists();
  if (exists) {
    console.log(
      `DynamoDB table "${TABLE_NAME}" already exists. Skipping create.`,
    );
    return;
  }

  console.log(`Creating DynamoDB table "${TABLE_NAME}"...`);
  await createTable();
  console.log(`Table "${TABLE_NAME}" is ready.`);
}

main().catch((err) => {
  console.error("Failed to ensure DynamoDB table:", err);
  process.exitCode = 1;
});
