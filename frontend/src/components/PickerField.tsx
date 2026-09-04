import { createUniqueId, type Component } from "solid-js";
import { openPicker } from "../lib/picker";

export type PickerMode = "date" | "datetime-local";
export type PickerVariant = "inline" | "form";

type PickerFieldProps = {
  id?: string;
  label: string;
  value: string;
  mode: PickerMode;
  variant?: PickerVariant;
  error?: string | null;
  required?: boolean;
  onChange: (value: string) => void;
  fallbackValue?: () => string;
};

export const PickerField: Component<PickerFieldProps> = (props) => {
  const generatedId = createUniqueId();
  const fieldId = () => props.id ?? generatedId;
  const variant = () => props.variant ?? "form";

  const ensureValue = () => {
    if (!props.value && props.fallbackValue) {
      props.onChange(props.fallbackValue());
    }
  };

  const handleActivate = (input: HTMLInputElement) => {
    ensureValue();
    openPicker(input);
  };

  const inputClass = () => {
    if (variant() === "inline") {
      return "picker-input date-input";
    }
    return props.error ? "picker-input auth-input-error" : "picker-input auth-input";
  };

  const input = () => (
    <input
      id={fieldId()}
      type={props.mode}
      class={inputClass()}
      value={props.value}
      required={props.required}
      aria-invalid={props.error ? "true" : undefined}
      aria-labelledby={variant() === "inline" ? fieldId() + "-label" : undefined}
      onFocus={(event) => handleActivate(event.currentTarget)}
      onClick={(event) => handleActivate(event.currentTarget)}
      onInput={(event) => props.onChange(event.currentTarget.value)}
    />
  );

  if (variant() === "inline") {
    return (
      <div class="picker-field picker-field-inline date-input-wrap">
        <span id={`${fieldId()}-label`} class="sr-only">
          {props.label}
        </span>
        {input()}
      </div>
    );
  }

  return (
    <div class="picker-field picker-field-form auth-field">
      <div class="auth-label-row">
        <label class="auth-label" for={fieldId()}>
          {props.label}
          {props.required ? " *" : ""}
        </label>
        <span class="auth-inline-error" role="alert" aria-live="polite">
          {props.error ?? ""}
        </span>
      </div>
      {input()}
    </div>
  );
};
