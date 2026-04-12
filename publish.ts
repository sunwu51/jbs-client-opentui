import { $ } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import packageJson from "./package.json" with { type: "json" };

const distRoot = join("dist", "npm");
const rootPackageName = packageJson.name;

const platformPackages = [
  "jbs-client-windows-x64",
  "jbs-client-windows-arm64",
  "jbs-client-linux-x64",
  "jbs-client-linux-arm64",
  "jbs-client-darwin-x64",
  "jbs-client-darwin-arm64",
];

async function assertPublishDir(name: string) {
  const dir = join(distRoot, name);
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) {
    throw new Error(`Missing publish manifest: ${manifest}. Run 'bun run build' first.`);
  }
}

async function publishPackage(name: string) {
  await assertPublishDir(name);
  console.log(`Publishing ${name}...`);
  await $`npm publish --access public --provenance --registry https://registry.npmjs.org/`.cwd(join(distRoot, name));
}

async function main() {
  for (const name of platformPackages) {
    await publishPackage(name);
  }

  await publishPackage(rootPackageName);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
