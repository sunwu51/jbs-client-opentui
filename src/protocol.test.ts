import { describe, expect, test } from "bun:test"
import { buildInitialFormValues, buildPayload, menu, validateAction } from "./protocol.js"

describe("protocol", () => {
  test("buildInitialFormValues copies defaults", () => {
    expect(buildInitialFormValues(0)).toEqual(["", "0"])
    expect(buildInitialFormValues(7)[0]).toContain("ApplicationContext")
    expect(buildInitialFormValues(3)[2]).toBe("asm")
  })

  test("validateAction enforces signature checks", () => {
    expect(validateAction(0, ["com.demo.Service#run", "1"])).toBe(true)
    expect(validateAction(0, ["com.demo.Service.run", "1"])).toBe(false)
  })

  test("buildPayload serializes change body request", () => {
    const payload = JSON.parse(buildPayload(3, ["a.B#c", "java.lang.String, int", "javassist", "return 1;"])) as Record<string, unknown>
    expect(payload.type).toBe("CHANGE_BODY")
    expect(payload.className).toBe("a.B")
    expect(payload.method).toBe("c")
    expect(payload.paramTypes).toEqual(["java.lang.String", "int"])
    expect(payload.body).toBe("return 1;")
    expect(payload.mode).toBe(0)
    expect(typeof payload.id).toBe("string")
  })

  test("buildPayload serializes eval and decompile requests", () => {
    const decompilePayload = JSON.parse(buildPayload(5, ["demo.Service"])) as Record<string, unknown>
    expect(decompilePayload.type).toBe("DECOMPILE")
    expect(decompilePayload.className).toBe("demo.Service")

    const evalPayload = JSON.parse(buildPayload(6, ["1 + 1"])) as Record<string, unknown>
    expect(evalPayload.type).toBe("EVAL")
    expect(evalPayload.body).toBe("1 + 1")
  })

  test("menu preserves expected action count", () => {
    expect(menu.map((item) => item.name)).toEqual(["Watch", "OuterWatch", "Trace", "ChangeBody", "ChangeResult", "Decompile", "Eval", "Exec", "Reset"])
  })
})
