import { describe, expect, test } from "bun:test"
import { buildInitialFormValues, buildPayload, menu, validateAction } from "./protocol.js"

function parseToolCall(actionIndex: number, values: string[]) {
  return JSON.parse(buildPayload(actionIndex, values)) as {
    jsonrpc: string
    id: string
    method: string
    params: {
      name: string
      arguments: Record<string, unknown>
    }
  }
}

describe("protocol", () => {
  test("buildInitialFormValues copies defaults", () => {
    expect(buildInitialFormValues(0)).toEqual(["", "0", ""])
    expect(buildInitialFormValues(7)[0]).toContain("ApplicationContext")
    expect(buildInitialFormValues(3)[2]).toBe("asm")
  })

  test("validateAction enforces signature checks", () => {
    expect(validateAction(0, ["com.demo.Service#run", "1"])).toBe(true)
    expect(validateAction(0, ["com.demo.Service.run", "1"])).toBe(false)
  })

  test("buildPayload serializes change body request", () => {
    const payload = parseToolCall(3, ["a.B#c", "java.lang.String, int", "javassist", "return 1;"])
    expect(payload.jsonrpc).toBe("2.0")
    expect(payload.method).toBe("tools/call")
    expect(payload.params.name).toBe("change_body")
    expect(payload.params.arguments.className).toBe("a.B")
    expect(payload.params.arguments.method).toBe("c")
    expect(payload.params.arguments.paramTypes).toEqual(["java.lang.String", "int"])
    expect(payload.params.arguments.body).toBe("return 1;")
    expect(payload.params.arguments.mode).toBe(0)
    expect(typeof payload.id).toBe("string")
    expect(payload.id).toBe(String(payload.params.arguments.logId))
  })

  test("buildPayload serializes eval and decompile requests", () => {
    const decompilePayload = parseToolCall(5, ["demo.Service"])
    expect(decompilePayload.params.name).toBe("decompile")
    expect(decompilePayload.params.arguments.className).toBe("demo.Service")

    const evalPayload = parseToolCall(6, ["1 + 1"])
    expect(evalPayload.params.name).toBe("eval")
    expect(evalPayload.params.arguments.body).toBe("1 + 1")
  })

  test("buildPayload serializes async diagnostic tool options", () => {
    const watchPayload = parseToolCall(0, ["a.B#c", "10", "name"])
    expect(watchPayload.params.name).toBe("watch")
    expect(watchPayload.params.arguments.signature).toBe("a.B#c")
    expect(watchPayload.params.arguments.minCost).toBe(10)
    expect(watchPayload.params.arguments.ognl).toBe("name")

    const outerWatchPayload = parseToolCall(1, ["a.B#c", "*#run", "true", ""])
    expect(outerWatchPayload.params.name).toBe("outer_watch")
    expect(outerWatchPayload.params.arguments.innerSignature).toBe("*#run")
    expect(outerWatchPayload.params.arguments.includeNested).toBe(true)
    expect(outerWatchPayload.params.arguments.ognl).toBeUndefined()

    const tracePayload = parseToolCall(2, ["a.B#c", "0", "true", "true"])
    expect(tracePayload.params.name).toBe("trace")
    expect(tracePayload.params.arguments.ignoreZero).toBe(true)
    expect(tracePayload.params.arguments.includeNested).toBe(true)
  })

  test("menu preserves expected action count", () => {
    expect(menu.map((item) => item.name)).toEqual(["Watch", "OuterWatch", "Trace", "ChangeBody", "ChangeResult", "Decompile", "Eval", "Exec", "Reset"])
  })
})
