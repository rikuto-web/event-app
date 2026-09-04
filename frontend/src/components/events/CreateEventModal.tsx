import { createMemo, createSignal, type Component } from "solid-js";
import { AuthField } from "../auth/AuthField";
import { AuthFormAlert } from "../auth/AuthFormAlert";
import { PickerField } from "../PickerField";
import {
  addHoursToLocalDatetime,
  fromLocalDatetimeInput,
  nowLocalDatetimeInput,
  resolveCreateDefaults,
} from "../../lib/event-dates";
import { createEvent } from "../../lib/events";
import { ApiError } from "../../lib/api";
import {
  validateDatetimeRequired,
  validateEventDatetimeRange,
  validateEventTitle,
} from "../../lib/validation";

export type CreateEventDefaults = {
  startsAt?: string;
  endsAt?: string;
};

type CreateEventModalProps = {
  defaults?: CreateEventDefaults;
  onClose: () => void;
  onCreated: (eventId: string) => void;
};

export const CreateEventModal: Component<CreateEventModalProps> = (props) => {
  const initialRange = resolveCreateDefaults(props.defaults);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [startsAt, setStartsAt] = createSignal(initialRange.startsAt);
  const [endsAt, setEndsAt] = createSignal(initialRange.endsAt);
  const [location, setLocation] = createSignal("");
  const [formError, setFormError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);

  const titleError = createMemo(() => (submitted() || title() ? validateEventTitle(title()) : null));
  const startsAtError = createMemo(() =>
    submitted() || startsAt() ? validateDatetimeRequired(startsAt()) : null,
  );
  const endsAtError = createMemo(() => {
    if (submitted() || endsAt()) {
      return validateDatetimeRequired(endsAt()) ?? validateEventDatetimeRange(startsAt(), endsAt());
    }
    return null;
  });

  const canSubmit = createMemo(
    () =>
      !isSubmitting() &&
      !validateEventTitle(title()) &&
      !validateDatetimeRequired(startsAt()) &&
      !validateDatetimeRequired(endsAt()) &&
      !validateEventDatetimeRange(startsAt(), endsAt()),
  );

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setFormError("");
    setSubmitted(true);

    const titleMessage = validateEventTitle(title());
    const startsAtMessage = validateDatetimeRequired(startsAt());
    const endsAtMessage =
      validateDatetimeRequired(endsAt()) ?? validateEventDatetimeRange(startsAt(), endsAt());
    if (titleMessage || startsAtMessage || endsAtMessage) {
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createEvent({
        title: title().trim(),
        description: description().trim() || undefined,
        starts_at: fromLocalDatetimeInput(startsAt()),
        ends_at: fromLocalDatetimeInput(endsAt()),
        location: location().trim() || undefined,
      });
      props.onCreated(created.id);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else if (error instanceof TypeError) {
        setFormError("サーバーに接続できません。API が起動しているか確認してください。");
      } else {
        setFormError("イベントの作成に失敗しました。時間をおいて再度お試しください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div class="modal-panel modal-panel-wide">
        <div class="modal-header">
          <div>
            <h2 id="create-event-title">新規イベント</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="閉じる" onClick={props.onClose}>
            ×
          </button>
        </div>

        <form class="event-create-form" onSubmit={handleSubmit} novalidate>
          <AuthField
            id="event-title"
            label="タイトル"
            required
            error={titleError()}
            inputProps={{
              name: "title",
              type: "text",
              maxlength: 100,
              required: true,
              value: title(),
              onInput: (event) => setTitle(event.currentTarget.value),
            }}
          />

          <div class="auth-field">
            <div class="auth-label-row">
              <label class="auth-label" for="event-description">
                説明
              </label>
            </div>
            <textarea
              id="event-description"
              class="auth-input event-textarea"
              name="description"
              rows={3}
              value={description()}
              onInput={(event) => setDescription(event.currentTarget.value)}
            />
          </div>

          <div class="event-datetime-row">
            <PickerField
              id="event-starts-at"
              mode="datetime-local"
              label="開始"
              required
              value={startsAt()}
              error={startsAtError()}
              fallbackValue={nowLocalDatetimeInput}
              onChange={setStartsAt}
            />
            <PickerField
              id="event-ends-at"
              mode="datetime-local"
              label="終了"
              required
              value={endsAt()}
              error={endsAtError()}
              fallbackValue={() =>
                startsAt()
                  ? addHoursToLocalDatetime(startsAt(), 2)
                  : addHoursToLocalDatetime(nowLocalDatetimeInput(), 2)
              }
              onChange={setEndsAt}
            />
          </div>

          <AuthField
            id="event-location"
            label="場所"
            inputProps={{
              name: "location",
              type: "text",
              maxlength: 200,
              value: location(),
              onInput: (event) => setLocation(event.currentTarget.value),
            }}
          />

          <AuthFormAlert message={formError()} />

          <div class="modal-actions">
            <button type="button" class="btn btn-ghost btn-sm" onClick={props.onClose} disabled={isSubmitting()}>
              キャンセル
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-sm"
              disabled={isSubmitting() || !canSubmit()}
              aria-disabled={isSubmitting() || !canSubmit()}
            >
              {isSubmitting() ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
