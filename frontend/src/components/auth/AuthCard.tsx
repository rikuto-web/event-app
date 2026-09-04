import { A } from "@solidjs/router";
import type { Component, JSX } from "solid-js";

type AuthCardProps = {
  title: string;
  description: string;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
  children: JSX.Element;
};

export const AuthCard: Component<AuthCardProps> = (props) => {
  return (
    <section class="auth-card">
      <h1 class="text-2xl font-semibold">{props.title}</h1>
      <p class="mt-2 text-sm text-gray-600">{props.description}</p>
      {props.children}
      <p class="mt-4 text-center text-sm text-gray-600">
        {props.footerText}{" "}
        <A href={props.footerHref} class="auth-link">
          {props.footerLinkLabel}
        </A>
      </p>
    </section>
  );
};
