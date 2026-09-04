import type { Component } from "solid-js";

type AuthFormAlertProps = {
  message?: string | null;
};

export const AuthFormAlert: Component<AuthFormAlertProps> = (props) => {
  return (
    <div class="auth-form-alert" role="alert" aria-live="polite">
      {props.message ?? ""}
    </div>
  );
};
