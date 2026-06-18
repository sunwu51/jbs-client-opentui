import type { FunctionDefinition } from "./types.js"

const engineOptions = [
  { name: "ASM", description: "Default bytecode engine", value: "asm" },
  { name: "Javassist", description: "Source-level transformer", value: "javassist" }
]

const booleanOptions = [
  { name: "true", description: "Enabled", value: "true" },
  { name: "false", description: "Disabled", value: "false" }
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

function commonArgs(): Record<string, unknown> {
  return {
    logId: randomString(4)
  }
}

function compactArgs(args: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(args).filter(([, value]) => value !== undefined && value !== null && value !== "")
  )
}

function toolCall(name: string, args: Record<string, unknown>): string {
  args = compactArgs(args)
  const id = String(args.logId ?? randomString(4))
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args
    }
  })
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
      { name: "MinCost", inputType: "text", checker: () => true, value: "0" },
      {
        name: "OGNL",
        inputType: "text",
        checker: () => true,
        value: ""
      }
    ],
    toPayload: (params: string[]) => toolCall("watch", {
      ...commonArgs(),
      signature: params[0],
      minCost: Number.parseInt(params[1] || "0", 10) || 0,
      ognl: params[2]?.trim()
    })
  },
  {
    name: "OuterWatch",
    params: [
      { name: "ClassName#MethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "InnerClassName#InnerMethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "IncludeNested", inputType: "select", checker: () => true, value: "true", options: booleanOptions },
      {
        name: "OGNL",
        inputType: "text",
        checker: () => true,
        value: ""
      }
    ],
    toPayload: (params: string[]) => toolCall("outer_watch", {
      ...commonArgs(),
      signature: params[0],
      innerSignature: params[1],
      includeNested: params[2] !== "false",
      ognl: params[3]?.trim()
    })
  },
  {
    name: "Trace",
    params: [
      { name: "ClassName#MethodName", inputType: "text", checker: classAndMethodChecker, value: "" },
      { name: "MinCost", inputType: "text", checker: () => true, value: "0" },
      { name: "IgnoreSubMethodZeroCost", inputType: "select", checker: () => true, value: "true", options: booleanOptions },
      { name: "IncludeNested", inputType: "select", checker: () => true, value: "true", options: booleanOptions }
    ],
    toPayload: (params: string[]) => toolCall("trace", {
      ...commonArgs(),
      signature: params[0],
      minCost: Number.parseInt(params[1] || "0", 10) || 0,
      ignoreZero: params[2] !== "false",
      includeNested: params[3] !== "false"
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
      return toolCall("change_body", {
        ...commonArgs(),
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
      return toolCall("change_result", {
        ...commonArgs(),
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
    toPayload: (params: string[]) => toolCall("decompile", {
      ...commonArgs(),
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
    toPayload: (params: string[]) => toolCall("eval", {
      ...commonArgs(),
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
    toPayload: (params: string[]) => toolCall("exec", {
      ...commonArgs(),
      mode: 1,
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
    toPayload: () => toolCall("reset", { ...commonArgs() })
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
