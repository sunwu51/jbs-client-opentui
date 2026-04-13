import { chmod, mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import packageJson from "../package.json" with { type: "json" };

const distRoot = resolve("dist", "npm");
const rootPackageName = packageJson.name;
const keepTemp = process.argv.includes("--keep-temp");
const runInteractiveSmoke = process.argv.includes("--smoke-tty");

function detectPlatformPackageName() {
  const platformMap = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows"
  } as const;
  const archMap = {
    x64: "x64",
    arm64: "arm64"
  } as const;

  const platform = platformMap[process.platform as keyof typeof platformMap] ?? process.platform;
  const arch = archMap[process.arch as keyof typeof archMap] ?? process.arch;
  return `${rootPackageName}-${platform}-${arch}`;
}

function assertExists(path: string, message: string) {
  if (!existsSync(path)) {
    throw new Error(message);
  }
}

async function packDirectory(directory: string, destination: string, env: Record<string, string>) {
  const child = Bun.spawn(["npm", "pack", "--pack-destination", destination], {
    cwd: directory,
    env,
    stdout: "pipe",
    stderr: "pipe"
  });

  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`npm pack failed for ${directory}\n${stderr || stdout}`);
  }

  const tarballName = stdout.trim().split("\n").pop();
  if (!tarballName) {
    throw new Error(`Unable to determine tarball name for ${directory}`);
  }

  return join(destination, tarballName);
}

async function extractPackageTarball(tarball: string, nodeModulesDir: string, packageName: string) {
  const unpackDir = join(nodeModulesDir, `.${packageName}-unpack`);
  await mkdir(unpackDir, { recursive: true });

  const child = Bun.spawn(["tar", "-xzf", tarball, "-C", unpackDir], {
    stdout: "pipe",
    stderr: "pipe"
  });

  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`tar extraction failed for ${tarball}\n${stderr || stdout}`);
  }

  const extractedDir = join(unpackDir, "package");
  const finalDir = join(nodeModulesDir, packageName);
  await rename(extractedDir, finalDir);
  await rm(unpackDir, { recursive: true, force: true });
  return finalDir;
}

async function createBinShim(appDir: string) {
  const binDir = join(appDir, "node_modules", ".bin");
  const target = join(binDir, "jbs-client");
  const relativeTarget = "../jbs-client/bin/jbs-client.js";

  await mkdir(binDir, { recursive: true });
  if (process.platform === "win32") {
    await writeFile(target, relativeTarget);
    return;
  }

  await symlink(relativeTarget, target);
  await chmod(target, 0o755);
}

async function runPostinstall(appDir: string, env: Record<string, string>) {
  const child = Bun.spawn(["node", "node_modules/jbs-client/postinstall.mjs"], {
    cwd: appDir,
    env,
    stdout: "pipe",
    stderr: "pipe"
  });

  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`postinstall simulation failed\n${stderr || stdout}`);
  }
}

async function verifyWrapperResolution(appDir: string) {
  const script = `
const fs = require("fs");
const path = require("path");
const os = require("os");

const platformMap = { darwin: "darwin", linux: "linux", win32: "windows" };
const archMap = { x64: "x64", arm64: "arm64" };
const platform = platformMap[os.platform()] || os.platform();
const arch = archMap[os.arch()] || os.arch();
const packageName = "${rootPackageName}-" + platform + "-" + arch;
const binaryName = platform === "windows" ? "${rootPackageName}.exe" : "${rootPackageName}";
let current = path.join(process.cwd(), "node_modules", "${rootPackageName}", "bin");
let candidate;

for (;;) {
  const modules = path.join(current, "node_modules");
  const next = path.join(modules, packageName, "bin", binaryName);
  if (fs.existsSync(next)) {
    candidate = next;
    break;
  }
  const parent = path.dirname(current);
  if (parent === current) {
    break;
  }
  current = parent;
}

if (!candidate) {
  console.error("Wrapper could not resolve platform binary for", packageName);
  process.exit(1);
}
`;

  const child = Bun.spawn(["node", "-e", script], {
    cwd: appDir,
    stdout: "pipe",
    stderr: "pipe"
  });

  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`Wrapper resolution check failed\n${stderr || stdout}`);
  }
}

function ttyCommand() {
  if (process.platform === "darwin") {
    return ["script", "-q", "/dev/null", "npx", "--no-install", "jbs-client", "--connect", "false"];
  }

  if (process.platform === "linux") {
    return ["script", "-q", "-c", "npx --no-install jbs-client --connect false", "/dev/null"];
  }

  return null;
}

async function smokeTestNpx(appDir: string, env: Record<string, string>) {
  const command = ttyCommand();
  if (!command) {
    console.log(`Skipping interactive npx smoke test on ${process.platform}`);
    return;
  }

  const child = Bun.spawn(command, {
    cwd: appDir,
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe"
  });

  const outcome = await Promise.race([
    child.exited.then((code) => ({ type: "exit" as const, code })),
    Bun.sleep(3000).then(() => ({ type: "timeout" as const }))
  ]);

  if (outcome.type === "timeout") {
    child.kill("SIGTERM");
    await Promise.race([child.exited, Bun.sleep(1000)]);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await child.exited;
    }
    return;
  }

  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  throw new Error(
    `npx jbs-client exited too early with code ${outcome.code}\nstdout:\n${stdout || "(empty)"}\nstderr:\n${stderr || "(empty)"}`
  );
}

async function main() {
  const platformPackageName = detectPlatformPackageName();
  const rootDir = join(distRoot, rootPackageName);
  const platformDir = join(distRoot, platformPackageName);

  assertExists(rootDir, `Missing ${rootDir}. Run 'bun run build:npm' first.`);
  assertExists(platformDir, `Missing ${platformDir}. Run 'bun run build:npm' on a machine that builds ${platformPackageName}.`);

  const rootManifest = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8")) as {
    optionalDependencies?: Record<string, string>;
  };
  if (rootManifest.optionalDependencies?.[platformPackageName] !== packageJson.version) {
    throw new Error(`Root package does not point ${platformPackageName} to version ${packageJson.version}`);
  }

  const workspace = await mkdtemp(join(os.tmpdir(), "jbs-client-verify-"));
  const tarballDir = join(workspace, "tarballs");
  const appDir = join(workspace, "app");
  const nodeModulesDir = join(appDir, "node_modules");
  const npmCache = join(workspace, ".npm-cache");
  const env = {
    ...process.env,
    npm_config_cache: npmCache
  } as Record<string, string>;

  try {
    await mkdir(tarballDir, { recursive: true });
    await mkdir(nodeModulesDir, { recursive: true });

    console.log(`Packing ${rootPackageName}...`);
    const rootTarball = await packDirectory(rootDir, tarballDir, env);
    console.log(`Packing ${platformPackageName}...`);
    const platformTarball = await packDirectory(platformDir, tarballDir, env);

    console.log("Extracting tarballs into a temp node_modules tree...");
    await extractPackageTarball(rootTarball, nodeModulesDir, rootPackageName);
    await extractPackageTarball(platformTarball, nodeModulesDir, platformPackageName);
    await createBinShim(appDir);

    console.log("Running postinstall simulation...");
    await runPostinstall(appDir, env);

    assertExists(join(appDir, "node_modules", ".bin", "jbs-client"), "Missing node_modules/.bin/jbs-client after extraction");
    assertExists(join(appDir, "node_modules", rootPackageName, "package.json"), `Missing ${rootPackageName} after extraction`);
    assertExists(join(appDir, "node_modules", platformPackageName, "package.json"), `Missing ${platformPackageName} after extraction`);
    if (process.platform !== "win32") {
      assertExists(join(appDir, "node_modules", rootPackageName, "bin", ".jbs-client"), "Missing cached binary link created by postinstall");
    }

    await verifyWrapperResolution(appDir);

    if (runInteractiveSmoke) {
      console.log("Running npx smoke test...");
      await smokeTestNpx(appDir, env);
    } else {
      console.log("Skipping interactive npx smoke test. Re-run with --smoke-tty to exercise a real npx launch.");
    }

    console.log(`verify:npm passed using temp project: ${appDir}`);
    if (keepTemp) {
      console.log(`Temp files kept at ${workspace}`);
    }
  } finally {
    if (!keepTemp) {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
