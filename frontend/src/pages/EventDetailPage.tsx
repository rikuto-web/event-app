import { A, useNavigate, useParams } from "@solidjs/router";
import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
  type Component,
} from "solid-js";
import { getCurrentUser } from "../lib/auth";
import { ApiError } from "../lib/api";
import { formatEventDateRange } from "../lib/event-dates";
import { connectEventWebSocket, type EventWsMessage } from "../lib/event-websocket";
import {
  canDeleteEvent,
  canEditEvent,
  canInviteMembers,
  canManageMember,
  createEventComment,
  deleteEvent,
  deleteEventComment,
  fetchEventComments,
  fetchEventDetail,
  fetchEventMembers,
  inviteEventMember,
  removeEventMember,
  updateEventComment,
  updateEventMemberRole,
  updateEventParticipation,
  type EventCommentItem,
  type EventMemberItem,
} from "../lib/events";

export const EventDetailPage: Component = () => {
  const params = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const eventId = () => params.eventId;

  const [detail, { mutate: mutateDetail, refetch: refetchDetail }] = createResource(eventId, fetchEventDetail);
  const [members, { mutate: mutateMembers, refetch: refetchMembers }] = createResource(eventId, fetchEventMembers);
  const [comments, { mutate: mutateComments, refetch: refetchComments }] = createResource(
    eventId,
    fetchEventComments,
  );

  const [wsConnected, setWsConnected] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [showInvite, setShowInvite] = createSignal(false);
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [inviteRole, setInviteRole] = createSignal<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = createSignal("");
  const [commentBody, setCommentBody] = createSignal("");
  const [commentError, setCommentError] = createSignal("");
  const [actionError, setActionError] = createSignal("");
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [editingCommentId, setEditingCommentId] = createSignal<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = createSignal("");

  const isLoading = () => detail.loading || members.loading || comments.loading;
  const loadError = () => detail.error ?? members.error ?? comments.error;

  const applyWsMessage = (message: EventWsMessage) => {
    if (message.type === "event.updated") {
      mutateDetail((current) =>
        current
          ? {
              ...current,
              title: message.payload.title ?? current.title,
              description: message.payload.description ?? current.description,
              starts_at: message.payload.starts_at ?? current.starts_at,
              ends_at: message.payload.ends_at ?? current.ends_at,
              location: message.payload.location ?? current.location,
              image_url: message.payload.image_url ?? current.image_url,
              updated_at: message.payload.updated_at ?? current.updated_at,
            }
          : current,
      );
      return;
    }

    if (message.type === "comment.created") {
      mutateComments((current) => {
        if (!current) return current;
        if (current.items.some((item) => item.id === message.payload.id)) return current;
        const item: EventCommentItem = {
          id: message.payload.id,
          body: message.payload.body,
          author: message.payload.author,
          created_at: message.payload.created_at,
        };
        return { items: [...current.items, item], total: current.total + 1 };
      });
      return;
    }

    if (message.type === "participation.updated") {
      refetchDetail();
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

  const handleInvite = async (event: Event) => {
    event.preventDefault();
    setInviteError("");
    try {
      const member = await inviteEventMember(eventId(), {
        email: inviteEmail().trim(),
        role: inviteRole(),
      });
      mutateMembers((current) =>
        current ? { items: [...current.items, member], total: current.total + 1 } : current,
      );
      setShowInvite(false);
      setInviteEmail("");
    } catch (error) {
      setInviteError(error instanceof ApiError ? error.message : "招待に失敗しました");
    }
  };

  const handleRsvp = async (status: "going" | "maybe" | "not_going") => {
    setActionError("");
    try {
      const updated = await updateEventParticipation(eventId(), status);
      mutateDetail(updated);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "参加表明に失敗しました");
    }
  };

  const handleCommentSubmit = async (event: Event) => {
    event.preventDefault();
    setCommentError("");
    const body = commentBody().trim();
    if (!body) {
      setCommentError("コメントを入力してください");
      return;
    }
    try {
      const created = await createEventComment(eventId(), body);
      mutateComments((current) =>
        current
          ? { items: [...current.items, created], total: current.total + 1 }
          : { items: [created], total: 1 },
      );
      setCommentBody("");
    } catch (error) {
      setCommentError(error instanceof ApiError ? error.message : "送信に失敗しました");
    }
  };

  const handleCommentEdit = async (commentId: string) => {
    const body = editingCommentBody().trim();
    if (!body) return;
    try {
      const updated = await updateEventComment(eventId(), commentId, body);
      mutateComments((current) =>
        current
          ? {
              items: current.items.map((item) => (item.id === commentId ? updated : item)),
              total: current.total,
            }
          : current,
      );
      setEditingCommentId(null);
    } catch (error) {
      setCommentError(error instanceof ApiError ? error.message : "更新に失敗しました");
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    try {
      await deleteEventComment(eventId(), commentId);
      mutateComments((current) =>
        current
          ? {
              items: current.items.filter((item) => item.id !== commentId),
              total: Math.max(0, current.total - 1),
            }
          : current,
      );
    } catch (error) {
      setCommentError(error instanceof ApiError ? error.message : "削除に失敗しました");
    }
  };

  const handleMemberRoleChange = async (member: EventMemberItem, role: "editor" | "viewer") => {
    try {
      const updated = await updateEventMemberRole(eventId(), member.user_id, role);
      mutateMembers((current) =>
        current
          ? {
              items: current.items.map((item) => (item.user_id === member.user_id ? updated : item)),
              total: current.total,
            }
          : current,
      );
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "ロール変更に失敗しました");
    }
  };

  const handleMemberRemove = async (member: EventMemberItem) => {
    try {
      await removeEventMember(eventId(), member.user_id);
      mutateMembers((current) =>
        current
          ? {
              items: current.items.filter((item) => item.user_id !== member.user_id),
              total: Math.max(0, current.total - 1),
            }
          : current,
      );
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "除外に失敗しました");
    }
  };

  const currentUserId = () => getCurrentUser()?.id;

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

            <Show when={event().image_url}>
              <img class="hero-image" src={event().image_url!} alt="" />
            </Show>

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
                <h2>参加表明</h2>
              </div>
              <div class="rsvp-group">
                <button
                  type="button"
                  class={`rsvp-btn ${event().my_participation === "going" ? "active-going" : ""}`}
                  onClick={() => handleRsvp("going")}
                >
                  参加する
                </button>
                <button
                  type="button"
                  class={`rsvp-btn ${event().my_participation === "maybe" ? "active-maybe" : ""}`}
                  onClick={() => handleRsvp("maybe")}
                >
                  未定
                </button>
                <button
                  type="button"
                  class={`rsvp-btn ${event().my_participation === "not_going" ? "active-not_going" : ""}`}
                  onClick={() => handleRsvp("not_going")}
                >
                  不参加
                </button>
              </div>
            </section>

            <section class="panel">
              <div class="panel-head">
                <h2>メンバー ({members()?.total ?? 0})</h2>
                <Show when={canInviteMembers(event().my_role)}>
                  <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShowInvite(true)}>
                    + 招待
                  </button>
                </Show>
              </div>
              <ul class="member-list">
                <For each={members()?.items ?? []}>
                  {(member) => (
                    <li class="member-row">
                      <span>{member.user.display_name}</span>
                      <Show
                        when={canManageMember(event().my_role) && member.role !== "owner"}
                        fallback={<span class={`role-pill role-${member.role}`}>{member.role}</span>}
                      >
                        <div class="member-actions">
                          <select
                            class="role-select"
                            value={member.role}
                            onChange={(e) =>
                              handleMemberRoleChange(member, e.currentTarget.value as "editor" | "viewer")
                            }
                          >
                            <option value="editor">editor</option>
                            <option value="viewer">viewer</option>
                          </select>
                          <button type="button" class="btn btn-ghost btn-sm" onClick={() => handleMemberRemove(member)}>
                            除外
                          </button>
                        </div>
                      </Show>
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
                        <Show
                          when={editingCommentId() === comment.id}
                          fallback={<p class="comment-body">{comment.body}</p>}
                        >
                          <input
                            class="auth-input"
                            value={editingCommentBody()}
                            onInput={(e) => setEditingCommentBody(e.currentTarget.value)}
                          />
                          <div class="comment-actions">
                            <button type="button" class="btn btn-primary btn-sm" onClick={() => handleCommentEdit(comment.id)}>
                              保存
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setEditingCommentId(null)}>
                              キャンセル
                            </button>
                          </div>
                        </Show>
                        <Show when={comment.author.id === currentUserId() && editingCommentId() !== comment.id}>
                          <div class="comment-actions">
                            <button
                              type="button"
                              class="btn btn-ghost btn-sm"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentBody(comment.body);
                              }}
                            >
                              編集
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm" onClick={() => handleCommentDelete(comment.id)}>
                              削除
                            </button>
                          </div>
                        </Show>
                      </li>
                    )}
                  </For>
                </Show>
              </ul>
              <form class="comment-form" onSubmit={handleCommentSubmit}>
                <input
                  name="body"
                  placeholder="コメントを入力…"
                  maxlength={500}
                  value={commentBody()}
                  onInput={(e) => setCommentBody(e.currentTarget.value)}
                />
                <button type="submit" class="btn btn-primary btn-sm">
                  送信
                </button>
              </form>
              <Show when={commentError()}>
                <p class="form-error">{commentError()}</p>
              </Show>
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

      <Show when={showInvite()}>
        <div class="modal-backdrop" role="dialog" aria-modal="true">
          <div class="modal-panel">
            <h2>メンバーを招待</h2>
            <form onSubmit={handleInvite}>
              <label class="auth-label" for="invite-email">
                メールアドレス
              </label>
              <input
                id="invite-email"
                class="auth-input"
                type="email"
                required
                value={inviteEmail()}
                onInput={(e) => setInviteEmail(e.currentTarget.value)}
              />
              <label class="auth-label" for="invite-role">
                ロール
              </label>
              <select
                id="invite-role"
                class="auth-input"
                value={inviteRole()}
                onChange={(e) => setInviteRole(e.currentTarget.value as "editor" | "viewer")}
              >
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
              <Show when={inviteError()}>
                <p class="form-error">{inviteError()}</p>
              </Show>
              <div class="modal-actions">
                <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShowInvite(false)}>
                  キャンセル
                </button>
                <button type="submit" class="btn btn-primary btn-sm">
                  招待
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </section>
  );
};
