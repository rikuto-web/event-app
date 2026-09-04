export function openPicker(input: HTMLInputElement) {
  if ("showPicker" in input && typeof input.showPicker === "function") {
    try {
      void input.showPicker();
    } catch {
      // Some browsers reject showPicker without user gesture.
    }
  }
}
