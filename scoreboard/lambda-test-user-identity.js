// Simple test runner to invoke the user-identity Lambda and then highscores Lambda.
// Usage:
//   npm run lambda:test -- --provider google --providerUserId 123
// Env (from scoreboard/.env or shell):
//   AWS_REGION (default: us-east-1)
//   LAMBDA_FUNCTION_NAME (default: user-identity)
//   HIGHSCORES_FUNCTION_NAME (default: highscores)

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
const highscoresFn = process.env.HIGHSCORES_FUNCTION_NAME || "highscores";

const lambda = new LambdaClient({ region });

const parsePayload = (resPayload) => {
  const payloadBuf = resPayload
    ? Buffer.isBuffer(resPayload)
      ? resPayload
      : Buffer.from(resPayload)
    : Buffer.alloc(0);
  const body = payloadBuf.toString("utf-8");
  let parsed = body;
  try {
    parsed = body ? JSON.parse(body) : null;
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
  return parsed;
};

async function invokeLambda(fnName, payload) {
  const res = await lambda.send(
    new InvokeCommand({
      FunctionName: fnName,
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
  const parsed = parsePayload(res.Payload);
  return { res, parsed };
}

async function main() {
  const identityPayload = { provider, providerUserId };
  console.log(`Invoking ${functionName} with:`);
  console.log(JSON.stringify(identityPayload, null, 2));

  const identity = await invokeLambda(functionName, identityPayload);

  console.log("\n=== User Identity Response ===");
  console.log(`StatusCode: ${identity.res.StatusCode}`);
  console.log(`FunctionError: ${identity.res.FunctionError || "none"}`);
  console.log("Payload:");
  console.log(JSON.stringify(identity.parsed, null, 2));

  const userId =
    identity.parsed?.userId ||
    identity.parsed?.body?.userId ||
    identity.parsed?.body?.user?.userId;

  if (!userId) {
    console.warn("No userId returned; skipping highscores tests.");
    return;
  }

  const levels = ["easy-9x9", "medium-16x16", "hard-16x30"];
  for (const levelId of levels) {
    const hsPayload = { userId, levelId };
    console.log(`\nInvoking ${highscoresFn} with:`);
    console.log(JSON.stringify(hsPayload, null, 2));

    const hs = await invokeLambda(highscoresFn, hsPayload);

    console.log("=== Highscores Response ===");
    console.log(`StatusCode: ${hs.res.StatusCode}`);
    console.log(`FunctionError: ${hs.res.FunctionError || "none"}`);
    console.log("Payload:");
    console.log(JSON.stringify(hs.parsed, null, 2));
  }
}

main().catch((err) => {
  console.error("Lambda test failed:", err);
  process.exitCode = 1;
});
