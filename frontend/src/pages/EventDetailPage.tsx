import type { Component } from "solid-js";
import { A, useParams } from "@solidjs/router";

export const EventDetailPage: Component = () => {
  const params = useParams();

  return (
    <section>
      <A href="/events" class="auth-link" style={{ "font-size": "0.9rem" }}>
        ← 一覧
      </A>
      <h1 style={{ "margin-top": "1rem", "font-size": "1.5rem", "font-weight": "700" }}>イベント詳細</h1>
      <p style={{ color: "var(--muted)" }}>イベント ID: {params.eventId}</p>
      <p style={{ color: "var(--muted)", "font-size": "0.9rem" }}>詳細画面の実装は VS-04 で追加します。</p>
    </section>
  );
};
