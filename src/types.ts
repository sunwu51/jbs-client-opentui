export type ParamOption = {
  name: string
  description: string
  value: string
}

export type ParamInputType = "text" | "textarea" | "select"

export type ParamDefinition = {
  name: string
  inputType: ParamInputType
  checker: (value: string) => boolean
  value: string
  options?: ParamOption[]
}

export type FunctionDefinition = {
  name: string
  params: ParamDefinition[]
  toPayload: (params: string[]) => string
}

export type Screen = "menu" | "form"

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error"

export type AppState = {
  screen: Screen
  selectedActionIndex: number
  focusIndex: number
  formValues: string[]
  logs: string[]
  connectionStatus: ConnectionStatus
}
