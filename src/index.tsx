import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./app.js"

function readArg(name: string, fallback: string): string {
  const args = Bun.argv.slice(2)
  const index = args.indexOf(name)
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback
}

async function main() {
  const host = readArg("--host", "localhost")
  const wsPort = Number.parseInt(readArg("--ws_port", "18000"), 10)
  const connectBackend = readArg("--connect", "true") !== "false"

  const renderer = await createCliRenderer({
    exitOnCtrlC: false
  })

  createRoot(renderer).render(<App host={host} wsPort={wsPort} connectBackend={connectBackend} />)
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
