import type { Component } from "solid-js";

type AuthSubmitButtonProps = {
  label: string;
  loadingLabel: string;
  inactive?: boolean;
  loading?: boolean;
};

export const AuthSubmitButton: Component<AuthSubmitButtonProps> = (props) => {
  const isInactive = () => Boolean(props.inactive || props.loading);

  return (
    <button
      type="submit"
      class="auth-button"
      disabled={props.loading}
      aria-disabled={isInactive()}
    >
      {props.loading ? props.loadingLabel : props.label}
    </button>
  );
};
