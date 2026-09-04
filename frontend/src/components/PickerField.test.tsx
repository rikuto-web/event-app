import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { PickerField } from "./PickerField";

describe("PickerField", () => {
  it("opens picker on click for inline date input", () => {
    render(() => (
      <PickerField variant="inline" mode="date" label="開始日" value="2026-09-10" onChange={() => undefined} />
    ));

    const input = screen.getByLabelText("開始日") as HTMLInputElement;
    const showPicker = vi.fn();
    input.showPicker = showPicker;

    fireEvent.click(input);
    expect(showPicker).toHaveBeenCalled();
    expect(input.type).toBe("date");
  });

  it("opens picker on click for form datetime input", () => {
    render(() => (
      <PickerField
        id="starts-at"
        mode="datetime-local"
        label="開始"
        value="2026-09-10T10:00"
        onChange={() => undefined}
      />
    ));

    const input = screen.getByLabelText("開始") as HTMLInputElement;
    const showPicker = vi.fn();
    input.showPicker = showPicker;

    fireEvent.click(input);
    expect(showPicker).toHaveBeenCalled();
    expect(input.type).toBe("datetime-local");
  });

  it("fills fallback value before opening picker", () => {
    const onChange = vi.fn();

    render(() => (
      <PickerField
        id="starts-at"
        mode="datetime-local"
        label="開始"
        value=""
        fallbackValue={() => "2026-09-10T10:00"}
        onChange={onChange}
      />
    ));

    const input = screen.getByLabelText("開始") as HTMLInputElement;
    input.showPicker = vi.fn();

    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith("2026-09-10T10:00");
  });
});
