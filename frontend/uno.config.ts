import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
  shortcuts: {
    "auth-card": "w-full rounded-lg border border-gray-200 bg-white p-8 shadow-sm",
    "auth-form": "mt-6 w-full space-y-4",
    "auth-field": "w-full space-y-1",
    "auth-label-row": "grid min-h-5 grid-cols-[auto_1fr] items-start gap-x-3",
    "auth-label": "shrink-0 text-sm font-medium text-gray-700",
    "auth-inline-error": "text-right text-xs leading-tight text-red-600",
    "auth-input":
      "appearance-none border-0 box-border w-full rounded bg-white px-3 py-2 text-base outline-none ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-blue-400",
    "auth-input-error":
      "appearance-none border-0 box-border w-full rounded bg-white px-3 py-2 text-base outline-none ring-2 ring-red-500 ring-inset focus:ring-2 focus:ring-red-500",
    "auth-form-alert": "min-h-5 text-center text-sm text-red-600",
    "auth-button":
      "box-border w-full rounded border border-transparent bg-blue-600 px-3 py-2 text-base font-medium text-white outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
    "auth-link": "font-medium text-blue-600 hover:text-blue-700 hover:underline",
  },
});
