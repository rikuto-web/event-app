import { createUniqueId, type Component } from "solid-js";

type DateInputProps = {
  value: string;
  label: string;
  onChange: (value: string) => void;
};

export const DateInput: Component<DateInputProps> = (props) => {
  const labelId = createUniqueId();

  return (
    <div class="date-input-wrap">
      <span id={labelId} class="sr-only">
        {props.label}
      </span>
      <input
        type="date"
        class="date-input"
        value={props.value}
        aria-labelledby={labelId}
        onInput={(event) => props.onChange(event.currentTarget.value)}
      />
    </div>
  );
};
