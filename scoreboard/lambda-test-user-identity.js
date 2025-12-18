// Simple test runner to invoke the user-identity Lambda and then highscores Lambda.
// Usage:
//   npm run lambda:test -- --provider google --providerUserId 123
// Env (from scoreboard/.env or shell):
//   AWS_REGION (default: us-east-1)
//   LAMBDA_FUNCTION_NAME (default: user-identity)
//   HIGHSCORES_FUNCTION_NAME (default: highscores)
//   UPDATE_SCORES_FUNCTION_NAME (default: update-scores)

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
const updateScoresFn =
  process.env.UPDATE_SCORES_FUNCTION_NAME || "update-scores";

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

  const parseItems = (hsParsed) => {
    const direct = hsParsed?.items || hsParsed?.body?.items;
    if (Array.isArray(direct)) return direct;
    if (hsParsed?.body && typeof hsParsed.body === "string") {
      try {
        const parsed = JSON.parse(hsParsed.body || "{}");
        if (Array.isArray(parsed.items)) return parsed.items;
      } catch {
        return [];
      }
    }
    return [];
  };

  console.log("\n=== Step 2-4: verify highscores empty per level ===");
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

    const items = parseItems(hs.parsed);
    if (!Array.isArray(items) || items.length !== 0) {
      throw new Error(`Expected empty highscores for ${levelId}`);
    }
  }

  const randomScores = () =>
    Array.from({ length: 3 }, () => Math.floor(Math.random() * 100) + 1);

  const testCases = [
    { levelId: "easy-9x9", scores: randomScores() },
    { levelId: "medium-16x16", scores: randomScores() },
    { levelId: "hard-16x30", scores: randomScores() },
  ];

  console.log("\n=== Step 5-7: updating scores ===");
  for (const { levelId, scores } of testCases) {
    const payload = {
      pathParameters: { userId, level: levelId },
      body: JSON.stringify({ scores }),
      rawPath: `/${userId}/minesweeper/${levelId}`,
    };
    console.log(`Invoking ${updateScoresFn} with:`);
    console.log(JSON.stringify(payload, null, 2));
    const res = await invokeLambda(updateScoresFn, payload);
    console.log("Response:");
    console.log(JSON.stringify(res.parsed, null, 2));
    const ok =
      res.parsed?.ok ||
      res.parsed?.body?.ok ||
      (typeof res.parsed?.statusCode === "number" &&
        res.parsed.statusCode < 300);
    if (!ok) {
      throw new Error(
        `Update scores failed for ${levelId}: ${JSON.stringify(res.parsed)}`,
      );
    }
  }

  console.log("\n=== Step 8-10: verifying highscores match updates ===");
  for (const { levelId, scores } of testCases) {
    const hsPayload = { userId, levelId };
    console.log(`\nInvoking ${highscoresFn} with:`);
    console.log(JSON.stringify(hsPayload, null, 2));

    const hs = await invokeLambda(highscoresFn, hsPayload);

    console.log("=== Highscores Response ===");
    console.log(`StatusCode: ${hs.res.StatusCode}`);
    console.log(`FunctionError: ${hs.res.FunctionError || "none"}`);
    console.log("Payload:");
    console.log(JSON.stringify(hs.parsed, null, 2));

    const items = parseItems(hs.parsed);
    const expectedHigh = Math.max(...scores);
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) {
      throw new Error(`No highscores returned for ${levelId}`);
    }
    if (item.levelId !== levelId) {
      throw new Error(
        `Level mismatch. Expected ${levelId}, got ${item.levelId}`,
      );
    }
    if (item.highScore !== expectedHigh) {
      throw new Error(
        `Highscore mismatch for ${levelId}. Expected ${expectedHigh}, got ${item.highScore}`,
      );
    }
    if (typeof item.attempts === "number" && item.attempts !== scores.length) {
      throw new Error(
        `Attempts mismatch for ${levelId}. Expected ${scores.length}, got ${item.attempts}`,
      );
    }
  }

  console.log("\nAll tests passed.");
}

main().catch((err) => {
  console.error("Lambda test failed:", err);
  process.exitCode = 1;
});
