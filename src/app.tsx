import { useEffect, useMemo, useState } from "react"
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react"
import { ActionMenu } from "./components/action-menu.js"
import { LogPanel } from "./components/log-panel.js"
import { ParamForm } from "./components/param-form.js"
import { buildPayload, menu, validateAction } from "./protocol.js"
import { appendLog, backToMenu, createInitialState, nextFocus, openAction, previousFocus, setConnectionStatus, updateFormValue, updateSelectedAction } from "./state.js"
import { connectWebSocket } from "./ws.js"
import type { AppState } from "./types.js"
import type { Selection } from "@opentui/core"

type AppProps = {
  host: string
  wsPort: number
  connectBackend: boolean
}

type MenuFocusTarget = "content" | "ws-input" | "reconnect"

export function App({ host, wsPort, connectBackend }: AppProps) {
  const renderer = useRenderer()
  const { width, height } = useTerminalDimensions()
  const [state, setState] = useState(createInitialState)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [wsUrl, setWsUrl] = useState(`ws://${host}:${wsPort}`)
  const [reconnectVersion, setReconnectVersion] = useState(0)
  const [menuFocusTarget, setMenuFocusTarget] = useState<MenuFocusTarget>("content")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const connection = useMemo(() => {
    return connectWebSocket({
      url: wsUrl,
      enabled: connectBackend,
      onLog: (message: string) => setState((current: AppState) => appendLog(current, message)),
      onStatusChange: (status) => setState((current: AppState) => setConnectionStatus(current, status))
    })
  }, [connectBackend, reconnectVersion, wsUrl])

  useEffect(() => {
    if (!connectBackend) {
      setState((current: AppState) => appendLog(setConnectionStatus(current, "idle"), "[local] backend integration disabled"))
    }
    return () => connection.dispose()
  }, [connectBackend, connection])

  useEffect(() => {
    const handleSelection = (selection: Selection) => {
      const text = selection.getSelectedText()
      if (!text) {
        return
      }
      renderer.copyToClipboardOSC52(text)
      setToastMessage(`Copied ${text.length} chars to clipboard`)
    }

    renderer.on("selection", handleSelection)
    return () => {
      renderer.off("selection", handleSelection)
    }
  }, [renderer])

  useEffect(() => {
    if (!toastMessage) {
      return
    }
    const timer = setTimeout(() => {
      setToastMessage(null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const reconnect = () => {
    setValidationError(null)
    setState((current: AppState) => appendLog(current, `[system] reconnect requested: ${wsUrl}`))
    setReconnectVersion((value) => value + 1)
  }

  const cycleMenuFocus = (backward: boolean) => {
    const order: MenuFocusTarget[] = ["ws-input", "reconnect", "content"]
    const currentIndex = order.indexOf(menuFocusTarget)
    const nextIndex = backward
      ? (currentIndex - 1 + order.length) % order.length
      : (currentIndex + 1) % order.length
    setMenuFocusTarget(order[nextIndex])
  }

  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      renderer.destroy()
      return
    }

    if (state.screen === "menu") {
      if (menuFocusTarget === "ws-input") {
        if (key.name === "tab") {
          cycleMenuFocus(Boolean(key.shift))
          return
        }
        if (key.name === "escape") {
          setMenuFocusTarget("content")
        }
        return
      }

      if (menuFocusTarget === "reconnect") {
        if (key.name === "tab") {
          cycleMenuFocus(Boolean(key.shift))
          return
        }
        if (key.name === "enter" || key.name === "return") {
          reconnect()
          return
        }
        if (key.name === "escape") {
          setMenuFocusTarget("content")
        }
        return
      }

      if (key.name === "up") {
        setState((current: AppState) => updateSelectedAction(current, (current.selectedActionIndex - 1 + menu.length) % menu.length))
        return
      }
      if (key.name === "down") {
        setState((current: AppState) => updateSelectedAction(current, (current.selectedActionIndex + 1) % menu.length))
        return
      }
      if (key.name === "tab") {
        cycleMenuFocus(Boolean(key.shift))
        return
      }
      if (key.name === "enter" || key.name === "return") {
        setValidationError(null)
        setState((current: AppState) => openAction(current))
        return
      }
      return
    }

    const inputCount = menu[state.selectedActionIndex].params.length

    if (key.name === "escape") {
      setValidationError(null)
      setState((current: AppState) => backToMenu(current))
      return
    }
    if (key.name === "tab") {
      setState((current: AppState) => nextFocus(current, inputCount))
      return
    }
    if (key.shift && key.name === "tab") {
      setState((current: AppState) => previousFocus(current, inputCount))
      return
    }
    if ((key.name === "enter" || key.name === "return") && state.focusIndex === inputCount) {
      if (!validateAction(state.selectedActionIndex, state.formValues)) {
        setValidationError("Param Invalid")
        setState((current: AppState) => appendLog(current, "Param Invalid"))
        return
      }
      setValidationError(null)
      const payload = buildPayload(state.selectedActionIndex, state.formValues)
      setState((current: AppState) => appendLog(current, `[request] ${payload}`))
      connection.send(payload)
    }
  })

  if (width < 100 || height < 30) {
    return <text>Window need to larger than 100x30, current={width}x{height}</text>
  }

  return (
    <box width="100%" height="100%" flexDirection="column" padding={1} gap={1} position="relative">
      <box border borderColor="#7c3aed" paddingX={1} paddingY={0} flexDirection="row" alignItems="center" gap={1}>
        <text>JBS Client OpenTUI</text>
      </box>
      {toastMessage ? (
        <box position="absolute" top={1} right={2} zIndex={20} border borderColor="#3b82f6" backgroundColor="#172554" paddingX={1} paddingY={0}>
          <text fg="#bfdbfe">{toastMessage}</text>
        </box>
      ) : null}
      <box border borderColor="#2563eb" height={3} minHeight={3} maxHeight={3} paddingX={1} paddingY={0} flexDirection="row" alignItems="center" justifyContent="flex-start" gap={1}>
        <text fg="#93c5fd">WS</text>
        <box flexGrow={1}>
          <input value={wsUrl} onChange={setWsUrl} width="100%" focused={state.screen === "menu" && menuFocusTarget === "ws-input"} />
        </box>
        <box
          border
          borderColor={state.screen === "menu" && menuFocusTarget === "reconnect" ? "#3b82f6" : "#22c55e"}
          paddingX={1}
          paddingY={0}
          flexGrow={0}
          flexShrink={0}
          alignSelf="center"
          width={13}
          focusable
          onMouseDown={() => {
            setMenuFocusTarget("reconnect")
            reconnect()
          }}
        >
          <text fg={state.screen === "menu" && menuFocusTarget === "reconnect" ? "#93c5fd" : "#22c55e"}>Reconnect</text>
        </box>
        <box flexGrow={0} flexShrink={0} width={12}>
          <text fg={state.connectionStatus === "connected" ? "#22c55e" : state.connectionStatus === "error" ? "#f87171" : "#facc15"}>
            {state.connectionStatus}
          </text>
        </box>
      </box>
      <box flexDirection="row" flexGrow={1} gap={1}>
        <box width="50%" flexGrow={1}>
          {state.screen === "menu" ? (
            <ActionMenu
              focused={menuFocusTarget === "content"}
              selectedIndex={state.selectedActionIndex}
              onChange={(index: number) => setState((current: AppState) => updateSelectedAction(current, index))}
              onSelect={(index: number) => {
                setValidationError(null)
                setState((current: AppState) => openAction(current, index))
              }}
            />
          ) : (
            <ParamForm
              actionIndex={state.selectedActionIndex}
              values={state.formValues}
              focusIndex={state.focusIndex}
              focused
              validationError={validationError}
              onChange={(index: number, value: string) => setState((current: AppState) => updateFormValue(current, index, value))}
            />
          )}
        </box>
        <box width="50%" flexGrow={1}>
          <LogPanel logs={state.logs} focused={false} />
        </box>
      </box>
    </box>
  )
}
