export type ConnectionOptions = {
  url: string
  enabled: boolean
  onLog: (message: string) => void
  onStatusChange: (status: "connecting" | "connected" | "disconnected" | "error") => void
}

function formatLog(content: string): string {
  const timestamp = new Date()
  const formatted = timestamp.toISOString().replace("T", " ").slice(0, 19)
  return `[${formatted}] ${content}`
}

export function connectWebSocket(options: ConnectionOptions): { send: (message: string) => void; dispose: () => void } {
  let ws: WebSocket | null = null
  let closed = false

  if (options.enabled) {
    options.onStatusChange("connecting")
    try {
      ws = new WebSocket(options.url)
      ws.onopen = () => {
        options.onStatusChange("connected")
        options.onLog(formatLog(`WebSocket connected: ${options.url}`))
      }
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as { content?: string }
          options.onLog(formatLog(parsed.content ?? String(event.data)))
        } catch {
          options.onLog(formatLog(String(event.data)))
        }
      }
      ws.onerror = () => {
        options.onStatusChange("error")
        options.onLog(formatLog(`WebSocket error: ${options.url}`))
      }
      ws.onclose = () => {
        if (!closed) {
          options.onStatusChange("disconnected")
          options.onLog(formatLog(`WebSocket disconnected: ${options.url}`))
        }
      }
    } catch (error) {
      options.onStatusChange("error")
      options.onLog(formatLog(`WebSocket connect failed (${options.url}): ${String(error)}`))
    }
  }

  return {
    send(message: string) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        options.onLog(formatLog("WebSocket is not connected"))
        return
      }
      ws.send(message)
    },
    dispose() {
      closed = true
      ws?.close()
    }
  }
}
