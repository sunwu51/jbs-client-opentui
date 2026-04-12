import { describe, expect, test } from "bun:test"
import { appendLog, backToMenu, createInitialState, nextFocus, openAction, previousFocus, updateFormValue, updateSelectedAction } from "./state.js"

describe("state helpers", () => {
  test("openAction builds form state", () => {
    const initial = updateSelectedAction(createInitialState(), 3)
    const opened = openAction(initial)
    expect(opened.screen).toBe("form")
    expect(opened.focusIndex).toBe(0)
    expect(opened.formValues.length).toBe(4)
  })

  test("focus wraps across inputs and submit button", () => {
    const opened = openAction(updateSelectedAction(createInitialState(), 0))
    expect(nextFocus(opened, 2).focusIndex).toBe(1)
    expect(nextFocus({ ...opened, focusIndex: 2 }, 2).focusIndex).toBe(0)
    expect(previousFocus(opened, 2).focusIndex).toBe(2)
  })

  test("updateFormValue and backToMenu keep expected data", () => {
    const opened = openAction(updateSelectedAction(createInitialState(), 5))
    const updated = updateFormValue(opened, 0, "hello")
    expect(updated.formValues[0]).toBe("hello")
    expect(backToMenu(updated).screen).toBe("menu")
  })

  test("appendLog keeps newest messages first", () => {
    const state = appendLog(appendLog(createInitialState(), "first"), "second")
    expect(state.logs).toEqual(["first", "second"])
  })
})
