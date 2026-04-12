import type { FunctionDefinition } from "./types.js"

const engineOptions = [
  { name: "ASM", description: "Default bytecode engine", value: "asm" },
  { name: "Javassist", description: "Source-level transformer", value: "javassist" }
]

function classAndMethodChecker(value: string): boolean {
  return value.split("#").length === 2
}

function nonEmptyChecker(value: string): boolean {
  return value.trim().length > 0
}

function engineToMode(value: string): number {
  return value === "javassist" ? 0 : 1
}

function randomString(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let index = 0; index < length; index += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return result
}

function commonMap(): Record<string, unknown> {
  return {
    id: randomString(4),
    timestamp: Date.now()
  }
}

function parseParamTypes(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function splitSignature(value: string): [string, string] {
  const [className = "", method = ""] = value.split("#")
  return [className, method]
}

export const menu: FunctionDefinition[] = [
  {
    name: "Watch",
    params: [
      { name: "ClassName#MethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "MinCost", inputType: "text", checker: () => true, value: "0" }
    ],
    toPayload: (params: string[]) => JSON.stringify({ ...commonMap(), type: "WATCH", signature: params[0], minCost: Number.parseInt(params[1] || "0", 10) || 0 })
  },
  {
    name: "OuterWatch",
    params: [
      { name: "ClassName#MethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "InnerClassName#InnerMethodName", inputType: "text", checker: classAndMethodChecker, value: "" }
    ],
    toPayload: (params: string[]) => JSON.stringify({ ...commonMap(), type: "OUTER_WATCH", signature: params[0], innerSignature: params[1] })
  },
  {
    name: "Trace",
    params: [
      { name: "ClassName#MethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "MinCost", inputType: "text", checker: () => true, value: "0" },
      { name: "IgnoreSubMethodZeroCost", inputType: "text", checker: () => true, value: "true" }
    ],
    toPayload: (params: string[]) => JSON.stringify({
      ...commonMap(),
      type: "TRACE",
      signature: params[0],
      minCost: Number.parseInt(params[1] || "0", 10) || 0,
      ignoreZero: params[2] === "true"
    })
  },
  {
    name: "ChangeBody",
    params: [
      { name: "ClassName#MethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "ParamTypes", inputType: "text", checker: () => true, value: "" },
      { name: "Engine", inputType: "select", checker: () => true, value: "asm", options: engineOptions },
      { name: "Body", inputType: "textarea", checker: () => true, value: "" }
    ],
    toPayload: (params: string[]) => {
      const [className, method] = splitSignature(params[0])
      return JSON.stringify({
        ...commonMap(),
        type: "CHANGE_BODY",
        className,
        method,
        paramTypes: parseParamTypes(params[1]),
        body: params[3],
        mode: engineToMode(params[2])
      })
    }
  },
  {
    name: "ChangeResult",
    params: [
      { name: "ClassName#MethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "ParamTypes", inputType: "text", checker: () => true, value: "" },
      { name: "InnerClassName#InnerMethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "Engine", inputType: "select", checker: () => true, value: "asm", options: engineOptions },
      { name: "Body", inputType: "textarea", checker: () => true, value: "" }
    ],
    toPayload: (params: string[]) => {
      const [className, method] = splitSignature(params[0])
      const [innerClassName, innerMethod] = splitSignature(params[2])
      return JSON.stringify({
        ...commonMap(),
        type: "CHANGE_RESULT",
        className,
        method,
        paramTypes: parseParamTypes(params[1]),
        innerClassName,
        innerMethod,
        body: params[4],
        mode: engineToMode(params[3])
      })
    }
  },
  {
    name: "Decompile",
    params: [
      { name: "ClassName", inputType: "text", checker: nonEmptyChecker, value: "" }
    ],
    toPayload: (params: string[]) => JSON.stringify({
      ...commonMap(),
      type: "DECOMPILE",
      className: params[0]
    })
  },
  {
    name: "Eval",
    params: [
      {
        name: "Body",
        inputType: "textarea",
        checker: nonEmptyChecker,
        value: "ctx.getBeanDefinitionNames().length"
      }
    ],
    toPayload: (params: string[]) => JSON.stringify({
      ...commonMap(),
      type: "EVAL",
      body: params[0]
    })
  },
  {
    name: "Exec",
    params: [
      {
        name: "Body",
        inputType: "textarea",
        checker: () => true,
        value: `
    try {
      ApplicationContext ctx =
        (ApplicationContext) SpringUtils.getSpringBootApplicationContext();
      Global.info(Arrays.toString(ctx.getBeanDefinitionNames()));
    } catch (Exception e) {
      Global.error(e.toString(), e);
    }
`
      }
    ],
    toPayload: (params: string[]) => JSON.stringify({
      ...commonMap(),
      type: "EXEC",
      body: `package w;
import w.Global;
import w.util.SpringUtils;
import org.springframework.context.ApplicationContext;
import java.util.*;
public class Exec{
  public void exec() {${params[0] ?? ""}}
}`
    })
  },
  {
    name: "Reset",
    params: [],
    toPayload: () => JSON.stringify({ ...commonMap(), type: "RESET" })
  }
]

export function buildInitialFormValues(actionIndex: number): string[] {
  return menu[actionIndex].params.map((param: FunctionDefinition["params"][number]) => param.value)
}

export function validateAction(actionIndex: number, values: string[]): boolean {
  return menu[actionIndex].params.every((param: FunctionDefinition["params"][number], index: number) => param.checker(values[index] ?? ""))
}

export function buildPayload(actionIndex: number, values: string[]): string {
  return menu[actionIndex].toPayload(values)
}
