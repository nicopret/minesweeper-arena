// Deploy the user-identity lambda to AWS.
// Usage: npm run lambda:deploy
// Env:
//   AWS_REGION (default: us-east-1)
//   LAMBDA_FUNCTION_NAME (default: user-identity)
//   LAMBDA_ROLE_ARN (required when creating the function)
//   USER_IDENTITY_TABLE (default: UserIdentity)
//   DYNAMODB_ENDPOINT (optional, e.g. for localstack)

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  LambdaClient,
  GetFunctionCommand,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
} = require("@aws-sdk/client-lambda");

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
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvFromFile();

const region = process.env.AWS_REGION || "us-east-1";
const functionName = process.env.LAMBDA_FUNCTION_NAME || "user-identity";
const roleArn = process.env.LAMBDA_ROLE_ARN;

const lambda = new LambdaClient({ region });

const projectRoot = process.cwd();
const lambdaDir = path.join(
  projectRoot,
  "scoreboard",
  "lambdas",
  "user-identity",
);
const lambdaSource = path.join(lambdaDir, "index.js");

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyRecursive(src, dest) {
  const stat = await fsp.stat(src);
  if (stat.isDirectory()) {
    await fsp.mkdir(dest, { recursive: true });
    const items = await fsp.readdir(src);
    for (const item of items) {
      await copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(src, dest);
  }
}

function zipDir(dir, outZip) {
  // Prefer native zip if present; fallback to PowerShell on Windows.
  const zipCmd = process.platform === "win32" ? "powershell" : "zip";
  let args;
  if (zipCmd === "zip") {
    args = ["-r", outZip, "."];
  } else {
    args = [
      "-NoLogo",
      "-Command",
      `Compress-Archive -Path '${dir}\\*' -DestinationPath '${outZip}' -Force`,
    ];
  }
  const res = spawnSync(zipCmd, args, { cwd: dir, stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`Failed to create zip with ${zipCmd}`);
  }
}

async function buildBundle() {
  if (!(await pathExists(lambdaSource))) {
    throw new Error(`Lambda source not found at ${lambdaSource}`);
  }

  // Ensure dependencies are present by copying from root node_modules (recursive, offline-friendly)
  const pkgJsonPath = path.join(lambdaDir, "package.json");
  const pkg = JSON.parse(await fsp.readFile(pkgJsonPath, "utf8"));
  const deps = Object.keys(pkg.dependencies || {});

  const rootNodeModules = path.join(projectRoot, "node_modules");
  const lambdaNodeModules = path.join(lambdaDir, "node_modules");
  const seen = new Set();

  async function copyDep(depName) {
    if (seen.has(depName)) return;
    seen.add(depName);
    const src = path.join(rootNodeModules, depName);
    const dest = path.join(lambdaNodeModules, depName);
    if (!(await pathExists(src))) {
      throw new Error(
        `Dependency ${depName} not found in root node_modules. Run "npm install" at the repo root first.`,
      );
    }
    if (!(await pathExists(dest))) {
      await copyRecursive(src, dest);
    }
    // Recurse into this dependency's dependencies
    const depPkgPath = path.join(src, "package.json");
    if (await pathExists(depPkgPath)) {
      const depPkg = JSON.parse(await fsp.readFile(depPkgPath, "utf8"));
      const subDeps = Object.keys(depPkg.dependencies || {});
      for (const sub of subDeps) {
        await copyDep(sub);
      }
    }
  }

  for (const dep of deps) {
    await copyDep(dep);
  }

  const tmpDir = await fsp.mkdtemp(
    path.join(os.tmpdir(), "lambda-user-identity-"),
  );
  const bundleDir = path.join(tmpDir, "bundle");
  await fsp.mkdir(bundleDir);

  // Copy entire lambda directory (including node_modules)
  await copyRecursive(lambdaDir, bundleDir);

  // Create zip
  const zipPath = path.join(tmpDir, "function.zip");
  zipDir(bundleDir, zipPath);
  return zipPath;
}

async function lambdaExists(name) {
  try {
    await lambda.send(new GetFunctionCommand({ FunctionName: name }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function deploy(zipPath) {
  const code = await fsp.readFile(zipPath);
  const exists = await lambdaExists(functionName);
  if (exists) {
    console.log(`Updating existing function ${functionName}...`);
    await lambda.send(
      new UpdateFunctionCodeCommand({
        FunctionName: functionName,
        ZipFile: code,
        Publish: true,
      }),
    );
    console.log("Update complete.");
    return;
  }

  if (!roleArn) {
    throw new Error("LAMBDA_ROLE_ARN is required to create the function.");
  }

  console.log(`Creating function ${functionName}...`);
  await lambda.send(
    new CreateFunctionCommand({
      FunctionName: functionName,
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      Role: roleArn,
      Code: { ZipFile: code },
      Description: "User identity lookup/creation for scoreboard",
      Environment: {
        Variables: {
          USER_IDENTITY_TABLE:
            process.env.USER_IDENTITY_TABLE || "UserIdentity",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
          DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || "",
        },
      },
      Timeout: 10,
      MemorySize: 256,
      Publish: true,
    }),
  );
  console.log("Create complete.");
}

async function main() {
  const zipPath = await buildBundle();
  await deploy(zipPath);

  // Clean up node_modules in lambdaDir after deploy to keep repo tidy
  try {
    const nodeModulesPath = path.join(lambdaDir, "node_modules");
    if (await pathExists(nodeModulesPath)) {
      await fsp.rm(nodeModulesPath, { recursive: true, force: true });
      console.log("Cleaned up lambda node_modules.");
    }
  } catch (cleanupErr) {
    console.warn(
      "Warning: failed to clean up lambda node_modules:",
      cleanupErr,
    );
  }
}

main().catch((err) => {
  console.error("Lambda deployment failed:", err);
  process.exitCode = 1;
});
