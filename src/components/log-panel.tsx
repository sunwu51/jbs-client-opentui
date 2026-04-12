import { useEffect, useRef } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"

type LogPanelProps = {
  logs: string[]
  focused?: boolean
}

export function LogPanel({ logs, focused = false }: LogPanelProps) {
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)

  useEffect(() => {
    if (!scrollRef.current) {
      return
    }
    scrollRef.current.scrollTo({ x: 0, y: scrollRef.current.scrollHeight })
  }, [logs])

  return (
    <box border borderStyle="rounded" borderColor="#26f7ce" padding={1} flexDirection="column" flexGrow={1} title="Logs">
      <scrollbox ref={scrollRef} flexGrow={1} focused={focused} stickyScroll stickyStart="bottom">
        <box flexDirection="column">
          {logs.length === 0 ? <text fg="#6b7280" selectable>Waiting for logs...</text> : null}
          {logs.map((log, index) => (
            <text key={`${index}-${log}`} selectable>{log}</text>
          ))}
        </box>
      </scrollbox>
    </box>
  )
}
