import {
  events,
  userById,
  userByEmail,
  getEvent,
  myRole,
  rsvpSummary,
  nextId,
  formatDateRange,
  formatRelative,
  persistEvents,
  loadPersistedEvents,
  USERS,
  saveExtraUser,
} from "./data.js";

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

/** @type {{ user: import('./data.js').USERS.alice | null, wsConnected: boolean, wsTimer: number | null }} */
const state = {
  user: null,
  wsConnected: false,
  wsTimer: null,
};

loadPersistedEvents();
restoreSession();

/* ── Router ── */
function parseRoute() {
  const hash = location.hash.slice(1) || "/events";
  const [path, query = ""] = hash.split("?");
  const params = Object.fromEntries(new URLSearchParams(query));
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "login") return { name: "login", params };
  if (parts[0] === "register") return { name: "register", params };
  if (parts[0] === "events" && parts.length === 1) return { name: "events", params };
  if (parts[0] === "events" && parts[1] === "new") return { name: "event-new", params };
  if (parts[0] === "events" && parts[2] === "edit") return { name: "event-edit", params: { id: parts[1] } };
  if (parts[0] === "events" && parts[1]) return { name: "event-detail", params: { id: parts[1] } };
  return { name: "events", params };
}

function navigate(path) {
  location.hash = path;
}

function requireAuth(route) {
  const publicRoutes = ["login", "register"];
  if (!state.user && !publicRoutes.includes(route.name)) {
    navigate(`/login?redirect=${encodeURIComponent(location.hash.slice(1) || "/events")}`);
    return false;
  }
  if (state.user && publicRoutes.includes(route.name)) {
    navigate("/events");
    return false;
  }
  return true;
}

window.addEventListener("hashchange", render);

/* ── UI helpers ── */
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg, type = "success") {
  const node = el(`<div class="toast toast-${type}">${escapeHtml(msg)}</div>`);
  toastRoot.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

function showModal({ title, body, confirmLabel = "OK", cancelLabel = "キャンセル", danger = false }) {
  return new Promise((resolve) => {
    const backdrop = el(`
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal">
          <h2>${escapeHtml(title)}</h2>
          <p>${body}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-action="cancel">${escapeHtml(cancelLabel)}</button>
            <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="confirm">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `);
    const close = (v) => {
      backdrop.remove();
      resolve(v);
    };
    backdrop.querySelector('[data-action="cancel"]').onclick = () => close(false);
    backdrop.querySelector('[data-action="confirm"]').onclick = () => close(true);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) close(false);
    };
    modalRoot.appendChild(backdrop);
  });
}

function eventFormFieldsHtml(v) {
  return `
    <div class="field">
      <label for="title">タイトル *</label>
      <input id="title" name="title" required maxlength="100" value="${escapeHtml(v.title)}" />
    </div>
    <div class="field">
      <label for="description">説明</label>
      <textarea id="description" name="description" rows="3" maxlength="2000">${escapeHtml(v.description)}</textarea>
    </div>
    <div class="field">
      <label for="startsAt">開始 *</label>
      <input id="startsAt" name="startsAt" type="datetime-local" required value="${toLocalInput(v.startsAt)}" />
    </div>
    <div class="field">
      <label for="endsAt">終了 *</label>
      <input id="endsAt" name="endsAt" type="datetime-local" required value="${toLocalInput(v.endsAt)}" />
    </div>
    <div class="field">
      <label for="location">場所</label>
      <input id="location" name="location" maxlength="200" value="${escapeHtml(v.location)}" />
    </div>
    <div class="field">
      <label for="imageUrl">画像 URL（任意）</label>
      <input id="imageUrl" name="imageUrl" type="url" placeholder="https://…" value="${escapeHtml(v.imageUrl)}" />
    </div>
    <p id="form-error" class="field-error" hidden></p>
  `;
}

function defaultRangeForDay(year, month, day) {
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${year}-${pad(month + 1)}-${pad(day)}`;
  return {
    startsAt: `${date}T10:00`,
    endsAt: `${date}T12:00`,
  };
}

function showCreateEventModal(defaults = {}) {
  const v = {
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    location: "",
    imageUrl: "",
    ...defaults,
  };

  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal modal-wide">
        <h2>新規イベント</h2>
        <p class="subtitle">必須項目を入力してください</p>
        <form id="event-form">
          ${eventFormFieldsHtml(v)}
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" data-action="cancel">キャンセル</button>
            <button type="submit" class="btn btn-primary">作成</button>
          </div>
        </form>
      </div>
    </div>
  `);

  backdrop.querySelector('[data-action="cancel"]').onclick = () => backdrop.remove();
  backdrop.onclick = (e) => {
    if (e.target === backdrop) backdrop.remove();
  };

  backdrop.querySelector("#event-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const startsAt = fromLocalInput(String(fd.get("startsAt")));
    const endsAt = fromLocalInput(String(fd.get("endsAt")));
    const err = backdrop.querySelector("#form-error");
    if (new Date(endsAt) < new Date(startsAt)) {
      err.hidden = false;
      err.textContent = "終了日時は開始日時以降にしてください";
      return;
    }
    const id = nextId("e");
    events.push({
      id,
      title: String(fd.get("title")),
      description: String(fd.get("description")),
      startsAt,
      endsAt,
      location: String(fd.get("location")),
      imageUrl: String(fd.get("imageUrl")),
      updatedAt: new Date().toISOString(),
      ownerId: state.user.id,
      members: [{ userId: state.user.id, role: "owner" }],
      participations: [{ userId: state.user.id, status: "going" }],
      comments: [],
    });
    persistEvents();
    backdrop.remove();
    toast("イベントを作成しました");
    navigate(`#/events/${id}`);
  };

  modalRoot.appendChild(backdrop);
  backdrop.querySelector("#title").focus();
}

function showDayEventsModal(year, month, day, dayEvents) {
  const label = new Date(year, month, day).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const sorted = [...dayEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const items = sorted
    .map((e) => {
      const role = myRole(e, state.user.id);
      const time = new Date(e.startsAt).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
        <li>
          <a href="#/events/${e.id}">
            <span class="day-event-time">${time}</span>
            <span>${escapeHtml(e.title)}</span>
            <span class="role-pill role-${role}">${role}</span>
          </a>
        </li>`;
    })
    .join("");

  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal modal-wide">
        <h2>${escapeHtml(label)}</h2>
        <p class="subtitle">${sorted.length} 件のイベント</p>
        <ul class="day-event-list">${items}</ul>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-action="cancel">閉じる</button>
          <button type="button" class="btn btn-primary" data-action="create">この日に作成</button>
        </div>
      </div>
    </div>
  `);

  backdrop.querySelector('[data-action="cancel"]').onclick = () => backdrop.remove();
  backdrop.querySelector('[data-action="create"]').onclick = () => {
    backdrop.remove();
    showCreateEventModal(defaultRangeForDay(year, month, day));
  };
  backdrop.onclick = (e) => {
    if (e.target === backdrop) backdrop.remove();
  };
  backdrop.querySelectorAll(".day-event-list a").forEach((a) => {
    a.onclick = () => backdrop.remove();
  });

  modalRoot.appendChild(backdrop);
}

function headerHtml() {
  if (!state.user) return "";
  return `
    <header class="header">
      <div class="logo"><span class="logo-mark">⬡</span> イベント管理</div>
      <div class="user-menu">
        <span class="user-badge">${escapeHtml(state.user.displayName)}</span>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-logout">ログアウト</button>
      </div>
    </header>
  `;
}

function protoBarHtml(showSimulate = false) {
  if (!state.user) return "";
  return `
    <div class="proto-bar">
      <span>プロトタイプ用 — WebSocket シミュレーション</span>
      ${showSimulate ? `<button type="button" id="sim-comment">他ユーザーがコメント</button>` : ""}
      ${showSimulate ? `<button type="button" id="sim-rsvp">他ユーザーが参加表明</button>` : ""}
      <button type="button" id="sim-ws-toggle">${state.wsConnected ? "WS 切断" : "WS 再接続"}</button>
    </div>
  `;
}

function bindHeader() {
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    stopWs();
    state.user = null;
    sessionStorage.removeItem("proto_user");
    toast("ログアウトしました");
    navigate("/login");
  });
}

/* ── Views ── */
function renderLogin(params) {
  app.innerHTML = `
    <div class="shell">
      <div class="auth-card">
        <h1>ログイン</h1>
        <p class="subtitle">デモ: alice@example.com / demo1234</p>
        <form id="login-form">
          <div class="field">
            <label for="email">メールアドレス</label>
            <input id="email" name="email" type="email" required autocomplete="username" value="alice@example.com" />
          </div>
          <div class="field">
            <label for="password">パスワード</label>
            <input id="password" name="password" type="password" required autocomplete="current-password" value="demo1234" />
          </div>
          <p id="login-error" class="field-error" hidden></p>
          <button type="submit" class="btn btn-primary" style="width:100%">ログイン</button>
        </form>
        <p style="margin-top:1rem;font-size:0.88rem;color:var(--muted)">
          アカウントをお持ちでない方は <a href="#/register">新規登録</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById("login-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const user = userByEmail(email);
    const err = document.getElementById("login-error");
    if (!user || user.password !== password) {
      err.hidden = false;
      err.textContent = "メールアドレスまたはパスワードが正しくありません";
      return;
    }
    state.user = user;
    sessionStorage.setItem("proto_user", user.id);
    toast(`ようこそ、${user.displayName} さん`);
    navigate(params.redirect ? decodeURIComponent(params.redirect) : "/events");
  };
}

function renderRegister() {
  app.innerHTML = `
    <div class="shell">
      <div class="auth-card">
        <h1>新規登録</h1>
        <p class="subtitle">プロトタイプでは登録後すぐログインします</p>
        <form id="register-form">
          <div class="field">
            <label for="displayName">表示名</label>
            <input id="displayName" name="displayName" required maxlength="50" />
          </div>
          <div class="field">
            <label for="email">メールアドレス</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div class="field">
            <label for="password">パスワード（8文字以上）</label>
            <input id="password" name="password" type="password" required minlength="8" />
          </div>
          <p id="reg-error" class="field-error" hidden></p>
          <button type="submit" class="btn btn-primary" style="width:100%">登録</button>
        </form>
        <p style="margin-top:1rem;font-size:0.88rem;color:var(--muted)">
          既にアカウントがある方は <a href="#/login">ログイン</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById("register-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = String(fd.get("email"));
    const err = document.getElementById("reg-error");
    if (userByEmail(email)) {
      err.hidden = false;
      err.textContent = "このメールアドレスは既に登録されています";
      return;
    }
    state.user = {
      id: nextId("u"),
      email,
      displayName: String(fd.get("displayName")),
      password: String(fd.get("password")),
    };
    saveExtraUser(state.user);
    sessionStorage.setItem("proto_user", state.user.id);
    toast("登録が完了しました");
    navigate("/events");
  };
}

function filterEvents(params) {
  let list = events.filter((e) => e.members.some((m) => m.userId === state.user.id));

  const role = params.role;
  if (role === "owner") list = list.filter((e) => myRole(e, state.user.id) === "owner");
  if (role === "member") list = list.filter((e) => myRole(e, state.user.id) !== "owner");

  const from = params.from;
  const to = params.to;
  if (from && getViewMode(params) !== "schedule") {
    list = list.filter((e) => e.startsAt.slice(0, 10) >= from);
  }
  if (to && getViewMode(params) !== "schedule") {
    list = list.filter((e) => e.startsAt.slice(0, 10) <= to);
  }

  const sort = params.sort || "starts_at_asc";
  list.sort((a, b) => {
    if (sort === "starts_at_desc") return b.startsAt.localeCompare(a.startsAt);
    if (sort === "updated_desc") return b.updatedAt.localeCompare(a.updatedAt);
    return a.startsAt.localeCompare(b.startsAt);
  });

  return list;
}

function buildListQuery(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function getViewMode(params) {
  if (params.view === "schedule" || params.view === "list") return "schedule";
  return "calendar";
}

function dateOnlyStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateOnly(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getScheduleRange(params) {
  const today = dateOnlyStr(new Date());
  let from = params.from || today;
  let to = params.to || from;
  if (to < from) to = from;

  const start = parseDateOnly(from);
  const maxEnd = new Date(start);
  maxEnd.setDate(maxEnd.getDate() + 6);
  const maxStr = dateOnlyStr(maxEnd);
  if (to > maxStr) to = maxStr;

  const days = [];
  const cur = parseDateOnly(from);
  const end = parseDateOnly(to);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return { from, to, days };
}

function eventsOnDay(list, dayDate) {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return list
    .filter((e) => {
      const s = new Date(e.startsAt);
      const en = new Date(e.endsAt);
      return s < dayEnd && en > dayStart;
    })
    .map((e) => {
      const s = new Date(Math.max(new Date(e.startsAt).getTime(), dayStart.getTime()));
      const en = new Date(Math.min(new Date(e.endsAt).getTime(), dayEnd.getTime()));
      return { event: e, clipStart: s, clipEnd: en };
    })
    .sort((a, b) => a.clipStart - b.clipStart);
}

const HOUR_PX = 48;

function renderSchedule(list, range) {
  const { from, to, days } = range;
  const todayStr = dateOnlyStr(new Date());
  const multi = days.length > 1;

  const hourLabels = Array.from({ length: 24 }, (_, h) => {
    return `<div class="schedule-hour-label" style="height:${HOUR_PX}px">${String(h).padStart(2, "0")}:00</div>`;
  }).join("");

  const dayCols = days
    .map((day) => {
      const ds = dateOnlyStr(day);
      const isToday = ds === todayStr;
      const dayEvents = eventsOnDay(list, day);
      const header = new Date(day).toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      });

      const blocks = dayEvents
        .map(({ event, clipStart, clipEnd }) => {
          const role = myRole(event, state.user.id);
          const topMin = clipStart.getHours() * 60 + clipStart.getMinutes();
          const durMin = Math.max(15, (clipEnd - clipStart) / 60000);
          const top = (topMin / 60) * HOUR_PX;
          const height = Math.max(22, (durMin / 60) * HOUR_PX);
          const timeLabel = `${clipStart.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}–${clipEnd.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
          return `
            <a class="schedule-event role-${role}" href="#/events/${event.id}"
               style="top:${top}px;height:${height}px"
               title="${escapeHtml(event.title)}">
              <span class="schedule-event-time">${timeLabel}</span>
              ${escapeHtml(event.title)}
            </a>`;
        })
        .join("");

      let nowLine = "";
      if (isToday) {
        const now = new Date();
        const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_PX;
        nowLine = `<div class="schedule-now-line" style="top:${nowTop}px"></div>`;
      }

      return `
        <div class="schedule-day-col">
          <div class="schedule-day-header ${isToday ? "today" : ""}">${escapeHtml(header)}</div>
          <div class="schedule-day-body" style="--hour-height:${HOUR_PX}px">
            ${nowLine}
            ${blocks}
          </div>
        </div>`;
    })
    .join("");

  const rangeLabel =
    from === to
      ? parseDateOnly(from).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
      : `${parseDateOnly(from).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} 〜 ${parseDateOnly(to).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`;

  return `
    <div class="schedule-wrap">
      <div class="schedule-nav">
        <h2>${escapeHtml(rangeLabel)} <span style="color:var(--muted);font-weight:400;font-size:0.85rem">（${days.length}日 · 24h）</span></h2>
        <div class="schedule-nav-actions calendar-nav-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="sched-today">今日</button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" id="sched-prev" aria-label="前へ">←</button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" id="sched-next" aria-label="次へ">→</button>
        </div>
      </div>
      <div class="schedule-scroll">
        <div class="schedule-grid ${multi ? "multi-day" : ""}" style="--day-count:${days.length};--hour-height:${HOUR_PX}px">
          <div class="schedule-time-col">${hourLabels}</div>
          ${dayCols}
        </div>
      </div>
    </div>`;
}

function filterEventsForSchedule(list, range) {
  const rangeStart = parseDateOnly(range.from);
  const rangeEnd = parseDateOnly(range.to);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  return list.filter((e) => {
    const s = new Date(e.startsAt);
    const en = new Date(e.endsAt);
    return s < rangeEnd && en > rangeStart;
  });
}

function getCalendarMonth(params) {
  const raw = params.month;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function renderCalendar(list, year, month) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const byDate = {};
  for (const e of list) {
    const d = new Date(e.startsAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(e);
  }
  for (const key of Object.keys(byDate)) {
    byDate[key].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  const cells = [];
  for (let i = 0; i < startPad; i++) {
    const day = daysInPrev - startPad + i + 1;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day, year: y, month: m, other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, year, month, other: false });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - startPad - daysInMonth + 1;
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: nextDay, year: y, month: m, other: true });
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  const grid = cells
    .map(({ day, year: y, month: mo, other }) => {
      const key = `${y}-${mo}-${day}`;
      const isToday = key === todayKey;
      const allDayEvents = byDate[key] || [];
      const dayEvents = allDayEvents.slice(0, 2);
      const overflow = allDayEvents.length - dayEvents.length;
      const chips = dayEvents
        .map((e) => {
          const role = myRole(e, state.user.id);
          const time = new Date(e.startsAt).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `<a class="calendar-event role-${role}" href="#/events/${e.id}" title="${escapeHtml(e.title)}" data-stop-day>${time} ${escapeHtml(e.title)}</a>`;
        })
        .join("");
      return `
        <div class="calendar-day ${other ? "other-month" : ""} ${isToday ? "today" : ""}" data-day-key="${y}-${mo}-${day}">
          <button type="button" class="calendar-day-num-btn" data-day-create="${y}-${mo}-${day}" aria-label="${day}日に作成">${day}</button>
          ${chips}
          ${overflow > 0 ? `<button type="button" class="calendar-more-btn" data-day-more="${y}-${mo}-${day}">他 ${overflow} 件</button>` : ""}
        </div>`;
    })
    .join("");

  return `
    <div class="calendar-wrap">
      <div class="calendar-nav">
        <h2>${monthLabel}</h2>
        <div class="calendar-nav-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="cal-today">今月</button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" id="cal-prev" aria-label="前月">←</button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" id="cal-next" aria-label="翌月">→</button>
        </div>
      </div>
      <div class="calendar-grid">
        ${weekdays.map((w) => `<div class="calendar-weekday">${w}</div>`).join("")}
        ${grid}
      </div>
    </div>`;
}

function renderEvents(params) {
  const view = getViewMode(params);
  const { year, month } = getCalendarMonth(params);
  const baseList = filterEvents(params);

  let body;
  let scheduleRange;
  if (view === "schedule") {
    scheduleRange = getScheduleRange(params);
    const schedList = filterEventsForSchedule(baseList, scheduleRange);
    body = renderSchedule(schedList, scheduleRange);
  } else {
    body = renderCalendar(baseList, year, month);
  }

  const isSchedule = view === "schedule";
  const schedRange = scheduleRange || getScheduleRange(params);

  app.innerHTML = `
    <div class="shell">
      ${headerHtml()}
      <div class="toolbar">
        <div class="view-toggle" role="group" aria-label="表示切替">
          <button type="button" data-view="calendar" class="${!isSchedule ? "active" : ""}">カレンダー</button>
          <button type="button" data-view="schedule" class="${isSchedule ? "active" : ""}">スケジュール</button>
        </div>
        <select id="f-role">
          <option value="">すべて</option>
          <option value="owner" ${params.role === "owner" ? "selected" : ""}>自分が owner</option>
          <option value="member" ${params.role === "member" ? "selected" : ""}>招待されたイベント</option>
        </select>
        <div class="toolbar-schedule-only" ${isSchedule ? "" : "hidden"} id="schedule-range-bar">
          <input type="date" id="f-from" value="${escapeHtml(schedRange.from)}" aria-label="開始日" />
          <span style="color:var(--muted)">〜</span>
          <input type="date" id="f-to" value="${escapeHtml(schedRange.to)}" aria-label="終了日" />
        </div>
        <span class="toolbar-spacer"></span>
        <button type="button" class="btn btn-primary" id="btn-create">+ 新規作成</button>
      </div>
      ${body}
    </div>
    ${protoBarHtml()}
  `;
  document.body.classList.add("has-proto-bar");
  bindHeader();
  bindProtoBar();

  const getFilterParams = () => {
    const p = {
      view,
      role: document.getElementById("f-role").value,
    };
    if (view === "schedule") {
      p.from = document.getElementById("f-from")?.value;
      p.to = document.getElementById("f-to")?.value;
    } else {
      p.month = params.month || monthKey(year, month);
    }
    return p;
  };

  const applyFilters = () => {
    navigate(`/events${buildListQuery(getFilterParams())}`);
  };

  document.querySelectorAll(".view-toggle [data-view]").forEach((btn) => {
    btn.onclick = () => {
      const p = getFilterParams();
      p.view = btn.dataset.view;
      const today = dateOnlyStr(new Date());
      if (p.view === "schedule") {
        p.from = params.from || today;
        p.to = params.to || p.from;
        delete p.month;
      } else {
        delete p.from;
        delete p.to;
        p.month = monthKey(year, month);
      }
      navigate(`/events${buildListQuery(p)}`);
    };
  });

  document.getElementById("f-role").onchange = applyFilters;
  document.getElementById("f-from")?.addEventListener("change", applyFilters);
  document.getElementById("f-to")?.addEventListener("change", applyFilters);
  document.getElementById("btn-create").onclick = () => showCreateEventModal();

  if (params.create === "1") {
    showCreateEventModal();
    const p = { ...params };
    delete p.create;
    history.replaceState(null, "", `#/events${buildListQuery(p)}`);
  }

  if (view === "calendar") {
    bindCalendarInteractions(baseList, year, month);
    const goMonth = (delta) => {
      const d = new Date(year, month + delta, 1);
      const p = getFilterParams();
      p.view = "calendar";
      p.month = monthKey(d.getFullYear(), d.getMonth());
      navigate(`/events${buildListQuery(p)}`);
    };
    document.getElementById("cal-prev").onclick = () => goMonth(-1);
    document.getElementById("cal-next").onclick = () => goMonth(1);
    document.getElementById("cal-today").onclick = () => {
      const now = new Date();
      const p = getFilterParams();
      p.view = "calendar";
      p.month = monthKey(now.getFullYear(), now.getMonth());
      navigate(`/events${buildListQuery(p)}`);
    };
  }

  if (view === "schedule" && scheduleRange) {
    const shiftDays = (delta) => {
      const span = scheduleRange.days.length;
      const start = parseDateOnly(scheduleRange.from);
      start.setDate(start.getDate() + delta * span);
      const end = new Date(start);
      end.setDate(end.getDate() + span - 1);
      const p = getFilterParams();
      p.view = "schedule";
      p.from = dateOnlyStr(start);
      p.to = dateOnlyStr(end);
      navigate(`/events${buildListQuery(p)}`);
    };

    document.getElementById("sched-prev")?.addEventListener("click", () => shiftDays(-1));
    document.getElementById("sched-next")?.addEventListener("click", () => shiftDays(1));
    document.getElementById("sched-today")?.addEventListener("click", () => {
      const today = dateOnlyStr(new Date());
      const p = getFilterParams();
      p.view = "schedule";
      p.from = today;
      p.to = today;
      navigate(`/events${buildListQuery(p)}`);
    });

    const scrollEl = document.querySelector(".schedule-scroll");
    if (scrollEl && scheduleRange.from <= dateOnlyStr(new Date()) && dateOnlyStr(new Date()) <= scheduleRange.to) {
      const now = new Date();
      scrollEl.scrollTop = Math.max(0, ((now.getHours() - 2) * HOUR_PX));
    }
  }
}

function bindCalendarInteractions(list, year, month) {
  const byDate = {};
  for (const e of list) {
    const d = new Date(e.startsAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(e);
  }

  document.querySelectorAll("[data-day-create]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const [y, mo, day] = btn.dataset.dayCreate.split("-").map(Number);
      showCreateEventModal(defaultRangeForDay(y, mo, day));
    };
  });

  document.querySelectorAll("[data-day-more]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const [y, mo, day] = btn.dataset.dayMore.split("-").map(Number);
      showDayEventsModal(y, mo, day, byDate[`${y}-${mo}-${day}`] || []);
    };
  });

  document.querySelectorAll(".calendar-day").forEach((cell) => {
    cell.onclick = (e) => {
      if (e.target.closest("[data-stop-day]") || e.target.closest("[data-day-create]") || e.target.closest("[data-day-more]")) {
        return;
      }
      const [y, mo, day] = cell.dataset.dayKey.split("-").map(Number);
      const dayEvents = byDate[`${y}-${mo}-${day}`] || [];
      if (dayEvents.length === 0) {
        showCreateEventModal(defaultRangeForDay(y, mo, day));
      } else if (dayEvents.length === 1) {
        navigate(`#/events/${dayEvents[0].id}`);
      } else {
        showDayEventsModal(y, mo, day, dayEvents);
      }
    };
  });
}

function renderEventForm(event, isEdit) {
  const v = event || {
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    location: "",
    imageUrl: "",
  };

  app.innerHTML = `
    <div class="shell">
      ${headerHtml()}
      <a class="back-link" href="${isEdit ? `#/events/${event.id}` : "#/events"}">← 戻る</a>
      <h1 class="page-title">${isEdit ? "イベント編集" : "新規イベント"}</h1>
      <p class="subtitle">${isEdit ? "変更を保存すると他メンバーに WebSocket で通知されます（シミュレーション）" : "必須項目を入力してください"}</p>
      <form id="event-form" class="form-card" style="max-width:560px;margin:0">
        ${eventFormFieldsHtml(v)}
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-cancel">キャンセル</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "保存" : "作成"}</button>
        </div>
      </form>
    </div>
    ${protoBarHtml()}
  `;
  document.body.classList.add("has-proto-bar");
  bindHeader();
  bindProtoBar();

  document.getElementById("btn-cancel").onclick = async () => {
    const dirty = formDirty(document.getElementById("event-form"), v);
    if (dirty) {
      const ok = await showModal({
        title: "変更を破棄しますか？",
        body: "入力内容は保存されません。",
        confirmLabel: "破棄する",
      });
      if (!ok) return;
    }
    navigate(isEdit ? `#/events/${event.id}` : "#/events");
  };

  document.getElementById("event-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const startsAt = fromLocalInput(String(fd.get("startsAt")));
    const endsAt = fromLocalInput(String(fd.get("endsAt")));
    const err = document.getElementById("form-error");
    if (new Date(endsAt) < new Date(startsAt)) {
      err.hidden = false;
      err.textContent = "終了日時は開始日時以降にしてください";
      return;
    }
    const payload = {
      title: String(fd.get("title")),
      description: String(fd.get("description")),
      startsAt,
      endsAt,
      location: String(fd.get("location")),
      imageUrl: String(fd.get("imageUrl")),
      updatedAt: new Date().toISOString(),
    };

    if (isEdit) {
      Object.assign(event, payload);
      persistEvents();
      toast("保存しました");
      simulateWsPush(event.id, "event.updated", { title: event.title });
      navigate(`#/events/${event.id}`);
    } else {
      const id = nextId("e");
      events.push({
        id,
        ...payload,
        ownerId: state.user.id,
        members: [{ userId: state.user.id, role: "owner" }],
        participations: [{ userId: state.user.id, status: "going" }],
        comments: [],
      });
      persistEvents();
      toast("イベントを作成しました");
      navigate(`#/events/${id}`);
    }
  };
}

function renderEventDetail(id) {
  const event = getEvent(id);
  if (!event) {
    app.innerHTML = `<div class="shell"><p class="empty-state">イベントが見つかりません</p><a href="#/events">一覧へ</a></div>`;
    return;
  }

  const role = myRole(event, state.user.id);
  if (!role) {
    app.innerHTML = `<div class="shell"><p class="empty-state">このイベントにアクセスする権限がありません</p><a href="#/events">一覧へ</a></div>`;
    return;
  }

  const myPart = event.participations.find((p) => p.userId === state.user.id)?.status;
  const sum = rsvpSummary(event);
  const canEdit = role === "owner" || role === "editor";
  const canDelete = role === "owner";
  const canInvite = role === "owner";

  app.innerHTML = `
    <div class="shell">
      ${headerHtml()}
      <a class="back-link" href="#/events">← 一覧</a>
      <div class="detail-header">
        <h1>${escapeHtml(event.title)}</h1>
        <div class="detail-actions">
          ${canEdit ? `<a href="#/events/${id}/edit" class="btn btn-ghost btn-sm">編集</a>` : ""}
          ${canDelete ? `<button type="button" class="btn btn-danger btn-sm" id="btn-delete">削除</button>` : ""}
        </div>
      </div>

      <div class="live-bar">
        <span class="live-dot ${state.wsConnected ? "" : "disconnected"}"></span>
        <span id="live-label">${state.wsConnected ? "リアルタイム接続中" : "オフライン — 再接続してください"}</span>
      </div>

      ${event.imageUrl ? `<img class="hero-image" src="${escapeHtml(event.imageUrl)}" alt="" />` : ""}

      <dl class="detail-meta">
        <div><dt>日時</dt><dd>${escapeHtml(formatDateRange(event.startsAt, event.endsAt))}</dd></div>
        <div><dt>場所</dt><dd>${escapeHtml(event.location || "—")}</dd></div>
        <div><dt>あなたのロール</dt><dd><span class="role-pill role-${role}">${role}</span></dd></div>
      </dl>
      <p class="detail-desc">${escapeHtml(event.description || "（説明なし）")}</p>

      <section class="panel">
        <div class="panel-head"><h2>参加表明</h2></div>
        <div class="rsvp-group" id="rsvp-group">
          <button type="button" class="rsvp-btn ${myPart === "going" ? "active-going" : ""}" data-status="going">参加する</button>
          <button type="button" class="rsvp-btn ${myPart === "maybe" ? "active-maybe" : ""}" data-status="maybe">未定</button>
          <button type="button" class="rsvp-btn ${myPart === "not_going" ? "active-not_going" : ""}" data-status="not_going">不参加</button>
        </div>
        <p class="rsvp-summary" id="rsvp-summary">参加 ${sum.going} · 未定 ${sum.maybe} · 不参加 ${sum.not_going}</p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>メンバー (${event.members.length})</h2>
          ${canInvite ? `<button type="button" class="btn btn-ghost btn-sm" id="btn-invite">+ 招待</button>` : ""}
        </div>
        <ul class="member-list" id="member-list">
          ${event.members
            .map((m) => {
              const u = userById(m.userId);
              return `<li><span>${escapeHtml(u?.displayName || m.userId)}</span><span class="role-pill role-${m.role}">${m.role}</span></li>`;
            })
            .join("")}
        </ul>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>コメント</h2></div>
        <ul class="comment-list" id="comment-list">
          ${renderComments(event)}
        </ul>
        <form class="comment-form" id="comment-form">
          <input name="body" placeholder="コメントを入力…" maxlength="500" required />
          <button type="submit" class="btn btn-primary btn-sm">送信</button>
        </form>
      </section>
    </div>
    ${protoBarHtml(true)}
  `;
  document.body.classList.add("has-proto-bar");
  bindHeader();
  bindProtoBar(id);

  document.getElementById("rsvp-group").onclick = (e) => {
    const btn = e.target.closest("[data-status]");
    if (!btn) return;
    const status = btn.dataset.status;
    const existing = event.participations.find((p) => p.userId === state.user.id);
    if (existing) existing.status = status;
    else event.participations.push({ userId: state.user.id, status });
    event.updatedAt = new Date().toISOString();
    persistEvents();
    renderEventDetail(id);
    simulateWsPush(id, "participation.updated", { userId: state.user.id, status });
  };

  document.getElementById("comment-form").onsubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.body;
    const body = input.value.trim();
    if (!body) return;
    event.comments.push({
      id: nextId("c"),
      authorId: state.user.id,
      body,
      createdAt: new Date().toISOString(),
    });
    event.updatedAt = new Date().toISOString();
    persistEvents();
    input.value = "";
    document.getElementById("comment-list").innerHTML = renderComments(event);
    toast("コメントを投稿しました");
    simulateWsPush(id, "comment.created", { body, authorId: state.user.id });
  };

  document.getElementById("btn-delete")?.addEventListener("click", async () => {
    const ok = await showModal({
      title: "イベントを削除しますか？",
      body: "この操作は取り消せません。メンバー・コメントもすべて削除されます。",
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    events.splice(
      events.findIndex((e) => e.id === id),
      1,
    );
    persistEvents();
    toast("削除しました");
    navigate("/events");
  });

  document.getElementById("btn-invite")?.addEventListener("click", async () => {
    const email = prompt("招待するユーザーのメール（例: carol@example.com）");
    if (!email) return;
    const u = userByEmail(email.trim());
    if (!u) {
      toast("ユーザーが見つかりません", "error");
      return;
    }
    if (event.members.some((m) => m.userId === u.id)) {
      toast("既にメンバーです", "error");
      return;
    }
    event.members.push({ userId: u.id, role: "viewer" });
    persistEvents();
    toast(`${u.displayName} を招待しました`);
    renderEventDetail(id);
  });

  startWs(id);
}

function renderComments(event) {
  if (!event.comments.length) return `<li class="comment-item" style="color:var(--muted)">まだコメントはありません</li>`;
  return event.comments
    .map((c) => {
      const u = userById(c.authorId);
      return `<li class="comment-item">
        <span class="comment-author">${escapeHtml(u?.displayName || "?")}</span>
        <span class="comment-time">${formatRelative(c.createdAt)}</span>
        <p class="comment-body">${escapeHtml(c.body)}</p>
      </li>`;
    })
    .join("");
}

/* ── WebSocket simulation ── */
function startWs(eventId) {
  stopWs();
  state.wsConnected = true;
  state.wsTimer = window.setInterval(() => {
    if (!state.wsConnected) return;
    /* 15% chance of random ping toast to show connection alive */
    if (Math.random() < 0.08) {
      const label = document.getElementById("live-label");
      if (label) label.textContent = "リアルタイム接続中 · 同期 OK";
    }
  }, 5000);
}

function stopWs() {
  if (state.wsTimer) clearInterval(state.wsTimer);
  state.wsTimer = null;
  state.wsConnected = false;
}

function simulateWsPush(eventId, type, payload) {
  if (!state.wsConnected) return;
  const route = parseRoute();
  if (route.name !== "event-detail" || route.params.id !== eventId) return;

  const event = getEvent(eventId);
  if (!event) return;

  if (type === "comment.created" && payload.authorId !== state.user.id) {
    event.comments.push({
      id: nextId("c"),
      authorId: payload.authorId,
      body: payload.body,
      createdAt: new Date().toISOString(),
    });
    persistEvents();
    document.getElementById("comment-list").innerHTML = renderComments(event);
    toast(`${userById(payload.authorId)?.displayName} がコメントしました`, "success");
  }

  if (type === "participation.updated" && payload.userId !== state.user.id) {
    const p = event.participations.find((x) => x.userId === payload.userId);
    if (p) p.status = payload.status;
    else event.participations.push(payload);
    persistEvents();
    const sum = rsvpSummary(event);
    document.getElementById("rsvp-summary").textContent =
      `参加 ${sum.going} · 未定 ${sum.maybe} · 不参加 ${sum.not_going}`;
    toast(`${userById(payload.userId)?.displayName} が参加表明を更新しました`);
  }

  if (type === "event.updated") {
    toast("イベント情報が更新されました");
  }
}

function bindProtoBar(eventId) {
  document.getElementById("sim-ws-toggle")?.addEventListener("click", () => {
    if (state.wsConnected) {
      stopWs();
      toast("WebSocket を切断しました");
    } else {
      state.wsConnected = true;
      toast("WebSocket に再接続しました");
    }
    if (eventId) renderEventDetail(eventId);
    else render();
  });

  document.getElementById("sim-comment")?.addEventListener("click", () => {
    const others = ["u2", "u3"].filter((id) => id !== state.user.id);
    const authorId = others[Math.floor(Math.random() * others.length)] || "u2";
    const bodies = ["了解です！", "5分遅れます", "資料共有お願いします", "楽しみにしています"];
    simulateWsPush(eventId, "comment.created", {
      authorId,
      body: bodies[Math.floor(Math.random() * bodies.length)],
    });
  });

  document.getElementById("sim-rsvp")?.addEventListener("click", () => {
    const others = ["u2", "u3"].filter((id) => id !== state.user.id);
    const userId = others[0] || "u2";
    const statuses = ["going", "maybe", "not_going"];
    simulateWsPush(eventId, "participation.updated", {
      userId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  });
}

/* ── Utils ── */
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local) {
  return new Date(local).toISOString();
}

function formDirty(form, original) {
  const fd = new FormData(form);
  return (
    String(fd.get("title")) !== (original.title || "") ||
    String(fd.get("description")) !== (original.description || "") ||
    String(fd.get("location")) !== (original.location || "")
  );
}

function restoreSession() {
  const id = sessionStorage.getItem("proto_user");
  if (id) {
    state.user = userById(id) || null;
  }
}

function render() {
  const route = parseRoute();
  if (!requireAuth(route)) return;

  stopWs();
  document.body.classList.toggle("has-proto-bar", !!state.user);

  switch (route.name) {
    case "login":
      renderLogin(route.params);
      break;
    case "register":
      renderRegister();
      break;
    case "events":
      renderEvents(route.params);
      break;
    case "event-new":
      navigate(`/events${buildListQuery({ ...route.params, create: "1" })}`);
      break;
    case "event-edit": {
      const ev = getEvent(route.params.id);
      const role = ev && myRole(ev, state.user?.id);
      if (!ev || !role || role === "viewer") {
        toast("編集権限がありません", "error");
        navigate(`#/events/${route.params.id}`);
        return;
      }
      renderEventForm(ev, true);
      break;
    }
    case "event-detail":
      renderEventDetail(route.params.id);
      break;
    default:
      navigate("/events");
  }
}

if (!location.hash || location.hash === "#/") location.hash = "#/events";
render();
