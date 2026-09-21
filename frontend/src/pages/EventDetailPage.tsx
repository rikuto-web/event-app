import { A, useNavigate, useParams } from "@solidjs/router";
import { For, Show, createEffect, createResource, createSignal, type Component } from "solid-js";
import { ApiError } from "../lib/api";
import { formatEventDateRange } from "../lib/event-dates";
import { connectEventWebSocket, type EventWsMessage } from "../lib/event-websocket";
import {
  canDeleteEvent,
  canEditEvent,
  canInviteMembers,
  fetchEventComments,
  deleteEvent,
  fetchEventDetail,
  fetchEventMembers,
} from "../lib/events";

export const EventDetailPage: Component = () => {
  const params = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const eventId = () => params.eventId;

  const [detail, { mutate: mutateDetail }] = createResource(eventId, fetchEventDetail);
  const [members] = createResource(eventId, fetchEventMembers);
  const [comments] = createResource(eventId, fetchEventComments);
  const [wsConnected, setWsConnected] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [actionError, setActionError] = createSignal("");

  const isLoading = () => detail.loading || members.loading || comments.loading;
  const loadError = () => detail.error ?? members.error ?? comments.error;

  const applyWsMessage = (message: EventWsMessage) => {
    if (message.type !== "event.updated") return;
    mutateDetail((current) =>
      current
        ? {
            ...current,
            title: message.payload.title ?? current.title,
            description: message.payload.description ?? current.description,
            starts_at: message.payload.starts_at ?? current.starts_at,
            ends_at: message.payload.ends_at ?? current.ends_at,
            location: message.payload.location ?? current.location,
            updated_at: message.payload.updated_at ?? current.updated_at,
          }
        : current,
    );
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setActionError("");
    try {
      await deleteEvent(eventId());
      navigate("/events", { replace: true });
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  createEffect(() => {
    const id = eventId();
    return connectEventWebSocket({
      eventId: id,
      onMessage: applyWsMessage,
      onConnectionChange: setWsConnected,
    });
  });

  return (
    <section class="event-detail">
      <A href="/events" class="back-link">
        ← 一覧
      </A>

      <Show when={isLoading()}>
        <p class="empty-state">読み込み中…</p>
      </Show>

      <Show when={!isLoading() && loadError()}>
        <p class="empty-state">イベントが見つかりません</p>
      </Show>

      <Show when={!isLoading() && !loadError() && detail()}>
        {(event) => (
          <>
            <div class="detail-header">
              <h1>{event().title}</h1>
              <div class="detail-actions">
                <Show when={canEditEvent(event().my_role)}>
                  <A href={`/events/${event().id}/edit`} class="btn btn-ghost btn-sm">
                    編集
                  </A>
                </Show>
                <Show when={canDeleteEvent(event().my_role)}>
                  <button type="button" class="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
                    削除
                  </button>
                </Show>
              </div>
            </div>

            <div class="live-bar">
              <span class={`live-dot ${wsConnected() ? "" : "disconnected"}`} />
              <span>{wsConnected() ? "リアルタイム接続中" : "オフライン — 再接続中…"}</span>
            </div>

            <dl class="detail-meta">
              <div>
                <dt>日時</dt>
                <dd>{formatEventDateRange(event().starts_at, event().ends_at)}</dd>
              </div>
              <div>
                <dt>場所</dt>
                <dd>{event().location || "—"}</dd>
              </div>
              <div>
                <dt>参加状況</dt>
                <dd>
                  参加 {event().participation_summary.going} · 未定 {event().participation_summary.maybe} · 不参加{" "}
                  {event().participation_summary.not_going}
                </dd>
              </div>
            </dl>

            <p class="detail-desc">{event().description || "（説明なし）"}</p>

            <section class="panel">
              <div class="panel-head">
                <h2>メンバー ({members()?.total ?? 0})</h2>
                <Show when={canInviteMembers(event().my_role)}>
                  <button type="button" class="btn btn-ghost btn-sm" disabled>
                    + 招待
                  </button>
                </Show>
              </div>
              <ul class="member-list">
                <For each={members()?.items ?? []}>
                  {(member) => (
                    <li>
                      <span>{member.user.display_name}</span>
                      <span class={`role-pill role-${member.role}`}>{member.role}</span>
                    </li>
                  )}
                </For>
              </ul>
            </section>

            <section class="panel">
              <div class="panel-head">
                <h2>コメント</h2>
              </div>
              <ul class="comment-list">
                <Show
                  when={(comments()?.items.length ?? 0) > 0}
                  fallback={<li class="comment-item comment-empty">まだコメントはありません</li>}
                >
                  <For each={comments()?.items ?? []}>
                    {(comment) => (
                      <li class="comment-item">
                        <span class="comment-author">{comment.author.display_name}</span>
                        <p class="comment-body">{comment.body}</p>
                      </li>
                    )}
                  </For>
                </Show>
              </ul>
            </section>

            <Show when={actionError()}>
              <p class="form-error">{actionError()}</p>
            </Show>
          </>
        )}
      </Show>

      <Show when={showDeleteConfirm()}>
        <div class="modal-backdrop" role="dialog" aria-modal="true">
          <div class="modal-panel">
            <h2>イベントを削除しますか？</h2>
            <p>この操作は取り消せません。</p>
            <div class="modal-actions">
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(false)}>
                キャンセル
              </button>
              <button type="button" class="btn btn-danger btn-sm" disabled={isDeleting()} onClick={handleDelete}>
                {isDeleting() ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </section>
  );
};
