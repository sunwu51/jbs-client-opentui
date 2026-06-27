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

function actionIndex(name: string): number {
  const index = menu.findIndex((item) => item.name === name)
  if (index < 0) {
    throw new Error(`missing action ${name}`)
  }
  return index
}

describe("protocol", () => {
  test("buildInitialFormValues copies defaults", () => {
    expect(buildInitialFormValues(actionIndex("Watch"))).toEqual(["", "0", "3", "", ""])
    expect(buildInitialFormValues(actionIndex("Exec"))[0]).toContain("ApplicationContext")
    expect(buildInitialFormValues(actionIndex("ChangeBody"))[2]).toBe("asm")
  })

  test("validateAction enforces signature checks", () => {
    expect(validateAction(actionIndex("Watch"), ["com.demo.Service#run", "1"])).toBe(true)
    expect(validateAction(actionIndex("Watch"), ["com.demo.Service.run", "1"])).toBe(false)
    expect(validateAction(actionIndex("Watch"), ["com.demo.Service#run", "1", "3", "", "{\"x\":\"#req[0]\"}"])).toBe(true)
    expect(validateAction(actionIndex("Watch"), ["com.demo.Service#run", "1", "3", "", "{bad"])).toBe(false)
  })

  test("buildPayload serializes change body request", () => {
    const payload = parseToolCall(actionIndex("ChangeBody"), ["a.B#c", "java.lang.String, int", "javassist", "return 1;"])
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
    const decompilePayload = parseToolCall(actionIndex("Decompile"), ["demo.Service"])
    expect(decompilePayload.params.name).toBe("decompile")
    expect(decompilePayload.params.arguments.className).toBe("demo.Service")

    const findPayload = parseToolCall(actionIndex("FindSubclasses"), ["demo.Parent"])
    expect(findPayload.params.name).toBe("find_subclasses")
    expect(findPayload.params.arguments.className).toBe("demo.Parent")

    const evalPayload = parseToolCall(actionIndex("Eval"), ["1 + 1"])
    expect(evalPayload.params.name).toBe("eval")
    expect(evalPayload.params.arguments.body).toBe("1 + 1")
  })

  test("buildPayload serializes async diagnostic tool options", () => {
    const watchPayload = parseToolCall(actionIndex("Watch"), ["a.B#c", "10", "4", "name", "{\"arg\":\"#req[0]\"}"])
    expect(watchPayload.params.name).toBe("watch")
    expect(watchPayload.params.arguments.signature).toBe("a.B#c")
    expect(watchPayload.params.arguments.minCost).toBe(10)
    expect(watchPayload.params.arguments.depthForJson).toBe(4)
    expect(watchPayload.params.arguments.ognl).toBe("name")
    expect(watchPayload.params.arguments.variables).toEqual({ arg: "#req[0]" })

    const outerWatchPayload = parseToolCall(actionIndex("OuterWatch"), ["a.B#c", "*#run", "true", "5", "", ""])
    expect(outerWatchPayload.params.name).toBe("outer_watch")
    expect(outerWatchPayload.params.arguments.innerSignature).toBe("*#run")
    expect(outerWatchPayload.params.arguments.includeNested).toBe(true)
    expect(outerWatchPayload.params.arguments.depthForJson).toBe(5)
    expect(outerWatchPayload.params.arguments.ognl).toBeUndefined()

    const tracePayload = parseToolCall(actionIndex("Trace"), ["a.B#c", "0", "true", "true"])
    expect(tracePayload.params.name).toBe("trace")
    expect(tracePayload.params.arguments.ignoreZero).toBe(true)
    expect(tracePayload.params.arguments.includeNested).toBe(true)
  })

  test("menu preserves expected action count", () => {
    expect(menu.map((item) => item.name)).toEqual(["Watch", "OuterWatch", "Trace", "ChangeBody", "ChangeResult", "Decompile", "FindSubclasses", "Eval", "Exec", "Reset"])
  })
})
