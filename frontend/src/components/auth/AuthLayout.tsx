import type { Component, JSX } from "solid-js";

export const AuthLayout: Component<{ children: JSX.Element }> = (props) => {
  return (
    <div class="min-h-screen bg-[#f5f6fa]">
      <main class="mx-auto flex min-h-screen max-w-md items-center px-6 py-8">{props.children}</main>
    </div>
  );
};
