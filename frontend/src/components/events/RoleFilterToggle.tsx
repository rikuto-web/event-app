import { For, type Component } from "solid-js";

export type RoleFilterValue = "" | "owner" | "member";

const OPTIONS: Array<{ value: RoleFilterValue; label: string }> = [
  { value: "", label: "すべて" },
  { value: "owner", label: "Owner" },
  { value: "member", label: "招待" },
];

type RoleFilterToggleProps = {
  value: RoleFilterValue;
  onChange: (value: RoleFilterValue) => void;
};

export const RoleFilterToggle: Component<RoleFilterToggleProps> = (props) => {
  return (
    <div class="role-toggle" role="group" aria-label="ロールフィルタ">
      <For each={OPTIONS}>
        {(option) => (
          <button
            type="button"
            class={props.value === option.value ? "active" : undefined}
            aria-pressed={props.value === option.value}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
};

export function parseRoleFilter(value: string | null): RoleFilterValue {
  if (value === "owner" || value === "member") return value;
  return "";
}
