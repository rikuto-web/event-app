import { type Component, type JSX } from "solid-js";

type AuthFieldProps = {
  id: string;
  label: string;
  error?: string | null;
  inputProps: JSX.InputHTMLAttributes<HTMLInputElement>;
};

export const AuthField: Component<AuthFieldProps> = (props) => {
  return (
    <div class="auth-field">
      <div class="auth-label-row">
        <label class="auth-label" for={props.id}>
          {props.label}
        </label>
        <span class="auth-inline-error" role="alert" aria-live="polite">
          {props.error ?? ""}
        </span>
      </div>
      <input
        id={props.id}
        class={props.error ? "auth-input-error" : "auth-input"}
        aria-invalid={props.error ? "true" : undefined}
        {...props.inputProps}
      />
    </div>
  );
};
