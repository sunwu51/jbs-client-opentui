import { menu } from "../protocol.js"

type ActionMenuProps = {
  focused: boolean
  selectedIndex: number
  onChange: (index: number) => void
  onSelect: (index: number) => void
}

export function ActionMenu({ focused, selectedIndex, onChange, onSelect }: ActionMenuProps) {
  return (
    <box border borderStyle="rounded" borderColor="#d946ef" padding={1} flexGrow={1} title="Input the action?">
      <box
        backgroundColor={focused ? "#2563eb" : undefined}
        border={focused}
        borderColor={focused ? "#bfdbfe" : undefined}
      >
        <select
          focused={focused}
          height={19}
          selectedIndex={selectedIndex}
          options={menu.map((item) => ({
            name: item.name,
            value: item.name,
            description: `${item.params.length} param${item.params.length === 1 ? "" : "s"}`
          }))}
          onChange={(index) => onChange(index)}
          onSelect={(index) => onSelect(index)}
        />
      </box>
      <text fg="#9ca3af">Enter opens the form. Up and Down move the selection.</text>
    </box>
  )
}
