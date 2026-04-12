import { useRef } from "react"
import { menu } from "../protocol.js"

type ParamFormProps = {
  actionIndex: number
  values: string[]
  focusIndex: number
  focused: boolean
  validationError: string | null
  onChange: (index: number, value: string) => void
}

export function ParamForm({ actionIndex, values, focusIndex, focused, validationError, onChange }: ParamFormProps) {
  const action = menu[actionIndex]
  const submitFocused = focused && focusIndex === action.params.length
  const textareaRefs = useRef<Record<number, { plainText?: string; initialValue?: string } | null>>({})

  return (
    <box border borderStyle="rounded" borderColor="#d946ef" padding={1} flexDirection="column" gap={1} flexGrow={1} title={action.name}>
      {action.params.length === 0 ? <text fg="#d1d5db">This action does not need parameters.</text> : null}
      {action.params.map((param, index) => (
        <box key={`${action.name}-${param.name}`} flexDirection="column" gap={1}>
          <text fg="#a7f3d0">{param.name}</text>
          <box
            backgroundColor={focused && focusIndex === index ? "#2563eb" : undefined}
            border={focused && focusIndex === index}
            borderColor={focused && focusIndex === index ? "#bfdbfe" : undefined}
          >
            {param.inputType === "textarea" ? (
              <line-number minWidth={4} paddingRight={1} fg="#f472b6">
                <textarea
                  ref={(instance) => {
                    textareaRefs.current[index] = instance
                  }}
                  initialValue={values[index] ?? ""}
                  height={12}
                  width="100%"
                  focused={focused && focusIndex === index}
                  wrapMode="word"
                  onContentChange={() => onChange(index, textareaRefs.current[index]?.plainText ?? values[index] ?? "")}
                />
              </line-number>
            ) : param.inputType === "select" ? (
              <select
                options={(param.options ?? []).map((option) => ({
                  name: option.name,
                  description: option.description,
                  value: option.value
                }))}
                selectedIndex={Math.max(0, (param.options ?? []).findIndex((option) => option.value === (values[index] ?? param.value)))}
                focused={focused && focusIndex === index}
                height={4}
                onChange={(selectedIndex, option) => onChange(index, String(option?.value ?? (param.options ?? [])[selectedIndex]?.value ?? param.value))}
              />
            ) : (
              <input
                value={values[index] ?? ""}
                onChange={(value) => onChange(index, value)}
                width="100%"
                focused={focused && focusIndex === index}
              />
            )}
          </box>
        </box>
      ))}
      <box
        border
        borderStyle={submitFocused ? "double" : "single"}
        borderColor={submitFocused ? "#22c55e" : "#6b7280"}
        backgroundColor={submitFocused ? "#14532d" : undefined}
        paddingX={2}
        paddingY={1}
      >
        <text fg={submitFocused ? "#dcfce7" : "#9ca3af"}>[ Submit ]</text>
      </box>
      {validationError ? <text fg="#f87171">{validationError}</text> : null}
      <text fg="#9ca3af">Tab or Shift+Tab changes form focus. Esc returns to the action menu.</text>
    </box>
  )
}
