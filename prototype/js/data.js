/** @typedef {'owner'|'editor'|'viewer'} Role */
/** @typedef {'going'|'maybe'|'not_going'} RsvpStatus */

export const USERS = {
  alice: { id: "u1", email: "alice@example.com", displayName: "Alice", password: "demo1234" },
  bob: { id: "u2", email: "bob@example.com", displayName: "Bob", password: "demo1234" },
  carol: { id: "u3", email: "carol@example.com", displayName: "Carol", password: "demo1234" },
};

/** @type {Array<object>} */
export let events = [
  {
    id: "e1",
    title: "SolidJS 勉強会",
    description: "リアクティビティとルーティングのハンズオン。\n初心者歓迎、ノート PC 持参。",
    startsAt: "2026-09-10T10:00:00+09:00",
    endsAt: "2026-09-10T12:00:00+09:00",
    location: "オンライン（Zoom）",
    imageUrl: "https://images.unsplash.com/photo-1515187028565-6fe993820243?w=800&q=80",
    ownerId: "u1",
    members: [
      { userId: "u1", role: "owner" },
      { userId: "u2", role: "editor" },
      { userId: "u3", role: "viewer" },
    ],
    participations: [
      { userId: "u1", status: "going" },
      { userId: "u2", status: "going" },
      { userId: "u3", status: "maybe" },
    ],
    comments: [
      {
        id: "c1",
        authorId: "u2",
        body: "資料持参します！",
        createdAt: "2026-09-01T09:00:00+09:00",
      },
    ],
    updatedAt: "2026-09-01T09:00:00+09:00",
  },
  {
    id: "e4",
    title: "ランチミーティング",
    description: "勉強会前の軽い打ち合わせ",
    startsAt: "2026-09-10T08:30:00+09:00",
    endsAt: "2026-09-10T09:30:00+09:00",
    location: "カフェ",
    imageUrl: "",
    ownerId: "u1",
    members: [{ userId: "u1", role: "owner" }],
    participations: [{ userId: "u1", status: "going" }],
    comments: [],
    updatedAt: "2026-09-02T11:00:00+09:00",
  },
  {
    id: "e5",
    title: "振り返り会",
    description: "勉強会の後に30分",
    startsAt: "2026-09-10T12:30:00+09:00",
    endsAt: "2026-09-10T13:00:00+09:00",
    location: "オンライン",
    imageUrl: "",
    ownerId: "u2",
    members: [
      { userId: "u2", role: "owner" },
      { userId: "u1", role: "editor" },
    ],
    participations: [{ userId: "u1", status: "maybe" }],
    comments: [],
    updatedAt: "2026-09-02T11:30:00+09:00",
  },
  {
    id: "e2",
    title: "チーム懇親会",
    description: "プロジェクト完了記念。食事代は割り勘。",
    startsAt: "2026-09-15T18:30:00+09:00",
    endsAt: "2026-09-15T21:00:00+09:00",
    location: "大阪駅前",
    imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    ownerId: "u2",
    members: [
      { userId: "u2", role: "owner" },
      { userId: "u1", role: "editor" },
    ],
    participations: [{ userId: "u1", status: "going" }, { userId: "u2", status: "going" }],
    comments: [],
    updatedAt: "2026-09-02T08:00:00+09:00",
  },
  {
    id: "e3",
    title: "OCI インフラ勉強会",
    description: "Terraform + Docker + LB の構成をレビュー。",
    startsAt: "2026-09-20T19:00:00+09:00",
    endsAt: "2026-09-20T21:00:00+09:00",
    location: "オンライン",
    imageUrl: "",
    ownerId: "u1",
    members: [{ userId: "u1", role: "owner" }],
    participations: [{ userId: "u1", status: "going" }],
    comments: [],
    updatedAt: "2026-09-02T10:00:00+09:00",
  },
];

export function userById(id) {
  const base = Object.values(USERS).find((u) => u.id === id);
  if (base) return base;
  try {
    const extra = JSON.parse(sessionStorage.getItem("proto_extra_users") || "{}");
    return extra[id] || null;
  } catch {
    return null;
  }
}

export function saveExtraUser(user) {
  const extra = JSON.parse(sessionStorage.getItem("proto_extra_users") || "{}");
  extra[user.id] = user;
  sessionStorage.setItem("proto_extra_users", JSON.stringify(extra));
}

export function userByEmail(email) {
  return Object.values(USERS).find((u) => u.email === email);
}

export function getEvent(id) {
  return events.find((e) => e.id === id);
}

export function myRole(event, userId) {
  return event?.members.find((m) => m.userId === userId)?.role ?? null;
}

export function rsvpSummary(event) {
  const counts = { going: 0, maybe: 0, not_going: 0 };
  for (const p of event.participations) counts[p.status]++;
  return counts;
}

export function nextId(prefix) {
  return `${prefix}${Date.now().toString(36)}`;
}

export function formatDateRange(starts, ends) {
  const opts = { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" };
  const s = new Date(starts);
  const e = new Date(ends);
  return `${s.toLocaleString("ja-JP", opts)} 〜 ${e.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatRelative(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "たった今";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 時間前`;
  return d.toLocaleDateString("ja-JP");
}

export function persistEvents() {
  sessionStorage.setItem("proto_events", JSON.stringify(events));
}

export function loadPersistedEvents() {
  const raw = sessionStorage.getItem("proto_events");
  if (raw) {
    try {
      events = JSON.parse(raw);
    } catch {
      /* keep default */
    }
  }
}
