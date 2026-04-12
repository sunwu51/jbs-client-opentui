#!/usr/bin/env node

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function detectPackageName() {
  const platformMap = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  }
  const archMap = {
    x64: "x64",
    arm64: "arm64",
  }

  const platform = platformMap[os.platform()] || os.platform()
  const arch = archMap[os.arch()] || os.arch()
  return {
    packageName: `jbs-client-${platform}-${arch}`,
    binaryName: platform === "windows" ? "jbs-client.exe" : "jbs-client",
  }
}

function findBinary() {
  const { packageName, binaryName } = detectPackageName()
  const candidate = path.join(__dirname, "node_modules", packageName, "bin", binaryName)
  if (!fs.existsSync(candidate)) {
    throw new Error(`Missing binary package ${packageName}`)
  }
  return candidate
}

function main() {
  if (os.platform() === "win32") {
    return
  }

  const binaryPath = findBinary()
  const cached = path.join(__dirname, "bin", ".jbs-client")
  if (fs.existsSync(cached)) {
    fs.unlinkSync(cached)
  }

  try {
    fs.linkSync(binaryPath, cached)
  } catch {
    fs.copyFileSync(binaryPath, cached)
  }
  fs.chmodSync(cached, 0o755)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(0)
}
