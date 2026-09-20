import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, Show, type Component } from "solid-js";
import { AuthField } from "../components/auth/AuthField";
import { AuthFormAlert } from "../components/auth/AuthFormAlert";
import { PickerField } from "../components/PickerField";
import { ApiError } from "../lib/api";
import {
  addHoursToLocalDatetime,
  fromLocalDatetimeInput,
  toLocalDatetimeInput,
} from "../lib/event-dates";
import { canEditEvent, fetchEventDetail, updateEvent } from "../lib/events";
import {
  validateDatetimeRequired,
  validateEventDatetimeRange,
  validateEventTitle,
} from "../lib/validation";

export const EventEditPage: Component = () => {
  const params = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const eventId = () => params.eventId;

  const [detail] = createResource(eventId, fetchEventDetail);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [startsAt, setStartsAt] = createSignal("");
  const [endsAt, setEndsAt] = createSignal("");
  const [location, setLocation] = createSignal("");
  const [initialized, setInitialized] = createSignal(false);
  const [formError, setFormError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);

  const applyDetail = (event: NonNullable<ReturnType<typeof detail>>) => {
    if (initialized()) return;
    setTitle(event.title);
    setDescription(event.description ?? "");
    setStartsAt(toLocalDatetimeInput(event.starts_at));
    setEndsAt(toLocalDatetimeInput(event.ends_at));
    setLocation(event.location ?? "");
    setInitialized(true);
  };

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

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setFormError("");
    setSubmitted(true);

    const titleMessage = validateEventTitle(title());
    const startsAtMessage = validateDatetimeRequired(startsAt());
    const endsAtMessage =
      validateDatetimeRequired(endsAt()) ?? validateEventDatetimeRange(startsAt(), endsAt());
    if (titleMessage || startsAtMessage || endsAtMessage) return;

    setIsSubmitting(true);
    try {
      await updateEvent(eventId(), {
        title: title().trim(),
        description: description().trim() || undefined,
        starts_at: fromLocalDatetimeInput(startsAt()),
        ends_at: fromLocalDatetimeInput(endsAt()),
        location: location().trim() || undefined,
      });
      navigate(`/events/${eventId()}`);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section class="event-edit">
      <A href={`/events/${eventId()}`} class="back-link">
        ← 詳細
      </A>

      <Show when={detail.loading}>
        <p class="empty-state">読み込み中…</p>
      </Show>

      <Show when={detail.error}>
        <p class="empty-state">イベントが見つかりません</p>
      </Show>

      <Show when={detail()}>
        {(event) => {
          applyDetail(event());
          if (!canEditEvent(event().my_role)) {
            return <p class="empty-state">編集権限がありません</p>;
          }

          return (
            <>
              <h1 class="page-title">イベント編集</h1>
              <p class="subtitle">変更を保存すると他メンバーにリアルタイム通知されます</p>

              <form class="event-create-form form-card" onSubmit={handleSubmit} novalidate>
                <AuthField
                  id="edit-title"
                  label="タイトル"
                  required
                  error={titleError()}
                  inputProps={{
                    name: "title",
                    type: "text",
                    maxlength: 100,
                    value: title(),
                    onInput: (e) => setTitle(e.currentTarget.value),
                  }}
                />

                <div class="auth-field">
                  <label class="auth-label" for="edit-description">
                    説明
                  </label>
                  <textarea
                    id="edit-description"
                    class="auth-input event-textarea"
                    rows={3}
                    value={description()}
                    onInput={(e) => setDescription(e.currentTarget.value)}
                  />
                </div>

                <div class="event-datetime-row">
                  <PickerField
                    id="edit-starts-at"
                    mode="datetime-local"
                    label="開始"
                    required
                    value={startsAt()}
                    error={startsAtError()}
                    fallbackValue={() => startsAt()}
                    onChange={setStartsAt}
                  />
                  <PickerField
                    id="edit-ends-at"
                    mode="datetime-local"
                    label="終了"
                    required
                    value={endsAt()}
                    error={endsAtError()}
                    fallbackValue={() =>
                      startsAt() ? addHoursToLocalDatetime(startsAt(), 2) : addHoursToLocalDatetime(startsAt(), 2)
                    }
                    onChange={setEndsAt}
                  />
                </div>

                <AuthField
                  id="edit-location"
                  label="場所"
                  inputProps={{
                    name: "location",
                    type: "text",
                    maxlength: 200,
                    value: location(),
                    onInput: (e) => setLocation(e.currentTarget.value),
                  }}
                />

                <AuthFormAlert message={formError()} />

                <div class="modal-actions">
                  <A href={`/events/${eventId()}`} class="btn btn-ghost btn-sm">
                    キャンセル
                  </A>
                  <button type="submit" class="btn btn-primary btn-sm" disabled={isSubmitting()}>
                    {isSubmitting() ? "保存中..." : "保存"}
                  </button>
                </div>
              </form>
            </>
          );
        }}
      </Show>
    </section>
  );
};
