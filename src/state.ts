import { buildInitialFormValues } from "./protocol.js"
import type { AppState, ConnectionStatus } from "./types.js"

const logMaxLength = 200

export function createInitialState(): AppState {
  return {
    screen: "menu",
    selectedActionIndex: 0,
    focusIndex: 0,
    formValues: [],
    logs: [],
    connectionStatus: "idle"
  }
}

export function openAction(state: AppState, actionIndex = state.selectedActionIndex): AppState {
  return {
    ...state,
    screen: "form",
    selectedActionIndex: actionIndex,
    focusIndex: 0,
    formValues: buildInitialFormValues(actionIndex)
  }
}

export function backToMenu(state: AppState): AppState {
  return {
    ...state,
    screen: "menu",
    focusIndex: 0
  }
}

export function updateSelectedAction(state: AppState, actionIndex: number): AppState {
  return {
    ...state,
    selectedActionIndex: actionIndex
  }
}

export function updateFormValue(state: AppState, index: number, value: string): AppState {
  const formValues = [...state.formValues]
  formValues[index] = value
  return {
    ...state,
    formValues
  }
}

export function nextFocus(state: AppState, inputCount: number): AppState {
  return {
    ...state,
    focusIndex: (state.focusIndex + 1) % (inputCount + 1)
  }
}

export function previousFocus(state: AppState, inputCount: number): AppState {
  return {
    ...state,
    focusIndex: (state.focusIndex - 1 + inputCount + 1) % (inputCount + 1)
  }
}

export function appendLog(state: AppState, message: string): AppState {
  return {
    ...state,
    logs: [...state.logs, message].slice(-logMaxLength)
  }
}

export function setConnectionStatus(state: AppState, status: ConnectionStatus): AppState {
  return {
    ...state,
    connectionStatus: status
  }
}
