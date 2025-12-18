// Deploy or update an API Gateway HTTP API named "arena-scoreboard" with:
//   - POST /user -> user-identity Lambda
//   - GET /{userid}/minesweeper/{level} -> highscores Lambda
//   - POST /{userid}/minesweeper/{level} -> update-scores Lambda
//
// Usage: npm run api:deploy
// Env (loaded from scoreboard/.env if present):
//   AWS_REGION (default: us-east-1)
//   LAMBDA_FUNCTION_NAME (default: user-identity)
//   HIGHSCORES_FUNCTION_NAME (default: highscores)
//   UPDATE_SCORES_FUNCTION_NAME (default: update-scores)
//   API_NAME (default: arena-scoreboard)
//   API_STAGE (default: prod)

const fs = require("node:fs");
const path = require("node:path");
const {
  ApiGatewayV2Client,
  GetApisCommand,
  CreateApiCommand,
  UpdateApiCommand,
  GetIntegrationsCommand,
  CreateIntegrationCommand,
  UpdateIntegrationCommand,
  GetRoutesCommand,
  CreateRouteCommand,
  UpdateRouteCommand,
  GetStagesCommand,
  CreateStageCommand,
  UpdateStageCommand,
} = require("@aws-sdk/client-apigatewayv2");
const {
  LambdaClient,
  AddPermissionCommand,
  GetFunctionCommand,
} = require("@aws-sdk/client-lambda");
const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");

function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), "scoreboard", ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadEnvFromFile();

const region = process.env.AWS_REGION || "us-east-1";
const apiName = process.env.API_NAME || "arena-scoreboard";
const stageName = process.env.API_STAGE || "prod";
const functionName = process.env.LAMBDA_FUNCTION_NAME || "user-identity";
const highscoresFunctionName =
  process.env.HIGHSCORES_FUNCTION_NAME || "highscores";
const updateScoresFunctionName =
  process.env.UPDATE_SCORES_FUNCTION_NAME || "update-scores";

const apiClient = new ApiGatewayV2Client({ region });
const lambdaClient = new LambdaClient({ region });
const stsClient = new STSClient({ region });

async function getAccountId() {
  const res = await stsClient.send(new GetCallerIdentityCommand({}));
  return res.Account;
}

async function ensureApi() {
  const res = await apiClient.send(new GetApisCommand({}));
  const existing = res.Items?.find((a) => a.Name === apiName);
  if (existing) {
    await apiClient.send(
      new UpdateApiCommand({
        ApiId: existing.ApiId,
        CorsConfiguration: {
          AllowOrigins: ["*"],
          AllowHeaders: [
            "content-type",
            "authorization",
            "x-amz-date",
            "x-api-key",
            "x-requested-with",
          ],
          AllowMethods: ["POST", "GET", "OPTIONS"],
          MaxAge: 86400,
        },
      }),
    );
    return existing;
  }
  const created = await apiClient.send(
    new CreateApiCommand({
      Name: apiName,
      ProtocolType: "HTTP",
      CorsConfiguration: {
        AllowOrigins: ["*"],
        AllowHeaders: [
          "content-type",
          "authorization",
          "x-amz-date",
          "x-api-key",
          "x-requested-with",
        ],
        AllowMethods: ["POST", "GET", "OPTIONS"],
        MaxAge: 86400,
      },
    }),
  );
  return created;
}

async function ensureIntegration(apiId, integrationUri) {
  const res = await apiClient.send(
    new GetIntegrationsCommand({
      ApiId: apiId,
    }),
  );
  const existing = res.Items?.find(
    (i) =>
      i.IntegrationType === "AWS_PROXY" && i.IntegrationUri === integrationUri,
  );
  if (existing) return existing.IntegrationId;

  const created = await apiClient.send(
    new CreateIntegrationCommand({
      ApiId: apiId,
      IntegrationType: "AWS_PROXY",
      IntegrationUri: integrationUri,
      PayloadFormatVersion: "2.0",
    }),
  );
  return created.IntegrationId;
}

async function ensureRoute(apiId, routeKey, integrationId) {
  const res = await apiClient.send(
    new GetRoutesCommand({
      ApiId: apiId,
    }),
  );
  const existing = res.Items?.find((r) => r.RouteKey === routeKey);
  if (existing) {
    if (existing.Target !== `integrations/${integrationId}`) {
      await apiClient.send(
        new UpdateRouteCommand({
          ApiId: apiId,
          RouteId: existing.RouteId,
          Target: `integrations/${integrationId}`,
        }),
      );
    }
    return existing.RouteId;
  }

  const created = await apiClient.send(
    new CreateRouteCommand({
      ApiId: apiId,
      RouteKey: routeKey,
      Target: `integrations/${integrationId}`,
    }),
  );
  return created.RouteId;
}

async function ensureStage(apiId) {
  const res = await apiClient.send(
    new GetStagesCommand({
      ApiId: apiId,
    }),
  );
  const existing = res.Items?.find((s) => s.StageName === stageName);
  if (existing) {
    if (!existing.AutoDeploy) {
      await apiClient.send(
        new UpdateStageCommand({
          ApiId: apiId,
          StageName: stageName,
          AutoDeploy: true,
        }),
      );
    }
    return;
  }

  await apiClient.send(
    new CreateStageCommand({
      ApiId: apiId,
      StageName: stageName,
      AutoDeploy: true,
    }),
  );
}

async function addLambdaPermission(
  apiId,
  accountId,
  lambdaArn,
  statementId,
  sourceArn,
) {
  try {
    await lambdaClient.send(
      new AddPermissionCommand({
        Action: "lambda:InvokeFunction",
        FunctionName: lambdaArn,
        Principal: "apigateway.amazonaws.com",
        StatementId: statementId,
        SourceArn: sourceArn,
      }),
    );
  } catch (err) {
    if (err.name === "ResourceConflictException") {
      return;
    }
    throw err;
  }
}

async function getLambdaArn(fnName) {
  const res = await lambdaClient.send(
    new GetFunctionCommand({ FunctionName: fnName }),
  );
  return res.Configuration?.FunctionArn;
}

async function deployApi() {
  const accountId = await getAccountId();
  const identityLambdaArn = await getLambdaArn(functionName);
  const highscoresLambdaArn = await getLambdaArn(highscoresFunctionName);
  const updateScoresLambdaArn = await getLambdaArn(updateScoresFunctionName);
  if (!identityLambdaArn)
    throw new Error("Could not resolve user-identity Lambda ARN");
  if (!highscoresLambdaArn)
    throw new Error("Could not resolve highscores Lambda ARN");
  if (!updateScoresLambdaArn)
    throw new Error("Could not resolve update-scores Lambda ARN");

  const api = await ensureApi();
  console.log(`API ID: ${api.ApiId}`);

  const identityIntegrationUri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${identityLambdaArn}/invocations`;
  const highscoresIntegrationUri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${highscoresLambdaArn}/invocations`;
  const updateScoresIntegrationUri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${updateScoresLambdaArn}/invocations`;

  const identityIntegrationId = await ensureIntegration(
    api.ApiId,
    identityIntegrationUri,
  );
  const highscoresIntegrationId = await ensureIntegration(
    api.ApiId,
    highscoresIntegrationUri,
  );
  const updateScoresIntegrationId = await ensureIntegration(
    api.ApiId,
    updateScoresIntegrationUri,
  );
  console.log(
    `Integrations ensured: identity=${identityIntegrationId}, highscores=${highscoresIntegrationId}, updateScores=${updateScoresIntegrationId}`,
  );

  await ensureRoute(api.ApiId, "POST /user", identityIntegrationId);
  console.log("Route POST /user ensured.");

  await ensureRoute(
    api.ApiId,
    "GET /{userid}/minesweeper/{level}",
    highscoresIntegrationId,
  );
  console.log("Route GET /{userid}/minesweeper/{level} ensured.");

  await ensureRoute(
    api.ApiId,
    "POST /{userid}/minesweeper/{level}",
    updateScoresIntegrationId,
  );
  console.log("Route POST /{userid}/minesweeper/{level} ensured.");

  await addLambdaPermission(
    api.ApiId,
    accountId,
    identityLambdaArn,
    `apigw-${api.ApiId}-user`,
    `arn:aws:execute-api:${region}:${accountId}:${api.ApiId}/*/*/user`,
  );
  await addLambdaPermission(
    api.ApiId,
    accountId,
    highscoresLambdaArn,
    `apigw-${api.ApiId}-highscores`,
    `arn:aws:execute-api:${region}:${accountId}:${api.ApiId}/*/GET/*/minesweeper/*`,
  );
  await addLambdaPermission(
    api.ApiId,
    accountId,
    updateScoresLambdaArn,
    `apigw-${api.ApiId}-updatescores`,
    `arn:aws:execute-api:${region}:${accountId}:${api.ApiId}/*/POST/*/minesweeper/*`,
  );
  console.log("Lambda invoke permissions ensured for API Gateway.");

  await ensureStage(api.ApiId);
  console.log(`Stage "${stageName}" updated.`);

  const baseUrl = `https://${api.ApiId}.execute-api.${region}.amazonaws.com/${stageName}`;
  console.log(`\nAPI deployed.`);
  console.log(`POST ${baseUrl}/user`);
  console.log(`GET  ${baseUrl}/{userid}/minesweeper/{level}`);
  console.log(`POST ${baseUrl}/{userid}/minesweeper/{level}`);
}

deployApi().catch((err) => {
  console.error("API deployment failed:", err);
  process.exitCode = 1;
});
