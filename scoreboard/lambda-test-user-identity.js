// Simple test runner to invoke the user-identity Lambda and print the response.
// Usage:
//   npm run lambda:test -- --provider google --providerUserId 123
// Env (from scoreboard/.env or shell):
//   AWS_REGION (default: us-east-1)
//   LAMBDA_FUNCTION_NAME (default: user-identity)

const fs = require("node:fs");
const path = require("node:path");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

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

const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const key = args[i].replace(/^--/, "");
    const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "";
    argMap[key] = val;
  }
}

const provider = argMap.provider || "google";
const providerUserId = argMap.providerUserId || "test-user-123";

const region = process.env.AWS_REGION || "us-east-1";
const functionName = process.env.LAMBDA_FUNCTION_NAME || "user-identity";

const lambda = new LambdaClient({ region });

async function main() {
  const payload = { provider, providerUserId };
  console.log(`Invoking ${functionName} with:`);
  console.log(JSON.stringify(payload, null, 2));

  const res = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );

  const payloadBuf = res.Payload
    ? Buffer.isBuffer(res.Payload)
      ? res.Payload
      : Buffer.from(res.Payload)
    : Buffer.alloc(0);
  const body = payloadBuf.toString("utf-8");

  let parsed = body;
  try {
    parsed = body ? JSON.parse(body) : null;
    // Some Lambdas nest JSON as a string in "body"
    if (parsed && typeof parsed.body === "string") {
      try {
        parsed.body = JSON.parse(parsed.body);
      } catch {
        // leave as string
      }
    }
  } catch {
    parsed = body;
  }

  console.log("\n=== Lambda Response ===");
  console.log(`StatusCode: ${res.StatusCode}`);
  console.log(`FunctionError: ${res.FunctionError || "none"}`);
  console.log("Payload:");
  console.log(JSON.stringify(parsed, null, 2));
}

main().catch((err) => {
  console.error("Lambda test failed:", err);
  process.exitCode = 1;
});
