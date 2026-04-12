import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { $ } from "bun";
import packageJson from "./package.json" with { type: "json" };

const entrypoint = "./src/index.tsx";
const outdir = "dist";
const npmOutdir = join(outdir, "npm");
const rootPackageName = "jbs-client";
const templateDir = "scripts/npm";
const projectRoot = resolve(".");
const repository = {
  type: "git",
  url: "git+https://github.com/sunwu51/jbs-client-opentui.git"
};

const targets = [
  { target: "bun-windows-x64", os: "win32", cpu: "x64" },
  { target: "bun-windows-arm64", os: "win32", cpu: "arm64" },
  { target: "bun-linux-x64", os: "linux", cpu: "x64" },
  { target: "bun-linux-arm64", os: "linux", cpu: "arm64" },
  { target: "bun-darwin-x64", os: "darwin", cpu: "x64" },
  { target: "bun-darwin-arm64", os: "darwin", cpu: "arm64" }
] satisfies Array<{
  target: Bun.Build.CompileTarget;
  os: "win32" | "linux" | "darwin";
  cpu: "x64" | "arm64";
}>;

function platformLabel(os: string) {
  return os === "win32" ? "windows" : os;
}

function binaryName(os: string) {
  return os === "win32" ? `${rootPackageName}.exe` : rootPackageName;
}

function packageNameForTarget(os: string, cpu: string) {
  return `${rootPackageName}-${platformLabel(os)}-${cpu}`;
}

function createRootPackageJson() {
  const optionalDependencies = Object.fromEntries(
    targets.map((item) => [packageNameForTarget(item.os, item.cpu), packageJson.version])
  );

  return {
    name: rootPackageName,
    version: packageJson.version,
    description: "JBS Client terminal UI powered by OpenTUI",
    license: "UNLICENSED",
    repository,
    bin: "./bin/jbs-client.js",
    scripts: {
      postinstall: "node ./postinstall.mjs"
    },
    optionalDependencies
  };
}

function createPlatformPackageJson(name: string, os: string, cpu: string, bin: string) {
  return {
    name,
    version: packageJson.version,
    description: "Prebuilt binary for JBS Client OpenTUI",
    license: "UNLICENSED",
    repository,
    os: [os],
    cpu: [cpu],
    preferUnplugged: true,
    bin: {
      [rootPackageName]: `./bin/${bin}`
    }
  };
}

async function installCrossPlatformNativeDependencies() {
  if (process.env.SKIP_CROSS_PLATFORM_INSTALL === "1") {
    console.log("Skipping cross-platform native dependency install");
    return;
  }

  const opentuiCoreVersion = packageJson.dependencies["@opentui/core"];

  if (!opentuiCoreVersion) {
    throw new Error("Missing @opentui/core dependency");
  }

  console.log(`Installing cross-platform OpenTUI native packages (${opentuiCoreVersion})`);
  try {
    await $`bun install --os="*" --cpu="*" ${`@opentui/core@${opentuiCoreVersion}`}`.cwd(projectRoot);
  } catch (error) {
    throw new Error(
      `Failed to install cross-platform OpenTUI packages. Run 'bun install --os="*" --cpu="*" @opentui/core@${opentuiCoreVersion}' manually or set SKIP_CROSS_PLATFORM_INSTALL=1 if dependencies are already present.`,
      { cause: error }
    );
  }
}

async function copyTemplates() {
  const rootPublishDir = join(npmOutdir, rootPackageName);
  await mkdir(join(rootPublishDir, "bin"), { recursive: true });
  await cp(join(templateDir, "bin", "jbs-client.js"), join(rootPublishDir, "bin", "jbs-client.js"));
  await cp(join(templateDir, "postinstall.mjs"), join(rootPublishDir, "postinstall.mjs"));
  await cp(join(templateDir, "README.md"), join(rootPublishDir, "README.md"));
  await writeFile(join(rootPublishDir, "package.json"), `${JSON.stringify(createRootPackageJson(), null, 2)}\n`);
}

async function buildTarget(item: (typeof targets)[number]) {
  const packageName = packageNameForTarget(item.os, item.cpu);
  const packageDir = join(npmOutdir, packageName);
  const binDir = join(packageDir, "bin");
  const outputFile = join(binDir, binaryName(item.os));

  console.log(`Building ${item.target} -> ${outputFile}`);
  await mkdir(binDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [entrypoint],
    root: projectRoot,
    target: "bun",
    minify: true,
    tsconfig: "./tsconfig.json",
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      autoloadPackageJson: false,
      autoloadTsconfig: false,
      target: item.target,
      outfile: outputFile
    }
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error(`Build failed for ${item.target}`);
  }

  await writeFile(
    join(packageDir, "package.json"),
    `${JSON.stringify(createPlatformPackageJson(packageName, item.os, item.cpu, basename(outputFile)), null, 2)}\n`
  );
  await cp(join(templateDir, "README.md"), join(packageDir, "README.md"));
}

async function main() {
  await installCrossPlatformNativeDependencies();
  await rm(resolve(outdir), { recursive: true, force: true });
  await mkdir(npmOutdir, { recursive: true });

  await copyTemplates();

  for (const target of targets) {
    await buildTarget(target);
  }

  console.log(`Publish root package from ${join(npmOutdir, rootPackageName)}`);
  console.log("Publish platform packages first, then publish the root wrapper package.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
