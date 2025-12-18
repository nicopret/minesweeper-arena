// Deploy or update an API Gateway HTTP API named "arena-scoreboard" with POST /user
// wired to the user-identity Lambda.
//
// Usage: npm run api:deploy
// Env (loaded from scoreboard/.env if present):
//   AWS_REGION (default: us-east-1)
//   LAMBDA_FUNCTION_NAME (default: user-identity)
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
          AllowMethods: ["POST", "OPTIONS"],
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
        AllowMethods: ["POST", "OPTIONS"],
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
  const existing = res.Items?.find((i) => i.IntegrationType === "AWS_PROXY");
  if (existing) {
    if (existing.IntegrationUri !== integrationUri) {
      await apiClient.send(
        new UpdateIntegrationCommand({
          ApiId: apiId,
          IntegrationId: existing.IntegrationId,
          IntegrationUri: integrationUri,
        }),
      );
    }
    return existing.IntegrationId;
  }

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

async function ensureRoute(apiId, integrationId) {
  const routeKey = "POST /user";
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

async function addLambdaPermission(apiId, accountId, lambdaArn) {
  const sourceArn = `arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/user`;
  try {
    await lambdaClient.send(
      new AddPermissionCommand({
        Action: "lambda:InvokeFunction",
        FunctionName: lambdaArn,
        Principal: "apigateway.amazonaws.com",
        StatementId: `apigw-${apiId}-user`,
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

async function getLambdaArn() {
  const res = await lambdaClient.send(
    new GetFunctionCommand({ FunctionName: functionName }),
  );
  return res.Configuration?.FunctionArn;
}

async function deployApi() {
  const accountId = await getAccountId();
  const lambdaArn = await getLambdaArn();
  if (!lambdaArn) throw new Error("Could not resolve Lambda ARN");

  const api = await ensureApi();
  console.log(`API ID: ${api.ApiId}`);

  const integrationUri = `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
  const integrationId = await ensureIntegration(api.ApiId, integrationUri);
  console.log(`Integration ID: ${integrationId}`);

  await ensureRoute(api.ApiId, integrationId);
  console.log("Route POST /user ensured.");

  await addLambdaPermission(api.ApiId, accountId, lambdaArn);
  console.log("Lambda invoke permission ensured for API Gateway.");

  await ensureStage(api.ApiId);
  console.log(`Stage "${stageName}" updated.`);

  const baseUrl = `https://${api.ApiId}.execute-api.${region}.amazonaws.com/${stageName}`;
  console.log(`\nAPI deployed. Invoke with: POST ${baseUrl}/user`);
}

deployApi().catch((err) => {
  console.error("API deployment failed:", err);
  process.exitCode = 1;
});
