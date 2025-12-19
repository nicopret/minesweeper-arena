// Create DynamoDB tables needed for scoreboard: UserIdentity and MinesweeperHighScores.
// Usage: npm run dynamodb:create
// Env:
//   AWS_REGION (default: us-east-1)
//   DYNAMODB_ENDPOINT (optional, e.g. http://localhost:8000 for Localstack/DynamoDB local)
//   USER_IDENTITY_TABLE (default: UserIdentity)
//   HIGHSCORES_TABLE (default: MinesweeperHighScores)

const {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");

const TABLES = [
  {
    name: process.env.USER_IDENTITY_TABLE || "UserIdentity",
    attributeDefinitions: [
      { AttributeName: "provider", AttributeType: "S" },
      { AttributeName: "providerUserId", AttributeType: "S" },
    ],
    keySchema: [
      { AttributeName: "provider", KeyType: "HASH" },
      { AttributeName: "providerUserId", KeyType: "RANGE" },
    ],
  },
  {
    name: process.env.HIGHSCORES_TABLE || "MinesweeperHighScores",
    attributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "levelId", AttributeType: "S" },
    ],
    keySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "levelId", KeyType: "RANGE" },
    ],
  },
];

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

async function tableExists(TableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function createTable(config) {
  const params = {
    TableName: config.name,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: config.attributeDefinitions,
    KeySchema: config.keySchema,
  };

  await client.send(new CreateTableCommand(params));
  await waitUntilTableExists(
    { client, maxWaitTime: 30 },
    { TableName: config.name },
  );
}

async function main() {
  for (const table of TABLES) {
    const exists = await tableExists(table.name);
    if (exists) {
      console.log(
        `DynamoDB table "${table.name}" already exists. Skipping create.`,
      );
      continue;
    }

    console.log(`Creating DynamoDB table "${table.name}"...`);
    await createTable(table);
    console.log(`Table "${table.name}" is ready.`);
  }
}

main().catch((err) => {
  console.error("Failed to ensure DynamoDB tables:", err);
  process.exitCode = 1;
});
