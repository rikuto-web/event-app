import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
  shortcuts: {
    "auth-card":
      "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]",
    "auth-form": "mt-6 w-full space-y-4",
    "auth-field": "w-full space-y-1",
    "auth-label-row": "grid min-h-5 grid-cols-[auto_1fr] items-start gap-x-3",
    "auth-label": "shrink-0 text-sm font-medium text-[var(--muted)]",
    "auth-inline-error": "text-right text-xs leading-tight text-[var(--danger)]",
    "auth-input":
      "appearance-none border-0 box-border w-full rounded-lg bg-[var(--surface-2)] px-3 py-2 text-base text-[var(--text)] outline-none ring-1 ring-[var(--border)] ring-inset focus:ring-2 focus:ring-[var(--accent)]",
    "auth-input-error":
      "appearance-none border-0 box-border w-full rounded-lg bg-[var(--surface-2)] px-3 py-2 text-base text-[var(--text)] outline-none ring-2 ring-[var(--danger)] ring-inset focus:ring-2 focus:ring-[var(--danger)]",
    "auth-form-alert": "min-h-5 text-center text-sm text-[var(--danger)]",
    "auth-button":
      "box-border w-full rounded-lg border border-transparent bg-[var(--accent)] px-3 py-2 text-base font-semibold text-[#0a1218] outline-none hover:bg-[#52e8d8] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60",
    "auth-link": "font-medium text-[var(--accent)] hover:underline",
  },
});
