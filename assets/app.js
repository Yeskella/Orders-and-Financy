import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const html = htm.bind(React.createElement);

const DEFAULT_SUPABASE_URL = "https://echazrstskbnoxzxqoms.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_mKHl0igDFDZSndml-XbF4w_pvaO1Rlo";
const DEFAULT_SUPABASE_BUCKET = "feed-images";
const DEFAULT_SUPABASE_LEGACY_STATE_TABLE = "app_state";
const DEFAULT_SUPABASE_META_TABLE = "app_meta";
const DEFAULT_SUPABASE_META_ROW_ID = "main";
const DEFAULT_SUPABASE_PLANNER_TABLE = "planner_entries";
const DEFAULT_SUPABASE_DOGS_TABLE = "dogs_entries";
const DEFAULT_SUPABASE_POSTS_TABLE = "posts";
const DEFAULT_SUPABASE_COMMENTS_TABLE = "post_comments";
const DEFAULT_SUPABASE_MONEY_TABS_TABLE = "money_tabs";
const DEFAULT_SUPABASE_MONEY_GROUPS_TABLE = "money_groups";
const DEFAULT_SUPABASE_MONEY_ITEMS_TABLE = "money_items";
const THEME_STORAGE_KEY = "budget-planner-theme";
const VIEW_STORAGE_KEY = "budget-planner-view";
const SESSION_STORAGE_KEY = "budget-planner-session";
const SUPABASE_URL_STORAGE_KEY = "budget-planner-supabase-url";
const SUPABASE_ANON_KEY_STORAGE_KEY = "budget-planner-supabase-anon-key";
const SUPABASE_BUCKET_STORAGE_KEY = "budget-planner-supabase-bucket";
const DATA_SLICE_META = "meta";
const DATA_SLICE_PLANNER = "planner";
const DATA_SLICE_DOGS = "dogs";
const DATA_SLICE_POSTS = "posts";
const DATA_SLICE_MONEY = "money";

const FIXED_NAV_ITEMS = [
  { id: "planner", label: "Траты", title: "Траты", icon: "planner" },
  { id: "money", label: "Планы", title: "Планы", icon: "money" },
  { id: "plans", label: "Лента", title: "Лента", icon: "feed" },
  { id: "calendar", label: "Календарь", title: "Календарь", icon: "calendar" },
];
const THEMES = [
  { id: "light", label: "Светлая" },
  { id: "paper", label: "Мягкая" },
  { id: "dark", label: "Темная" },
];
const EMOJIS = ["😀", "😍", "🔥", "👍", "🎉", "❤️", "😅", "🙏", "🤝", "✨"];
const LOCAL_USERS = {
  Lesha: "vandal2020",
  Lera: "vandal2021",
};

const AUTHOR_THEME = {
  Lesha: { bg: "#1eb8c9", tint: "#dff7fa" },
  Lera: { bg: "#5b8def", tint: "#e6efff" },
};

function AppIcon({ name, active = false, size = 24 }) {
  const stroke = active ? "#2f6df6" : "currentColor";
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (name === "planner") {
    return html`
      <svg ...${common}>
        <path d="M7 4.5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
        <path d="M8.5 8.5h7" />
        <path d="M8.5 12h7" />
        <path d="M8.5 15.5H13" />
      </svg>
    `;
  }

  if (name === "money") {
    return html`
      <svg ...${common}>
        <path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="M4 9h16" />
        <path d="M8 13h3" />
        <path d="M8 16h5" />
      </svg>
    `;
  }

  if (name === "calendar") {
    return html`
      <svg ...${common}>
        <path d="M7 4v3" />
        <path d="M17 4v3" />
        <path d="M4 9h16" />
        <rect x="4" y="5.5" width="16" height="14" rx="2" />
        <path d="M8 13h.01" />
        <path d="M12 13h.01" />
        <path d="M16 13h.01" />
        <path d="M8 17h.01" />
        <path d="M12 17h.01" />
      </svg>
    `;
  }

  if (name === "palette") {
    return html`
      <svg ...${common}>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M8.5 10h.01" />
        <path d="M12 8.5h.01" />
        <path d="M15.5 10h.01" />
        <path d="M14.5 15.5c0-1.2.8-2 2-2h1" />
      </svg>
    `;
  }

  if (name === "logout") {
    return html`
      <svg ...${common}>
        <path d="M10 6H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
        <path d="M14 16l4-4-4-4" />
        <path d="M18 12H9" />
      </svg>
    `;
  }

  if (name === "comment") {
    return html`
      <svg ...${common}>
        <path d="M7 18.5h9a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v6l-1.5 3Z" />
      </svg>
    `;
  }

  if (name === "settings") {
    return html`
      <svg ...${common}>
        <circle cx="12" cy="12" r="2.2" />
        <path d="M19 12a7 7 0 0 0-.08-1l2.02-1.57-1.9-3.3-2.39.8a7.1 7.1 0 0 0-1.73-1L14.5 3h-5l-.42 2.93a7.1 7.1 0 0 0-1.73 1l-2.39-.8-1.9 3.3L5.08 11a7 7 0 0 0 0 2l-2.02 1.57 1.9 3.3 2.39-.8a7.1 7.1 0 0 0 1.73 1L9.5 21h5l.42-2.93a7.1 7.1 0 0 0 1.73-1l2.39.8 1.9-3.3L18.92 13c.05-.33.08-.66.08-1Z" />
      </svg>
    `;
  }

  return html`
    <svg ...${common}>
      <path d="M4.5 11.5 12 5l7.5 6.5" />
      <path d="M6.5 10.5v8h11v-8" />
    </svg>
  `;
}

const getAuthorTheme = (author) => AUTHOR_THEME[author] || { bg: "#28aebf", tint: "#def6f7" };

const htmlEscape = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);
const sanitizeFileName = (value) => String(value || "file").replace(/[^\w.\-]+/g, "_");

const getDefaultMoneySubitem = (actor = "") => {
  const timestamp = nowISO();
  return {
    id: uid("money-subitem"),
    name: "",
    cost: "",
    completed: false,
    isNew: true,
    createdAt: timestamp,
    createdBy: actor,
    updatedAt: timestamp,
    updatedBy: actor,
  };
};

const getDefaultMoneyGroup = (actor = "") => {
  const timestamp = nowISO();
  return {
    id: uid("money-group"),
    title: "",
    items: [getDefaultMoneySubitem(actor)],
    createdAt: timestamp,
    createdBy: actor,
    updatedAt: timestamp,
    updatedBy: actor,
  };
};

const DEFAULT_STATE = {
  settings: {
    theme: "light",
    lastSyncedAt: "",
    lastUpdatedBy: "",
  },
  view: "planner",
  calendarMonth: "",
  plannerSelectedDate: "",
  dogsSelectedDate: "",
  moneyActiveTabId: "",
  feedFilters: {
    search: "",
    mode: "active",
  },
  plannerEntries: [],
  dogsEntries: [],
  posts: [],
  customTabs: [],
};

const moneyView = (tabId) => `money:${tabId}`;
const isMoneyView = (view) => typeof view === "string" && view.startsWith("money:");
const moneyIdFromView = (view) => (isMoneyView(view) ? view.slice("money:".length) : "");
const isFixedView = (view) => FIXED_NAV_ITEMS.some((item) => item.id === view);

const getStoredTheme = () => window.localStorage.getItem(THEME_STORAGE_KEY) || "light";
const setStoredTheme = (theme) => window.localStorage.setItem(THEME_STORAGE_KEY, theme);

const getStoredView = () => window.localStorage.getItem(VIEW_STORAGE_KEY) || "planner";
const setStoredView = (view) => window.localStorage.setItem(VIEW_STORAGE_KEY, view);

const getStoredSession = () => {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role ? parsed : null;
  } catch (error) {
    return null;
  }
};

const setStoredSession = (session) => window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
const clearStoredSession = () => window.localStorage.removeItem(SESSION_STORAGE_KEY);

const getStoredSupabaseConfig = () => ({
  url: window.localStorage.getItem(SUPABASE_URL_STORAGE_KEY) || DEFAULT_SUPABASE_URL,
  anonKey: window.localStorage.getItem(SUPABASE_ANON_KEY_STORAGE_KEY) || DEFAULT_SUPABASE_ANON_KEY,
  bucket: window.localStorage.getItem(SUPABASE_BUCKET_STORAGE_KEY) || DEFAULT_SUPABASE_BUCKET,
});

let supabaseClientCache = null;
let supabaseClientKey = "";

const getSupabaseClient = () => {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey || !config.bucket) {
    return null;
  }
  const cacheKey = `${config.url}|${config.anonKey}`;
  if (!supabaseClientCache || supabaseClientKey !== cacheKey) {
    supabaseClientCache = createClient(config.url, config.anonKey);
    supabaseClientKey = cacheKey;
  }
  return {
    client: supabaseClientCache,
    bucket: config.bucket,
  };
};

if (typeof window !== "undefined") {
  window.setBudgetSupabaseConfig = ({ url = "", anonKey = "", bucket = DEFAULT_SUPABASE_BUCKET } = {}) => {
    window.localStorage.setItem(SUPABASE_URL_STORAGE_KEY, url);
    window.localStorage.setItem(SUPABASE_ANON_KEY_STORAGE_KEY, anonKey);
    window.localStorage.setItem(SUPABASE_BUCKET_STORAGE_KEY, bucket || DEFAULT_SUPABASE_BUCKET);
  };
  window.clearBudgetSupabaseConfig = () => {
    window.localStorage.removeItem(SUPABASE_URL_STORAGE_KEY);
    window.localStorage.removeItem(SUPABASE_ANON_KEY_STORAGE_KEY);
    window.localStorage.removeItem(SUPABASE_BUCKET_STORAGE_KEY);
  };
}

const toHash = (view) => (
  isMoneyView(view)
    ? "#/money"
    : `#/${view}`
);

const routeToView = (hash) => {
  if (!hash) return getStoredView();
  if (/^#\/money(?:\/.+)?$/.test(hash)) {
    return "money";
  }
  const fixed = FIXED_NAV_ITEMS.find((item) => `#/${item.id}` === hash);
  return fixed ? fixed.id : getStoredView();
};

const validateView = (view, customTabs) => {
  if (view === "dogs") return "planner";
  if (isFixedView(view)) return view;
  if (isMoneyView(view) && customTabs.some((tab) => tab.id === moneyIdFromView(view))) return "money";
  if (customTabs.length) return "planner";
  return "planner";
};

const toMonthKey = (date) => (date || todayISO()).slice(0, 7);

const formatDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
};

const formatShortDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
};

const formatTime = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const MOSCOW_TIME_ZONE = "Europe/Moscow";

const formatMoscowDayKey = (value) => new Intl.DateTimeFormat("en-CA", {
  timeZone: MOSCOW_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date(value));

const formatClockTimeMsk = (value) => new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: MOSCOW_TIME_ZONE,
}).format(new Date(value));

const formatFeedTimeMsk = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (formatMoscowDayKey(date) === formatMoscowDayKey(now)) {
    return "сегодня " + formatClockTimeMsk(value);
  }
  if (formatMoscowDayKey(date) === formatMoscowDayKey(yesterday)) {
    return "вчера " + formatClockTimeMsk(value);
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MOSCOW_TIME_ZONE,
  }).format(date).replace(" г.", "");
};

const compareDesc = (left, right) => new Date(right).getTime() - new Date(left).getTime();

const parseMoneyInput = (value) => {
  const normalized = String(value || "")
    .replace(/\s+/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) => new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

const actorStamp = (actor, at) => {
  if (!actor && !at) return "";
  return [actor, at ? formatTime(at) : ""].filter(Boolean).join(" • ");
};

const initials = (value) => {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

const getImageLabel = (image, fallback = "Изображение") => {
  if (!image) return fallback;
  if (image.fileName) return image.fileName;
  if (image.path) return image.path.split("/").pop() || fallback;
  if (image.publicUrl) {
    try {
      const url = new URL(image.publicUrl);
      return decodeURIComponent(url.pathname.split("/").pop() || fallback);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
};

const sameImageRef = (left, right) => {
  if (!left || !right) return false;
  if (left.path && right.path) return left.path === right.path;
  if (left.publicUrl && right.publicUrl) return left.publicUrl === right.publicUrl;
  if (left.fileName && right.fileName) return left.fileName === right.fileName;
  return false;
};

const normalizeEntry = (entry, prefix) => ({
  id: entry?.id || uid(prefix),
  date: entry?.date || "",
  text: entry?.text || "",
  repeatMonthly: Boolean(entry?.repeatMonthly),
  createdAt: entry?.createdAt || entry?.updatedAt || "",
  createdBy: entry?.createdBy || "",
  updatedAt: entry?.updatedAt || "",
  updatedBy: entry?.updatedBy || "",
});

const normalizeComment = (comment) => ({
  id: comment?.id || uid("comment"),
  author: comment?.author || comment?.createdBy || "Lesha",
  text: comment?.text || "",
  parentId: comment?.parentId || "",
  createdAt: comment?.createdAt || nowISO(),
  createdBy: comment?.createdBy || comment?.author || "",
  updatedAt: comment?.updatedAt || comment?.createdAt || "",
  updatedBy: comment?.updatedBy || comment?.createdBy || comment?.author || "",
});

const normalizePost = (post) => ({
  id: post?.id || uid("post"),
  author: post?.author || post?.createdBy || "Lesha",
  text: post?.text || "",
  images: Array.isArray(post?.images) ? post.images : (post?.image ? [post.image] : []),
  pinned: Boolean(post?.pinned),
  archived: Boolean(post?.archived),
  createdAt: post?.createdAt || nowISO(),
  createdBy: post?.createdBy || post?.author || "",
  updatedAt: post?.updatedAt || post?.createdAt || "",
  updatedBy: post?.updatedBy || post?.createdBy || post?.author || "",
  startDate: post?.startDate || (post?.createdAt ? post.createdAt.slice(0, 10) : todayISO()),
  endDate: post?.endDate || post?.startDate || (post?.createdAt ? post.createdAt.slice(0, 10) : todayISO()),
  comments: Array.isArray(post?.comments) ? post.comments.map((comment) => normalizeComment(comment)) : [],
});

const normalizeMoneySubitem = (row) => ({
  id: row?.id || uid("money-subitem"),
  name: row?.name || row?.title || "",
  cost: row?.cost ?? "",
  completed: Boolean(row?.completed),
  isNew: Boolean(row?.isNew),
  createdAt: row?.createdAt || row?.updatedAt || "",
  createdBy: row?.createdBy || "",
  updatedAt: row?.updatedAt || "",
  updatedBy: row?.updatedBy || "",
});

const sortMoneySubitems = (items) => [...items].sort((left, right) => {
  const completedDiff = Number(Boolean(left.completed)) - Number(Boolean(right.completed));
  if (completedDiff !== 0) return completedDiff;
  const amountDiff = parseMoneyInput(right.cost) - parseMoneyInput(left.cost);
  if (amountDiff !== 0) return amountDiff;
  return (left.name || "").localeCompare(right.name || "", "ru", { sensitivity: "base" });
});
const serializeMoneyDraft = (title, groups) => JSON.stringify({
  title: String(title || "").trim(),
  groups: (groups || []).map((group) => ({
    title: String(group.title || "").trim(),
    items: (group.items || []).map((item) => ({
      name: String(item.name || "").trim(),
      cost: String(item.cost || "").trim(),
      completed: Boolean(item.completed),
    })),
  })),
});
const serializeMoneySubitem = (item) => JSON.stringify({
  name: String(item?.name || "").trim(),
  cost: String(item?.cost || "").trim(),
  completed: Boolean(item?.completed),
});

const normalizeMoneyGroup = (group) => ({
  id: group?.id || uid("money-group"),
  title: group?.title || group?.name || "",
  items: Array.isArray(group?.items)
    ? group.items.map((item) => normalizeMoneySubitem(item))
    : [],
  createdAt: group?.createdAt || group?.updatedAt || "",
  createdBy: group?.createdBy || "",
  updatedAt: group?.updatedAt || "",
  updatedBy: group?.updatedBy || "",
});

const normalizeMoneyTab = (tab) => ({
  id: tab?.id || uid("money-tab"),
  title: tab?.title || "Планы",
  groups: Array.isArray(tab?.groups)
    ? tab.groups.map((group) => normalizeMoneyGroup(group))
    : (Array.isArray(tab?.rows) && tab.rows.length
      ? [{
        ...normalizeMoneyGroup({
          id: uid("money-group"),
          title: "Общее",
          items: tab.rows,
        }),
      }]
      : []),
  createdAt: tab?.createdAt || tab?.updatedAt || "",
  createdBy: tab?.createdBy || "",
  updatedAt: tab?.updatedAt || "",
  updatedBy: tab?.updatedBy || "",
});

const convertLegacyNote = (legacyNote, prefix) => {
  if (!legacyNote?.text) return [];
  return [normalizeEntry({
    id: `${prefix}-legacy`,
    date: legacyNote.date || "",
    text: legacyNote.text || "",
    repeatMonthly: false,
    updatedAt: legacyNote.updatedAt || "",
  }, prefix)];
};

const normalizeState = (payload = {}) => {
  const customTabs = Array.isArray(payload.customTabs)
    ? payload.customTabs.map((tab) => normalizeMoneyTab(tab))
    : [];

  const nextView = validateView(payload.view || getStoredView(), customTabs);

  return {
    settings: {
      theme: payload.settings?.theme || DEFAULT_STATE.settings.theme,
      lastSyncedAt: payload.settings?.lastSyncedAt || "",
      lastUpdatedBy: payload.settings?.lastUpdatedBy || "",
    },
    view: nextView,
    calendarMonth: payload.calendarMonth || "",
    plannerSelectedDate: payload.plannerSelectedDate || "",
    dogsSelectedDate: payload.dogsSelectedDate || "",
    moneyActiveTabId: payload.moneyActiveTabId || moneyIdFromView(payload.view || "") || customTabs[0]?.id || "",
    feedFilters: {
      search: payload.feedFilters?.search || "",
      mode: payload.feedFilters?.mode || (payload.feedFilters?.showArchived ? "archived" : "active"),
    },
    plannerEntries: Array.isArray(payload.plannerEntries)
      ? payload.plannerEntries.map((entry) => normalizeEntry(entry, "planner"))
      : convertLegacyNote(payload.planner, "planner"),
    dogsEntries: Array.isArray(payload.dogsEntries)
      ? payload.dogsEntries.map((entry) => normalizeEntry(entry, "dogs"))
      : convertLegacyNote(payload.dogs, "dogs"),
    posts: Array.isArray(payload.posts)
      ? payload.posts.map((post) => normalizePost(post))
      : [],
    customTabs,
  };
};


const resizeImageFile = (file, maxSide = 1280, quality = 0.84) => new Promise((resolve, reject) => {
  if (!file.type.startsWith("image/")) {
    resolve(file);
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Не удалось подготовить изображение"));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error("Не удалось обработать изображение"));
    image.onload = () => {
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      const outputType = /png|webp|jpeg|jpg/.test(file.type) ? file.type.replace("jpg", "jpeg") : "image/jpeg";
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Не удалось сжать изображение"));
          return;
        }
        resolve(new File([blob], file.name, { type: blob.type || outputType }));
      }, outputType, quality);
    };
    image.src = String(reader.result || "");
  };
  reader.readAsDataURL(file);
});

const imageSrc = (image) => {
  if (!image) return "";
  if (image.publicUrl) return image.publicUrl;
  return "";
};

const getSupabaseStateStore = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  return {
    ...supabase,
    tables: {
      legacy: DEFAULT_SUPABASE_LEGACY_STATE_TABLE,
      meta: DEFAULT_SUPABASE_META_TABLE,
      planner: DEFAULT_SUPABASE_PLANNER_TABLE,
      dogs: DEFAULT_SUPABASE_DOGS_TABLE,
      posts: DEFAULT_SUPABASE_POSTS_TABLE,
      comments: DEFAULT_SUPABASE_COMMENTS_TABLE,
      moneyTabs: DEFAULT_SUPABASE_MONEY_TABS_TABLE,
      moneyGroups: DEFAULT_SUPABASE_MONEY_GROUPS_TABLE,
      moneyItems: DEFAULT_SUPABASE_MONEY_ITEMS_TABLE,
    },
    metaRowId: DEFAULT_SUPABASE_META_ROW_ID,
  };
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const isMissingSupabaseTableError = (error) => {
  const message = String(error?.message || "");
  return error?.code === "42P01"
    || /does not exist/i.test(message)
    || /Could not find the table/i.test(message);
};

const hasStoredStatePayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  return Object.keys(payload).length > 0;
};

const fetchLegacySupabaseJsonState = async (store) => {
  const { data, error } = await store.client
    .from(store.tables.legacy)
    .select("payload")
    .eq("id", store.metaRowId)
    .maybeSingle();

  if (error) {
    if (isMissingSupabaseTableError(error)) {
      return null;
    }
    throw error;
  }

  return hasStoredStatePayload(data?.payload) ? normalizeState(data.payload) : null;
};

const sortByPosition = (left, right) => {
  const leftPosition = Number.isFinite(left?.position) ? left.position : 0;
  const rightPosition = Number.isFinite(right?.position) ? right.position : 0;
  return leftPosition - rightPosition;
};

const getRequiredSlicesForView = (view) => {
  switch (view) {
    case "planner":
      return [DATA_SLICE_META, DATA_SLICE_PLANNER];
    case "plans":
      return [DATA_SLICE_META, DATA_SLICE_POSTS];
    case "money":
      return [DATA_SLICE_META, DATA_SLICE_MONEY];
    case "calendar":
      return [DATA_SLICE_META, DATA_SLICE_PLANNER, DATA_SLICE_POSTS];
    default:
      return [DATA_SLICE_META];
  }
};

const getMetaPatchFromRow = (meta) => ({
  settings: meta?.settings || DEFAULT_STATE.settings,
  view: meta?.view || DEFAULT_STATE.view,
  calendarMonth: meta?.calendar_month || "",
  plannerSelectedDate: meta?.planner_selected_date || "",
  dogsSelectedDate: meta?.dogs_selected_date || "",
  moneyActiveTabId: meta?.money_active_tab_id || "",
  feedFilters: meta?.feed_filters || DEFAULT_STATE.feedFilters,
});

const hasMeaningfulMeta = (meta) => Boolean(
  meta
  && (
    hasStoredStatePayload(meta.settings)
    || meta.view !== DEFAULT_STATE.view
    || meta.calendar_month
    || meta.planner_selected_date
    || meta.dogs_selected_date
    || meta.money_active_tab_id
    || (meta.feed_filters && (
      meta.feed_filters.search
      || meta.feed_filters.mode !== DEFAULT_STATE.feedFilters.mode
    ))
    || meta.settings?.lastSyncedAt
    || meta.settings?.lastUpdatedBy
  )
);

const mergeStatePatch = (current, patch = {}) => normalizeState({
  settings: hasOwn(patch, "settings") ? {
    ...current.settings,
    ...patch.settings,
    theme: current.settings?.theme || getStoredTheme(),
  } : current.settings,
  view: hasOwn(patch, "view") ? patch.view : current.view,
  calendarMonth: hasOwn(patch, "calendarMonth") ? patch.calendarMonth : current.calendarMonth,
  plannerSelectedDate: hasOwn(patch, "plannerSelectedDate") ? patch.plannerSelectedDate : current.plannerSelectedDate,
  dogsSelectedDate: hasOwn(patch, "dogsSelectedDate") ? patch.dogsSelectedDate : current.dogsSelectedDate,
  moneyActiveTabId: hasOwn(patch, "moneyActiveTabId") ? patch.moneyActiveTabId : current.moneyActiveTabId,
  feedFilters: hasOwn(patch, "feedFilters") ? patch.feedFilters : current.feedFilters,
  plannerEntries: hasOwn(patch, "plannerEntries") ? patch.plannerEntries : current.plannerEntries,
  dogsEntries: hasOwn(patch, "dogsEntries") ? patch.dogsEntries : current.dogsEntries,
  posts: hasOwn(patch, "posts") ? patch.posts : current.posts,
  customTabs: hasOwn(patch, "customTabs") ? patch.customTabs : current.customTabs,
});

const assertSupabaseResult = (result, missingMessage = "Supabase schema is not ready") => {
  if (!result?.error) {
    return result.data;
  }
  if (isMissingSupabaseTableError(result.error)) {
    throw new Error(missingMessage);
  }
  throw new Error(result.error.message || "Supabase request failed");
};

const fetchMetaSlice = async (store) => {
  const result = await store.client
    .from(store.tables.meta)
    .select("*")
    .eq("id", store.metaRowId)
    .maybeSingle();

  return getMetaPatchFromRow(assertSupabaseResult(result));
};

const fetchEntriesSlice = async (store, table, key) => {
  const result = await store.client
    .from(table)
    .select("*")
    .order("updated_at", { ascending: false });

  const rows = assertSupabaseResult(result);
  return {
    [key]: (rows || []).map((entry) => ({
      id: entry.id,
      date: entry.date || "",
      text: entry.text || "",
      repeatMonthly: Boolean(entry.repeat_monthly),
      createdAt: entry.created_at || "",
      createdBy: entry.created_by || "",
      updatedAt: entry.updated_at || "",
      updatedBy: entry.updated_by || "",
    })),
  };
};

const fetchPostsSlice = async (store) => {
  const [postsResult, commentsResult] = await Promise.all([
    store.client.from(store.tables.posts).select("*").order("created_at", { ascending: false }),
    store.client.from(store.tables.comments).select("*").order("created_at", { ascending: true }),
  ]);

  const postsRows = assertSupabaseResult(postsResult);
  const commentsRows = assertSupabaseResult(commentsResult);
  const commentsByPostId = new Map();

  (commentsRows || []).forEach((comment) => {
    const comments = commentsByPostId.get(comment.post_id) || [];
    comments.push({
      id: comment.id,
      author: comment.author || comment.created_by || "Lesha",
      text: comment.text || "",
      parentId: comment.parent_id || "",
      createdAt: comment.created_at || "",
      createdBy: comment.created_by || comment.author || "",
      updatedAt: comment.updated_at || comment.created_at || "",
      updatedBy: comment.updated_by || comment.created_by || comment.author || "",
    });
    commentsByPostId.set(comment.post_id, comments);
  });

  return {
    posts: (postsRows || []).map((post) => ({
      id: post.id,
      author: post.author || post.created_by || "Lesha",
      text: post.text || "",
      images: Array.isArray(post.images) ? post.images : [],
      pinned: Boolean(post.pinned),
      archived: Boolean(post.archived),
      createdAt: post.created_at || "",
      createdBy: post.created_by || post.author || "",
      updatedAt: post.updated_at || post.created_at || "",
      updatedBy: post.updated_by || post.created_by || post.author || "",
      startDate: post.start_date || "",
      endDate: post.end_date || post.start_date || "",
      comments: commentsByPostId.get(post.id) || [],
    })),
  };
};

const fetchMoneySlice = async (store) => {
  const [tabsResult, groupsResult, itemsResult] = await Promise.all([
    store.client.from(store.tables.moneyTabs).select("*").order("position", { ascending: true }),
    store.client.from(store.tables.moneyGroups).select("*").order("position", { ascending: true }),
    store.client.from(store.tables.moneyItems).select("*").order("position", { ascending: true }),
  ]);

  const tabsRows = assertSupabaseResult(tabsResult);
  const groupsRows = assertSupabaseResult(groupsResult);
  const itemsRows = assertSupabaseResult(itemsResult);
  const itemsByGroupId = new Map();

  (itemsRows || []).forEach((item) => {
    const items = itemsByGroupId.get(item.group_id) || [];
    items.push({
      id: item.id,
      name: item.name || "",
      cost: item.cost ?? "",
      completed: Boolean(item.completed),
      isNew: Boolean(item.is_new),
      createdAt: item.created_at || "",
      createdBy: item.created_by || "",
      updatedAt: item.updated_at || "",
      updatedBy: item.updated_by || "",
      position: item.position || 0,
    });
    itemsByGroupId.set(item.group_id, items);
  });

  const groupsByTabId = new Map();
  (groupsRows || []).forEach((group) => {
    const groups = groupsByTabId.get(group.tab_id) || [];
    groups.push({
      id: group.id,
      title: group.title || "",
      items: (itemsByGroupId.get(group.id) || []).sort(sortByPosition),
      createdAt: group.created_at || "",
      createdBy: group.created_by || "",
      updatedAt: group.updated_at || "",
      updatedBy: group.updated_by || "",
      position: group.position || 0,
    });
    groupsByTabId.set(group.tab_id, groups);
  });

  return {
    customTabs: (tabsRows || []).map((tab) => ({
      id: tab.id,
      title: tab.title || "",
      groups: (groupsByTabId.get(tab.id) || []).sort(sortByPosition),
      createdAt: tab.created_at || "",
      createdBy: tab.created_by || "",
      updatedAt: tab.updated_at || "",
      updatedBy: tab.updated_by || "",
      position: tab.position || 0,
    })),
  };
};

const fetchStateSlices = async (slices) => {
  const store = getSupabaseStateStore();
  const uniqueSlices = [...new Set(slices)];
  const patches = await Promise.all(uniqueSlices.map((slice) => {
    switch (slice) {
      case DATA_SLICE_META:
        return fetchMetaSlice(store);
      case DATA_SLICE_PLANNER:
        return fetchEntriesSlice(store, store.tables.planner, "plannerEntries");
      case DATA_SLICE_DOGS:
        return fetchEntriesSlice(store, store.tables.dogs, "dogsEntries");
      case DATA_SLICE_POSTS:
        return fetchPostsSlice(store);
      case DATA_SLICE_MONEY:
        return fetchMoneySlice(store);
      default:
        return {};
    }
  }));

  return patches.reduce((accumulator, patch) => ({ ...accumulator, ...patch }), {});
};

const hasRelationalData = async (store) => {
  const [metaResult, plannerResult, dogsResult, postsResult, tabsResult] = await Promise.all([
    store.client.from(store.tables.meta).select("*").eq("id", store.metaRowId).maybeSingle(),
    store.client.from(store.tables.planner).select("id", { count: "exact", head: true }),
    store.client.from(store.tables.dogs).select("id", { count: "exact", head: true }),
    store.client.from(store.tables.posts).select("id", { count: "exact", head: true }),
    store.client.from(store.tables.moneyTabs).select("id", { count: "exact", head: true }),
  ]);

  const results = [metaResult, plannerResult, dogsResult, postsResult, tabsResult];
  const missingResult = results.find((result) => result.error && isMissingSupabaseTableError(result.error));
  if (missingResult) {
    throw new Error("Supabase schema is not ready");
  }

  const failedResult = results.find((result) => result.error);
  if (failedResult) {
    throw new Error(failedResult.error.message || "Supabase request failed");
  }

  return hasMeaningfulMeta(metaResult.data)
    || Number(plannerResult.count || 0) > 0
    || Number(dogsResult.count || 0) > 0
    || Number(postsResult.count || 0) > 0
    || Number(tabsResult.count || 0) > 0;
};

const upsertRows = async (client, table, rows) => {
  if (!rows.length) {
    return;
  }
  const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    throw error;
  }
};

const deleteMissingRows = async (client, table, activeIds) => {
  const { data, error } = await client.from(table).select("id");
  if (error) {
    throw error;
  }
  const activeIdSet = new Set(activeIds);
  const missingIds = (data || []).map((row) => row.id).filter((id) => !activeIdSet.has(id));
  if (!missingIds.length) {
    return;
  }
  const { error: deleteError } = await client.from(table).delete().in("id", missingIds);
  if (deleteError) {
    throw deleteError;
  }
};

const saveFullState = async (payload, providedStore = null) => {
  const state = normalizeState(payload);
  const store = providedStore || getSupabaseStateStore();
  const client = store.client;

  const metaRow = {
    id: store.metaRowId,
    settings: state.settings,
    view: state.view,
    calendar_month: state.calendarMonth,
    planner_selected_date: state.plannerSelectedDate,
    dogs_selected_date: state.dogsSelectedDate,
    money_active_tab_id: state.moneyActiveTabId,
    feed_filters: state.feedFilters,
    updated_at: nowISO(),
  };

  const plannerRows = state.plannerEntries.map((entry) => ({
    id: entry.id,
    date: entry.date || "",
    text: entry.text || "",
    repeat_monthly: Boolean(entry.repeatMonthly),
    created_at: entry.createdAt || "",
    created_by: entry.createdBy || "",
    updated_at: entry.updatedAt || "",
    updated_by: entry.updatedBy || "",
  }));

  const dogsRows = state.dogsEntries.map((entry) => ({
    id: entry.id,
    date: entry.date || "",
    text: entry.text || "",
    repeat_monthly: Boolean(entry.repeatMonthly),
    created_at: entry.createdAt || "",
    created_by: entry.createdBy || "",
    updated_at: entry.updatedAt || "",
    updated_by: entry.updatedBy || "",
  }));

  const postRows = state.posts.map((post) => ({
    id: post.id,
    author: post.author || "",
    text: post.text || "",
    images: Array.isArray(post.images) ? post.images : [],
    pinned: Boolean(post.pinned),
    archived: Boolean(post.archived),
    created_at: post.createdAt || "",
    created_by: post.createdBy || "",
    updated_at: post.updatedAt || "",
    updated_by: post.updatedBy || "",
    start_date: post.startDate || "",
    end_date: post.endDate || "",
  }));

  const commentRows = state.posts.flatMap((post) => (post.comments || []).map((comment) => ({
    id: comment.id,
    post_id: post.id,
    author: comment.author || "",
    text: comment.text || "",
    parent_id: comment.parentId || "",
    created_at: comment.createdAt || "",
    created_by: comment.createdBy || "",
    updated_at: comment.updatedAt || "",
    updated_by: comment.updatedBy || "",
  })));

  const tabRows = state.customTabs.map((tab, index) => ({
    id: tab.id,
    title: tab.title || "",
    position: index,
    created_at: tab.createdAt || "",
    created_by: tab.createdBy || "",
    updated_at: tab.updatedAt || "",
    updated_by: tab.updatedBy || "",
  }));

  const groupRows = state.customTabs.flatMap((tab) => (tab.groups || []).map((group, index) => ({
    id: group.id,
    tab_id: tab.id,
    title: group.title || "",
    position: index,
    created_at: group.createdAt || "",
    created_by: group.createdBy || "",
    updated_at: group.updatedAt || "",
    updated_by: group.updatedBy || "",
  })));

  const itemRows = state.customTabs.flatMap((tab) => (tab.groups || []).flatMap((group) => (group.items || []).map((item, index) => ({
    id: item.id,
    group_id: group.id,
    name: item.name || "",
    cost: item.cost ?? "",
    completed: Boolean(item.completed),
    is_new: Boolean(item.isNew),
    position: index,
    created_at: item.createdAt || "",
    created_by: item.createdBy || "",
    updated_at: item.updatedAt || "",
    updated_by: item.updatedBy || "",
  }))));

  const { error: metaError } = await client.from(store.tables.meta).upsert(metaRow, { onConflict: "id" });
  if (metaError) {
    if (isMissingSupabaseTableError(metaError)) {
      throw new Error("? Supabase ?? ??????? ????? ????? ?????? ?????????");
    }
    throw new Error(metaError.message || "?? ??????? ????????? ?????? ? Supabase");
  }

  try {
    await upsertRows(client, store.tables.planner, plannerRows);
    await upsertRows(client, store.tables.dogs, dogsRows);
    await upsertRows(client, store.tables.posts, postRows);
    await upsertRows(client, store.tables.comments, commentRows);
    await upsertRows(client, store.tables.moneyTabs, tabRows);
    await upsertRows(client, store.tables.moneyGroups, groupRows);
    await upsertRows(client, store.tables.moneyItems, itemRows);

    await deleteMissingRows(client, store.tables.comments, commentRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.posts, postRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.planner, plannerRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.dogs, dogsRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.moneyItems, itemRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.moneyGroups, groupRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.moneyTabs, tabRows.map((row) => row.id));
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      throw new Error("? Supabase ?? ??????? ????? ????? ?????? ?????????");
    }
    throw new Error(error.message || "?? ??????? ????????? ?????? ? Supabase");
  }

  return { ok: true };
};

const ensureSupabaseStateReady = async () => {
  const store = getSupabaseStateStore();
  if (await hasRelationalData(store)) {
    return;
  }

  const legacySupabaseState = await fetchLegacySupabaseJsonState(store);
  if (legacySupabaseState) {
    await saveFullState({
      ...legacySupabaseState,
      settings: {
        ...legacySupabaseState.settings,
        theme: DEFAULT_STATE.settings.theme,
      },
    }, store);
    return;
  }

  await saveFullState(normalizeState(DEFAULT_STATE), store);
};

const serializeMetaState = (state) => JSON.stringify({
  settings: {
    ...state.settings,
    theme: DEFAULT_STATE.settings.theme,
  },
  view: state.view,
  calendarMonth: state.calendarMonth,
  plannerSelectedDate: state.plannerSelectedDate,
  dogsSelectedDate: state.dogsSelectedDate,
  moneyActiveTabId: state.moneyActiveTabId,
  feedFilters: state.feedFilters,
});

const saveMetaState = async (store, state) => {
  const metaRow = {
    id: store.metaRowId,
    settings: {
      ...state.settings,
      theme: DEFAULT_STATE.settings.theme,
    },
    view: state.view,
    calendar_month: state.calendarMonth,
    planner_selected_date: state.plannerSelectedDate,
    dogs_selected_date: state.dogsSelectedDate,
    money_active_tab_id: state.moneyActiveTabId,
    feed_filters: state.feedFilters,
    updated_at: nowISO(),
  };

  const { error } = await store.client.from(store.tables.meta).upsert(metaRow, { onConflict: "id" });
  if (error) {
    if (isMissingSupabaseTableError(error)) {
      throw new Error("Supabase schema is not ready");
    }
    throw new Error(error.message || "Supabase request failed");
  }
};

const saveEntriesSlice = async (store, table, entries) => {
  const rows = entries.map((entry) => ({
    id: entry.id,
    date: entry.date || "",
    text: entry.text || "",
    repeat_monthly: Boolean(entry.repeatMonthly),
    created_at: entry.createdAt || "",
    created_by: entry.createdBy || "",
    updated_at: entry.updatedAt || "",
    updated_by: entry.updatedBy || "",
  }));

  await upsertRows(store.client, table, rows);
  await deleteMissingRows(store.client, table, rows.map((row) => row.id));
};

const savePostsSlice = async (store, posts) => {
  const postRows = posts.map((post) => ({
    id: post.id,
    author: post.author || "",
    text: post.text || "",
    images: Array.isArray(post.images) ? post.images : [],
    pinned: Boolean(post.pinned),
    archived: Boolean(post.archived),
    created_at: post.createdAt || "",
    created_by: post.createdBy || "",
    updated_at: post.updatedAt || "",
    updated_by: post.updatedBy || "",
    start_date: post.startDate || "",
    end_date: post.endDate || "",
  }));

  const commentRows = posts.flatMap((post) => (post.comments || []).map((comment) => ({
    id: comment.id,
    post_id: post.id,
    author: comment.author || "",
    text: comment.text || "",
    parent_id: comment.parentId || "",
    created_at: comment.createdAt || "",
    created_by: comment.createdBy || "",
    updated_at: comment.updatedAt || "",
    updated_by: comment.updatedBy || "",
  })));

  await upsertRows(store.client, store.tables.posts, postRows);
  await upsertRows(store.client, store.tables.comments, commentRows);
  await deleteMissingRows(store.client, store.tables.comments, commentRows.map((row) => row.id));
  await deleteMissingRows(store.client, store.tables.posts, postRows.map((row) => row.id));
};

const saveMoneySlice = async (store, customTabs) => {
  const tabRows = customTabs.map((tab, index) => ({
    id: tab.id,
    title: tab.title || "",
    position: index,
    created_at: tab.createdAt || "",
    created_by: tab.createdBy || "",
    updated_at: tab.updatedAt || "",
    updated_by: tab.updatedBy || "",
  }));

  const groupRows = customTabs.flatMap((tab) => (tab.groups || []).map((group, index) => ({
    id: group.id,
    tab_id: tab.id,
    title: group.title || "",
    position: index,
    created_at: group.createdAt || "",
    created_by: group.createdBy || "",
    updated_at: group.updatedAt || "",
    updated_by: group.updatedBy || "",
  })));

  const itemRows = customTabs.flatMap((tab) => (tab.groups || []).flatMap((group) => (group.items || []).map((item, index) => ({
    id: item.id,
    group_id: group.id,
    name: item.name || "",
    cost: item.cost ?? "",
    completed: Boolean(item.completed),
    is_new: Boolean(item.isNew),
    position: index,
    created_at: item.createdAt || "",
    created_by: item.createdBy || "",
    updated_at: item.updatedAt || "",
    updated_by: item.updatedBy || "",
  }))));

  await upsertRows(store.client, store.tables.moneyTabs, tabRows);
  await upsertRows(store.client, store.tables.moneyGroups, groupRows);
  await upsertRows(store.client, store.tables.moneyItems, itemRows);
  await deleteMissingRows(store.client, store.tables.moneyItems, itemRows.map((row) => row.id));
  await deleteMissingRows(store.client, store.tables.moneyGroups, groupRows.map((row) => row.id));
  await deleteMissingRows(store.client, store.tables.moneyTabs, tabRows.map((row) => row.id));
};

const saveStateSlices = async (previousState, nextState) => {
  const store = getSupabaseStateStore();
  const tasks = [];

  if (serializeMetaState(previousState) !== serializeMetaState(nextState)) {
    tasks.push(saveMetaState(store, nextState));
  }

  if (JSON.stringify(previousState.plannerEntries) !== JSON.stringify(nextState.plannerEntries)) {
    tasks.push(saveEntriesSlice(store, store.tables.planner, nextState.plannerEntries));
  }

  if (JSON.stringify(previousState.dogsEntries) !== JSON.stringify(nextState.dogsEntries)) {
    tasks.push(saveEntriesSlice(store, store.tables.dogs, nextState.dogsEntries));
  }

  if (JSON.stringify(previousState.posts) !== JSON.stringify(nextState.posts)) {
    tasks.push(savePostsSlice(store, nextState.posts));
  }

  if (JSON.stringify(previousState.customTabs) !== JSON.stringify(nextState.customTabs)) {
    tasks.push(saveMoneySlice(store, nextState.customTabs));
  }

  try {
    await Promise.all(tasks);
  } catch (error) {
    if (isMissingSupabaseTableError(error)) {
      throw new Error("Supabase schema is not ready");
    }
    throw new Error(error.message || "Supabase request failed");
  }

  return { ok: true };
};

const loginFallback = (role, password) => {
  if (LOCAL_USERS[role] === password) {
    return { role };
  }
  throw new Error("Wrong role or password");
};

const loginRemote = async (role, password) => loginFallback(role, password);

const uploadImages = async (files) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase Storage не настроен");
  }

  const uploaded = [];
  for (const file of files) {
    const prepared = await resizeImageFile(file);
    const filePath = `posts/${uid("image")}-${sanitizeFileName(prepared.name)}`;
    const { error: uploadError } = await supabase.client
      .storage
      .from(supabase.bucket)
      .upload(filePath, prepared, {
        cacheControl: "3600",
        upsert: false,
        contentType: prepared.type || "application/octet-stream",
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Не удалось загрузить изображение в Supabase");
    }

    const { data } = supabase.client
      .storage
      .from(supabase.bucket)
      .getPublicUrl(filePath);

    uploaded.push({
      type: "supabase",
      path: filePath,
      fileName: prepared.name,
      mimeType: prepared.type || "application/octet-stream",
      publicUrl: data.publicUrl,
    });
  }
  return uploaded;
};
const deleteImages = async (images) => {
  const list = Array.isArray(images) ? images : [];
  if (!list.length) {
    return;
  }

  const supabase = getSupabaseClient();
  const supabasePaths = list
    .filter((image) => image?.path)
    .map((image) => image.path);

  if (supabase && supabasePaths.length) {
    const { error } = await supabase.client
      .storage
      .from(supabase.bucket)
      .remove(supabasePaths);

    if (error) {
      throw new Error(error.message || "Не удалось удалить изображения из Supabase");
    }
  }
};
const dateMatchesEntry = (entry, date) => {
  if (!entry?.date || !date) return false;
  if (entry.repeatMonthly) {
    return entry.date.slice(8, 10) === date.slice(8, 10);
  }
  return entry.date === date;
};

const findEntryForDate = (entries, date) => {
  const exact = entries.find((entry) => entry.date === date);
  if (exact) return exact;
  return entries.find((entry) => entry.repeatMonthly && entry.date.slice(8, 10) === date.slice(8, 10)) || null;
};

const upsertEntry = (entries, nextEntry) => {
  const next = entries.filter((entry) => entry.id !== nextEntry.id);
  next.push(nextEntry);
  return next.sort((left, right) => compareDesc(left.updatedAt || left.date, right.updatedAt || right.date));
};

const sortedPosts = (posts, filters) => {
  const search = filters.search.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    if (filters.mode === "archived" && !post.archived) return false;
    if (filters.mode === "active" && post.archived) return false;
    if (!search) return true;
    const commentText = (post.comments || []).map((comment) => `${comment.author} ${comment.text}`).join(" ");
    return `${post.author} ${post.text} ${commentText}`.toLowerCase().includes(search);
  });
  const ordered = filtered.sort((left, right) => compareDesc(left.createdAt, right.createdAt));
  const pinned = ordered.filter((post) => post.pinned && !post.archived);
  const regular = ordered.filter((post) => !post.pinned);
  return filters.mode === "archived" ? regular : [...pinned, ...regular];
};

const inRange = (date, start, end) => date >= start && date <= end;

const collectEventsForDate = (state, date) => {
  const items = [];
  state.plannerEntries.forEach((entry) => {
    if (dateMatchesEntry(entry, date)) {
      items.push({
        id: `${entry.id}-${date}`,
        type: "planner",
        label: "Траты",
        text: entry.text,
        entry,
      });
    }
  });
  state.posts.filter((post) => !post.archived).forEach((post) => {
    const start = post.startDate || post.createdAt.slice(0, 10);
    const end = post.endDate || start;
    if (inRange(date, start, end)) {
      items.push({
        id: `${post.id}-${date}`,
        type: "post",
        label: "Лента",
        text: post.text || "Публикация",
        post,
      });
    }
  });
  return items;
};

const previewEventsForDate = (state, date) => collectEventsForDate(state, date)
  .slice(0, 2)
  .map((item) => ({
    id: item.id,
    type: item.type,
    label: item.text.split("\n")[0].trim() || item.label,
  }));

const monthMatrix = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days = [];
  const shift = (first.getDay() + 6) % 7;
  for (let index = 0; index < shift; index += 1) days.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(year, month - 1, day, 12, 0, 0).toISOString().slice(0, 10));
  }
  while (days.length % 7) days.push(null);
  return days;
};

function App() {
  const [state, setState] = useState(() => normalizeState({
    ...clone(DEFAULT_STATE),
    settings: {
      ...clone(DEFAULT_STATE).settings,
      theme: getStoredTheme(),
    },
    view: routeToView(window.location.hash),
  }));
  const [session, setSession] = useState(() => getStoredSession());
  const [loading, setLoading] = useState(true);
  const [loadedSlices, setLoadedSlices] = useState({});
  const [sliceLoading, setSliceLoading] = useState(false);
  const [viewRefreshToken, setViewRefreshToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authSaving, setAuthSaving] = useState(false);
  const loadedSlicesRef = useRef({});

  useEffect(() => {
    document.title = "My Family Planner";
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme || "light";
  }, [state.settings.theme]);

  useEffect(() => {
    loadedSlicesRef.current = loadedSlices;
  }, [loadedSlices]);

  useEffect(() => {
    const currentView = routeToView(window.location.hash);
    setStoredView(currentView);
    window.history.replaceState(null, "", toHash(currentView));

    const onHashChange = () => {
      setState((current) => {
        const nextView = validateView(routeToView(window.location.hash), current.customTabs);
        setStoredView(nextView);
        return { ...current, view: nextView };
      });
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let alive = true;
    const initialView = routeToView(window.location.hash);
    const initialSlices = [...new Set(getRequiredSlicesForView(initialView))];

    ensureSupabaseStateReady()
      .then(() => fetchStateSlices(initialSlices))
      .then((patch) => {
        if (!alive) return;
        const merged = mergeStatePatch(normalizeState({
          ...clone(DEFAULT_STATE),
          settings: {
            ...clone(DEFAULT_STATE).settings,
            theme: getStoredTheme(),
          },
          view: initialView,
        }), patch);
        const view = validateView(routeToView(window.location.hash), merged.customTabs);
        setStoredView(view);
        window.history.replaceState(null, "", toHash(view));
        setLoadedSlices(Object.fromEntries(initialSlices.map((slice) => [slice, true])));
        setState({
          ...merged,
          view,
          settings: {
            ...merged.settings,
            theme: getStoredTheme(),
          },
        });
      })
      .catch((error) => {
        if (!alive) return;
        setToast({ tone: "danger", text: error.message });
        setState((current) => ({
          ...current,
          settings: {
            ...current.settings,
            theme: getStoredTheme(),
          },
        }));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return undefined;
    const requiredSlices = getRequiredSlicesForView(state.view);
    const missingSlices = requiredSlices.filter((slice) => !loadedSlicesRef.current[slice]);
    if (!missingSlices.length && viewRefreshToken === 0) return undefined;
    const slicesToFetch = missingSlices.length ? missingSlices : requiredSlices;
    if (!slicesToFetch.length) return undefined;

    let alive = true;
    setSliceLoading(true);

    fetchStateSlices(slicesToFetch)
      .then((patch) => {
        if (!alive) return;
        setState((current) => mergeStatePatch(current, {
          ...patch,
          view: current.view,
        }));
        setLoadedSlices((current) => ({
          ...current,
          ...Object.fromEntries(slicesToFetch.map((slice) => [slice, true])),
        }));
      })
      .catch((error) => {
        if (!alive) return;
        setToast({ tone: "danger", text: error.message });
      })
      .finally(() => {
        if (alive) {
          setSliceLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [loading, state.view, viewRefreshToken]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!themeMenuOpen) return undefined;
    const handleOutside = (event) => {
      if (!event.target.closest(".theme-menu")) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [themeMenuOpen]);

  const applyLocal = (updater) => {
    setState((current) => normalizeState(typeof updater === "function" ? updater(current) : updater));
  };

  const setView = (view) => {
    const nextView = validateView(view, state.customTabs);
    setStoredView(nextView);
    window.history.replaceState(null, "", toHash(nextView));
    setViewRefreshToken((current) => current + 1);
    setSettingsOpen(false);
    setState((current) => ({ ...current, view: nextView }));
  };

  const selectMoneyTab = (tabId) => {
    setStoredView("money");
    window.history.replaceState(null, "", toHash("money"));
    setViewRefreshToken((current) => current + 1);
    setSettingsOpen(false);
    setState((current) => normalizeState({ ...current, view: "money", moneyActiveTabId: tabId }));
  };

  const changeTheme = (theme) => {
    setStoredTheme(theme);
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        theme,
      },
    }));
    setThemeMenuOpen(false);
  };

  const persist = async (nextState, message = "Изменения сохранены") => {
    if (saving) return false;
    setSaving(true);
    try {
      const normalized = normalizeState({
        ...nextState,
        settings: {
          ...nextState.settings,
          theme: getStoredTheme(),
          lastSyncedAt: nowISO(),
          lastUpdatedBy: session?.role || nextState.settings?.lastUpdatedBy || "",
        },
      });

      const payloadToSave = {
        ...normalized,
        settings: {
          ...normalized.settings,
          theme: "light",
        },
      };

      await saveStateSlices(state, payloadToSave);
      setState(normalized);
      setToast({ tone: "success", text: message });
      return true;
    } catch (error) {
      setToast({ tone: "danger", text: error.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async ({ role, password }) => {
    setAuthSaving(true);
    try {
      const payload = await loginRemote(role, password);
      const nextSession = {
        role: payload.role || role,
        loggedInAt: nowISO(),
      };
      setStoredSession(nextSession);
      setSession(nextSession);
      setToast({ tone: "success", text: `Вход выполнен: ${nextSession.role}` });
      return true;
    } catch (error) {
      setToast({ tone: "danger", text: error.message });
      return false;
    } finally {
      setAuthSaving(false);
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    setThemeMenuOpen(false);
    setSettingsOpen(false);
  };

  const handleCreatePost = async (draft) => {
    if (saving) return false;
    setSaving(true);
    try {
      const images = draft.files.length ? await uploadImages(draft.files) : [];
      const timestamp = nowISO();
      const nextPost = normalizePost({
        id: uid("post"),
        author: session.role,
        text: draft.text.trim(),
        images,
        pinned: draft.pinned,
        archived: false,
        createdAt: timestamp,
        createdBy: session.role,
        updatedAt: timestamp,
        updatedBy: session.role,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });
      const nextState = normalizeState({
        ...state,
        posts: [nextPost, ...state.posts],
      });
      await saveStateSlices(state, {
        ...nextState,
        settings: {
          ...nextState.settings,
          theme: "light",
          lastSyncedAt: timestamp,
          lastUpdatedBy: session.role,
        },
      });
      setState({
        ...nextState,
        settings: {
          ...nextState.settings,
          theme: getStoredTheme(),
          lastSyncedAt: timestamp,
          lastUpdatedBy: session.role,
        },
      });
      setToast({ tone: "success", text: "Пост опубликован" });
      return true;
    } catch (error) {
      setToast({ tone: "danger", text: error.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (saving) return false;
    const post = state.posts.find((item) => item.id === postId);
    if (!post) return false;

    setSaving(true);
    try {
      await deleteImages(post.images || []);
      const timestamp = nowISO();
      const nextState = normalizeState({
        ...state,
        posts: state.posts.filter((item) => item.id !== postId),
        settings: {
          ...state.settings,
          theme: getStoredTheme(),
          lastSyncedAt: timestamp,
          lastUpdatedBy: session?.role || state.settings?.lastUpdatedBy || "",
        },
      });
      const payloadToSave = {
        ...nextState,
        settings: {
          ...nextState.settings,
          theme: "light",
        },
      };

      await saveStateSlices(state, payloadToSave);
      setState(nextState);
      setToast({ tone: "success", text: "Пост удален" });
      return true;
    } catch (error) {
      setToast({ tone: "danger", text: error.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleEditPost = async (postId, draft) => {
    if (saving) return false;
    const post = state.posts.find((item) => item.id === postId);
    if (!post) return false;

    setSaving(true);
    try {
      const keptImages = Array.isArray(draft.existingImages) ? draft.existingImages : [];
      const removedImages = (post.images || []).filter((image) => !keptImages.some((entry) => sameImageRef(entry, image)));
      const uploadedImages = draft.files?.length ? await uploadImages(draft.files) : [];
      if (removedImages.length) {
        await deleteImages(removedImages);
      }

      const timestamp = nowISO();
      const nextPost = normalizePost({
        ...post,
        text: draft.text.trim(),
        images: [...keptImages, ...uploadedImages],
        pinned: draft.pinned,
        updatedAt: timestamp,
        updatedBy: session.role,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });

      const nextState = normalizeState({
        ...state,
        posts: state.posts.map((item) => (item.id === postId ? nextPost : item)),
        settings: {
          ...state.settings,
          theme: getStoredTheme(),
          lastSyncedAt: timestamp,
          lastUpdatedBy: session.role,
        },
      });

      await saveStateSlices(state, nextState);
      setState(nextState);
      setToast({ tone: "success", text: "Пост обновлен" });
      return true;
    } catch (error) {
      setToast({ tone: "danger", text: error.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createMoneyTab = async (title) => {
    if (!session) return;
    const timestamp = nowISO();
    const nextTab = normalizeMoneyTab({
      id: uid("money"),
      title: title?.trim() || (state.customTabs.length ? `План ${state.customTabs.length + 1}` : "План"),
      groups: [getDefaultMoneyGroup(session.role)],
      createdAt: timestamp,
      createdBy: session.role,
      updatedAt: timestamp,
      updatedBy: session.role,
    });
    const saved = await persist({
      ...state,
      view: "money",
      moneyActiveTabId: nextTab.id,
      customTabs: [...state.customTabs, nextTab],
    }, "Вкладка создана");
    if (saved) {
      setView("money");
    }
  };

  const saveMoneyTab = async (tabId, nextTab) => {
    const saved = await persist({
      ...state,
      moneyActiveTabId: tabId,
      customTabs: state.customTabs.map((tab) => (tab.id === tabId ? nextTab : tab)),
    }, "План сохранен");
    return saved;
  };

  const deleteMoneyTab = async (tabId) => {
    const rest = state.customTabs.filter((tab) => tab.id !== tabId);
    const saved = await persist({
      ...state,
      view: "money",
      moneyActiveTabId: rest[0]?.id || "",
      customTabs: rest,
    }, "Вкладка удалена");
    if (saved) {
      setView("money");
    }
  };

  const activeMoneyTab = state.customTabs.find((tab) => tab.id === state.moneyActiveTabId) || state.customTabs[0] || null;
  const currentViewReady = getRequiredSlicesForView(state.view).every((slice) => loadedSlices[slice]);
  const pageLoading = loading || sliceLoading || !currentViewReady;

  let page = html`<${LoadingPage} />`;
  if (!pageLoading && !session) {
    page = html`<${LoginPage} saving=${authSaving} onSubmit=${handleLogin} />`;
  } else if (!pageLoading && state.view === "planner") {
    page = html`
      <${NotePage}
        kind="planner"
        title="Траты"
        state=${state}
        onSave=${persist}
        onLocalChange=${applyLocal}
        saving=${saving}
        actor=${session?.role || ""}
      />
    `;
  } else if (!pageLoading && state.view === "plans") {
    page = html`
      <${FeedPage}
        state=${state}
        onSave=${persist}
        onLocalChange=${applyLocal}
        onCreatePost=${handleCreatePost}
        onEditPost=${handleEditPost}
        onDeletePost=${handleDeletePost}
        saving=${saving}
        actor=${session?.role || ""}
      />
    `;
  } else if (!pageLoading && state.view === "calendar") {
    page = html`
      <${CalendarPage}
        state=${state}
        onLocalChange=${applyLocal}
      />
    `;
  } else if (!pageLoading && state.view === "money") {
    page = html`
      <${MoneyTabPage}
        tabs=${state.customTabs}
        tab=${activeMoneyTab}
        activeTabId=${state.moneyActiveTabId}
        saving=${saving}
        actor=${session?.role || ""}
        onSave=${saveMoneyTab}
        onDelete=${deleteMoneyTab}
        onAddTab=${createMoneyTab}
        onSelectTab=${selectMoneyTab}
      />
    `;
  } else if (!pageLoading) {
    page = html`
      <main className="page">
        <section className="panel empty-money">
          <h2>Планов пока нет</h2>
          <p>Создайте первую вкладку и собирайте там дела, суммы и подзадачи.</p>
          <button type="button" className="button button--blue" onClick=${() => createMoneyTab("Новый план")} disabled=${saving}>Добавить вкладку</button>
        </section>
      </main>
    `;
  }

  if (!session) {
    return html`
      <div className="app-shell app-shell--auth">
        ${page}
        ${toast && html`<div className=${`toast toast--${toast.tone}`}>${toast.text}</div>`}
      </div>
    `;
  }

  return html`
    <div className="app-shell">
      <header className="topbar">
        <nav className="nav-tabs" aria-label="Навигация">
          ${FIXED_NAV_ITEMS.map((item) => html`
            <button
              key=${item.id}
              type="button"
              className=${`nav-tab${state.view === item.id ? " is-active" : ""}`}
              onClick=${() => setView(item.id)}
              disabled=${saving}
            >${item.label}</button>
          `)}
        </nav>

        <div className="topbar-actions">
          <div className="session-chip">
            <strong>${session.role}</strong>
            <span>${state.settings.lastUpdatedBy ? `Последнее обновление: ${state.settings.lastUpdatedBy}` : "Рабочая сессия"}</span>
          </div>

          <div className="theme-menu">
            <button type="button" className="icon-button" onClick=${() => setThemeMenuOpen((value) => !value)} disabled=${saving}>
              <${AppIcon} name="palette" size=${18} />
            </button>
            ${themeMenuOpen && html`
              <div className="theme-menu__list">
                ${THEMES.map((theme) => html`
                  <button
                    key=${theme.id}
                    type="button"
                    className=${`theme-option${state.settings.theme === theme.id ? " is-active" : ""}`}
                    onClick=${() => changeTheme(theme.id)}
                  >${theme.label}</button>
                `)}
              </div>
            `}
          </div>

          <button type="button" className="button button--ghost topbar-logout" onClick=${handleLogout} disabled=${saving}>
            <span className="topbar-logout__text">Выйти</span>
            <span className="topbar-logout__icon"><${AppIcon} name="logout" size=${18} /></span>
          </button>
        </div>
      </header>

      ${page}
      <nav className="bottom-nav" aria-label="Основная навигация">
        ${FIXED_NAV_ITEMS.map((item) => html`
          <button
            key=${item.id}
            type="button"
            className=${`bottom-nav__item${state.view === item.id ? " is-active" : ""}`}
            onClick=${() => setView(item.id)}
            disabled=${saving}
          >
            <span className="bottom-nav__icon"><${AppIcon} name=${item.icon} active=${state.view === item.id} size=${24} /></span>
            <span className="bottom-nav__label">${item.label}</span>
          </button>
        `)}
        <button
          type="button"
          className=${`bottom-nav__item${settingsOpen ? " is-active" : ""}`}
          onClick=${() => setSettingsOpen((value) => !value)}
          disabled=${saving}
        >
          <span className="bottom-nav__icon"><${AppIcon} name="settings" active=${settingsOpen} size=${24} /></span>
          <span className="bottom-nav__label">Настройки</span>
        </button>
      </nav>

      ${settingsOpen ? html`
        <div className="settings-drawer-backdrop" onClick=${() => setSettingsOpen(false)}>
          <aside className="settings-drawer" onClick=${(event) => event.stopPropagation()}>
            <div className="settings-drawer__head">
              <strong>Настройки</strong>
            </div>

            <section className="settings-drawer__section">
              <div className="settings-drawer__label">Данные аккаунта</div>
              <div className="settings-account-card">
                <strong>${session.role}</strong>
                <span>${state.settings.lastUpdatedBy ? `Последнее обновление: ${state.settings.lastUpdatedBy}` : "Данных об обновлениях пока нет"}</span>
              </div>
            </section>

            <section className="settings-drawer__section">
              <div className="settings-drawer__label">Тема</div>
              <div className="settings-theme-list">
                ${THEMES.map((theme) => html`
                  <button
                    key=${theme.id}
                    type="button"
                    className=${`theme-option settings-theme-option${state.settings.theme === theme.id ? " is-active" : ""}`}
                    onClick=${() => changeTheme(theme.id)}
                    disabled=${saving}
                  >${theme.label}</button>
                `)}
              </div>
            </section>

            <div className="settings-drawer__footer">
              <button type="button" className="button button--ghost settings-logout" onClick=${handleLogout} disabled=${saving}>
                <span className="settings-logout__icon"><${AppIcon} name="logout" size=${18} /></span>
                <span>Выход</span>
              </button>
            </div>
          </aside>
        </div>
      ` : null}
      ${toast && html`<div className=${`toast toast--${toast.tone}`}>${toast.text}</div>`}
    </div>
  `;
}

function LoginPage({ saving, onSubmit }) {
  const [role, setRole] = useState("Lesha");
  const [password, setPassword] = useState("");

  return html`
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <h1>Вход</h1>
          <p>Роли привязаны к минимальной авторизации. Все изменения дальше будут подписываться выбранным пользователем.</p>
        </div>

        <label className="field">
          <span>Роль</span>
          <select value=${role} onChange=${(event) => setRole(event.target.value)} disabled=${saving}>
            <option value="Lesha">Lesha</option>
            <option value="Lera">Lera</option>
          </select>
        </label>

        <label className="field">
          <span>Пароль</span>
          <input
            type="password"
            value=${password}
            onInput=${(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            disabled=${saving}
          />
        </label>

        <button
          type="button"
          className="button button--blue auth-button"
          onClick=${() => onSubmit({ role, password })}
          disabled=${saving || !password}
        >
          ${saving ? html`<${ButtonSpinner} />` : null}
          <span>${saving ? "Входим..." : "Войти"}</span>
        </button>
      </section>
    </main>
  `;
}

function LoadingPage() {
  return html`
    <main className="page">
      <section className="panel skeleton-panel">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-line"></div>
        <div className="skeleton skeleton-line short"></div>
      </section>
      <section className="panel skeleton-grid">
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
      </section>
    </main>
  `;
}

function ButtonSpinner() {
  return html`<span className="button-spinner" aria-hidden="true"></span>`;
}

function NotePage({ kind, title, state, onSave, onLocalChange, saving, actor }) {
  const dateKey = kind === "planner" ? "plannerSelectedDate" : "dogsSelectedDate";
  const listKey = kind === "planner" ? "plannerEntries" : "dogsEntries";
  const selectedDate = state[dateKey] || todayISO();
  const entries = state[listKey];
  const activeEntry = useMemo(() => findEntryForDate(entries, selectedDate), [entries, selectedDate]);
  const [editing, setEditing] = useState(!activeEntry);
  const [draft, setDraft] = useState({ text: "", repeatMonthly: false });

  useEffect(() => {
    setEditing(!activeEntry);
    setDraft({
      text: activeEntry?.text || "",
      repeatMonthly: Boolean(activeEntry?.repeatMonthly),
    });
  }, [activeEntry?.id, activeEntry?.updatedAt, selectedDate]);

  const saveEntry = async () => {
    const timestamp = nowISO();
    const nextEntry = normalizeEntry({
      id: activeEntry?.id || uid(kind),
      date: activeEntry?.repeatMonthly ? activeEntry.date : selectedDate,
      text: draft.text.trim(),
      repeatMonthly: draft.repeatMonthly,
      createdAt: activeEntry?.createdAt || timestamp,
      createdBy: activeEntry?.createdBy || actor,
      updatedAt: timestamp,
      updatedBy: actor,
    }, kind);

    const saved = await onSave({
      ...state,
      [dateKey]: selectedDate,
      [listKey]: upsertEntry(entries, nextEntry),
    }, "Запись сохранена");

    if (saved) setEditing(false);
  };

  const entryMeta = actorStamp(activeEntry?.updatedBy || activeEntry?.createdBy, activeEntry?.updatedAt || activeEntry?.createdAt);

  return html`
    <main className="page">
      <section className="panel note-panel">
        <div className="page-head">
          <div>
            <h2>${title}</h2>
            <p>${activeEntry ? (activeEntry.repeatMonthly ? "Повторяется каждый месяц" : formatDate(selectedDate)) : `Новая запись на ${formatDate(selectedDate)}`}</p>
          </div>

          <div className="note-toolbar">
            <label className="date-field">
              <span>Дата</span>
              <input
                type="date"
                value=${selectedDate}
                onInput=${(event) => onLocalChange({ ...state, [dateKey]: event.target.value || todayISO() })}
                disabled=${saving}
              />
            </label>

            ${!editing && html`
              <button type="button" className="button button--blue button--equal" onClick=${() => setEditing(true)} disabled=${saving}>Редактировать</button>
            `}

            ${editing && html`
              <button type="button" className="button button--red button--equal" onClick=${saveEntry} disabled=${saving || !draft.text.trim()}>
                ${saving ? html`<${ButtonSpinner} />` : null}
                <span>${saving ? "Сохранение..." : "Сохранить"}</span>
              </button>
            `}
          </div>
        </div>

        <div className="editor-card">
          ${editing ? html`
            <div className="editor-stack">
              <textarea
                className="editor-textarea"
                value=${draft.text}
                onInput=${(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
                placeholder="Запишите траты, расходы, напоминания или договоренности"
                disabled=${saving}
              ></textarea>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked=${draft.repeatMonthly}
                  onChange=${(event) => setDraft((current) => ({ ...current, repeatMonthly: event.target.checked }))}
                  disabled=${saving}
                />
                <span>Повторять ежемесячно</span>
              </label>
            </div>
          ` : html`
            <div className="note-view">
              <div className="note-date-pill">${activeEntry?.repeatMonthly ? "Каждый месяц" : formatDate(selectedDate)}</div>
              <div className="note-text">${activeEntry?.text || "На эту дату пока нет записи."}</div>
              ${entryMeta ? html`<div className="meta-line">Обновил: ${entryMeta}</div>` : null}
            </div>
          `}
        </div>
      </section>
    </main>
  `;
}

function FeedPage({ state, onSave, onLocalChange, onCreatePost, onEditPost, onDeletePost, saving, actor }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState("");
  const [menuOpenId, setMenuOpenId] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [commentsPostId, setCommentsPostId] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTargets, setReplyTargets] = useState({});
  const [commentMenuKey, setCommentMenuKey] = useState("");
  const [editingCommentKey, setEditingCommentKey] = useState("");
  const [editingCommentText, setEditingCommentText] = useState("");
  const posts = useMemo(() => sortedPosts([...state.posts], state.feedFilters), [state.posts, state.feedFilters]);
  const isArchived = state.feedFilters.mode === "archived";
  const commentsPost = posts.find((post) => post.id === commentsPostId) || null;
  const editingPost = state.posts.find((post) => post.id === editingPostId) || null;

  const persistPostComments = (postId, updater, message) => {
    const timestamp = nowISO();
    onSave({
      ...state,
      posts: state.posts.map((post) => (post.id === postId ? normalizePost({
        ...post,
        comments: updater(post.comments || [], timestamp),
        updatedAt: timestamp,
        updatedBy: actor || post.updatedBy || post.author,
      }) : post)),
    }, message);
  };

  const addComment = (postId) => {
    const text = String(commentDrafts[postId] || "").trim();
    if (!text || saving) return;
    const replyTarget = replyTargets[postId] || null;
    persistPostComments(postId, (comments, timestamp) => ([
      ...comments,
      normalizeComment({
        id: uid("comment"),
        author: actor || "Lesha",
        text,
        parentId: replyTarget?.id || "",
        createdAt: timestamp,
        createdBy: actor || "Lesha",
        updatedAt: timestamp,
        updatedBy: actor || "Lesha",
      }),
    ]), "Комментарий добавлен");
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setReplyTargets((current) => ({ ...current, [postId]: null }));
  };

  const startEditComment = (postId, comment) => {
    if ((comment.createdBy || comment.author || "") !== (actor || "")) return;
    setCommentMenuKey("");
    setEditingCommentKey(`${postId}:${comment.id}`);
    setEditingCommentText(comment.text || "");
  };

  const saveEditedComment = (postId, commentId) => {
    const text = String(editingCommentText || "").trim();
    if (!text || saving) return;
    persistPostComments(postId, (comments, timestamp) => comments.map((comment) => (
      comment.id === commentId
        ? normalizeComment({
          ...comment,
          text,
          updatedAt: timestamp,
          updatedBy: actor || comment.updatedBy || comment.author,
        })
        : comment
    )), "Комментарий обновлен");
    setEditingCommentKey("");
    setEditingCommentText("");
  };

  const removeComment = (postId, commentId) => {
    setCommentMenuKey("");
    if (editingCommentKey === `${postId}:${commentId}`) {
      setEditingCommentKey("");
      setEditingCommentText("");
    }
    persistPostComments(postId, (comments) => {
      const idsToRemove = new Set([commentId]);
      let changed = true;
      while (changed) {
        changed = false;
        comments.forEach((comment) => {
          if (comment.parentId && idsToRemove.has(comment.parentId) && !idsToRemove.has(comment.id)) {
            idsToRemove.add(comment.id);
            changed = true;
          }
        });
      }
      return comments.filter((comment) => !idsToRemove.has(comment.id));
    }, "Комментарий удален");
  };

  const startReply = (postId, comment) => {
    setReplyTargets((current) => ({
      ...current,
      [postId]: {
        id: comment.id,
        author: comment.author || "Пользователь",
      },
    }));
  };

  const closeComments = () => {
    setCommentsPostId("");
    setCommentMenuKey("");
    setEditingCommentKey("");
    setEditingCommentText("");
  };

  useEffect(() => {
    if (!menuOpenId) return undefined;
    const handleOutside = (event) => {
      if (!event.target.closest(".post-menu-wrap")) {
        setMenuOpenId("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpenId]);

  useEffect(() => {
    if (!commentMenuKey) return undefined;
    const handleOutside = (event) => {
      if (!event.target.closest(".comment-menu-wrap")) {
        setCommentMenuKey("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [commentMenuKey]);

  useEffect(() => {
    if (!commentsPostId) return;
    if (!state.posts.some((post) => post.id === commentsPostId)) {
      closeComments();
    }
  }, [commentsPostId, state.posts]);

  useEffect(() => {
    if (!editingPostId) return;
    if (!state.posts.some((post) => post.id === editingPostId)) {
      setEditingPostId("");
      setModalOpen(false);
    }
  }, [editingPostId, state.posts]);

  const updatePost = (postId, patch, message) => {
    const timestamp = nowISO();
    const nextState = {
      ...state,
      posts: state.posts.map((post) => (post.id === postId ? {
        ...post,
        ...patch,
        updatedAt: timestamp,
        updatedBy: patch.updatedBy || actor || post.updatedBy || post.author,
      } : post)),
    };
    setMenuOpenId("");
    onSave(nextState, message);
  };

  const deletePost = async (postId) => {
    setMenuOpenId("");
    if (commentsPostId === postId) {
      closeComments();
    }
    await onDeletePost(postId);
  };

  const startEditPost = (postId) => {
    setMenuOpenId("");
    setEditingPostId(postId);
    setModalOpen(true);
  };

  const closePostModal = () => {
    setModalOpen(false);
    setEditingPostId("");
  };

  const renderCommentThread = (postId, comments, parentId = "", depth = 0) => comments
    .filter((comment) => (comment.parentId || "") === parentId)
    .map((comment) => {
      const key = `${postId}:${comment.id}`;
      const ownComment = (comment.createdBy || comment.author || "") === (actor || "");
      const isEditing = editingCommentKey === key;
      const children = renderCommentThread(postId, comments, comment.id, depth + 1);

      return html`
        <article key=${comment.id} className=${`sheet-comment${depth ? " is-child" : ""}`}>
          <div className="sheet-comment__row">
            <div className=${`comment-avatar${ownComment ? " is-self" : ""}`}>${initials(comment.author)}</div>
            <div className="sheet-comment__main">
              <div className="sheet-comment__head">
                <div className="sheet-comment__author-block">
                  <strong className="sheet-comment__author">${comment.author}</strong>
                  <span className="sheet-comment__time">${formatFeedTimeMsk(comment.createdAt || comment.updatedAt)}</span>
                </div>
                ${ownComment ? html`
                  <div className="comment-menu-wrap">
                    <button
                      type="button"
                      className="menu-button comment-menu-button"
                      onClick=${() => setCommentMenuKey((value) => value === key ? "" : key)}
                      disabled=${saving}
                    >⋯</button>
                    ${commentMenuKey === key ? html`
                      <div className="post-menu comment-menu">
                        <button
                          type="button"
                          className="post-menu__item"
                          onClick=${() => startEditComment(postId, comment)}
                        >
                          <span className="post-menu__icon">✎</span>
                          <span className="post-menu__label">Редактировать</span>
                        </button>
                        <button
                          type="button"
                          className="post-menu__item is-danger"
                          onClick=${() => removeComment(postId, comment.id)}
                        >
                          <span className="post-menu__icon">⌫</span>
                          <span className="post-menu__label">Удалить</span>
                        </button>
                      </div>
                    ` : null}
                  </div>
                ` : null}
              </div>

              ${isEditing ? html`
                <div className="comment-edit">
                  <input
                    type="text"
                    value=${editingCommentText}
                    onInput=${(event) => setEditingCommentText(event.target.value)}
                    disabled=${saving}
                  />
                  <div className="comment-edit__actions">
                    <button
                      type="button"
                      className="button button--blue button--small"
                      onClick=${() => saveEditedComment(postId, comment.id)}
                      disabled=${saving || !String(editingCommentText || "").trim()}
                    >Сохранить</button>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick=${() => {
                        setEditingCommentKey("");
                        setEditingCommentText("");
                      }}
                      disabled=${saving}
                    >Отмена</button>
                  </div>
                </div>
              ` : html`
                <div className="sheet-comment__text">${comment.text}</div>
                <div className="sheet-comment__actions">
                  <button
                    type="button"
                    className="sheet-comment__action"
                    onClick=${() => startReply(postId, comment)}
                    disabled=${saving}
                  >Ответить</button>
                </div>
              `}

              ${children.length ? html`<div className="sheet-comment__children">${children}</div>` : null}
            </div>
          </div>
        </article>
      `;
    });

  return html`
    <main className="page page--wide feed-mobile-page">
      <section className="panel composer-bar feed-mobile-composer">
        <button
          type="button"
          className="create-post create-post--wide"
          onClick=${() => {
            setEditingPostId("");
            setModalOpen(true);
          }}
          disabled=${saving}
        >
          <span className="create-post__plus">+</span>
          <span>Создать пост</span>
        </button>

        <div className="composer-actions">
          <label className="search-shell">
            <span className="search-shell__icon">⌕</span>
            <input
              type="search"
              value=${state.feedFilters.search}
              onInput=${(event) => onLocalChange({ ...state, feedFilters: { ...state.feedFilters, search: event.target.value } })}
              placeholder="Поиск"
              disabled=${saving}
            />
          </label>
        </div>
      </section>

      <section className="panel feed-board feed-mobile-board">
        <div className="feed-board__head">
          <div className="feed-switches">
            <button
              type="button"
              className=${`feed-switch${!isArchived ? " is-active" : ""}`}
              onClick=${() => onLocalChange({ ...state, feedFilters: { ...state.feedFilters, mode: "active" } })}
              disabled=${saving}
            >Лента</button>
            <button
              type="button"
              className=${`feed-switch${isArchived ? " is-active" : ""}`}
              onClick=${() => onLocalChange({ ...state, feedFilters: { ...state.feedFilters, mode: "archived" } })}
              disabled=${saving}
            >Архив</button>
          </div>
          ${isArchived ? html`<div className="feed-board__meta">Архивные публикации</div>` : null}
        </div>

        <div className="feed-stack feed-stack--board">
          ${posts.length ? posts.map((post, index) => {
            const postActor = post.updatedBy || post.author || "Lesha";
            const authorTheme = getAuthorTheme(postActor);
            return html`
            <article key=${post.id} className=${`post-card post-card--flat post-card--mobile${post.pinned ? " is-pinned" : ""}${post.archived ? " is-archived" : ""}`}>
              <div className="post-head post-head--mobile">
                <div className="post-author-block">
                  <div className="post-avatar" style=${{ background: authorTheme.bg, color: authorTheme.tint }}>
                    ${initials(postActor)}
                  </div>
                  <div className="post-head__time">
                    <div className="post-author-mobile">${postActor}</div>
                    <div className="post-time-mobile">${formatFeedTimeMsk(post.createdAt || post.updatedAt)}</div>
                    ${(post.pinned || post.archived) ? html`
                      <div className="post-status-line">
                        ${post.pinned ? html`<span className="post-status-pill">Закреплено</span>` : null}
                        ${post.archived ? html`<span className="post-status-pill is-archived">Архив</span>` : null}
                      </div>
                    ` : null}
                  </div>
                </div>

                <div className="post-menu-wrap">
                  <button type="button" className="menu-button" onClick=${() => setMenuOpenId((value) => value === post.id ? "" : post.id)} disabled=${saving}>⋯</button>
                  ${menuOpenId === post.id && html`
                    <div className="post-menu">
                      <button
                        type="button"
                        className="post-menu__item"
                        onClick=${() => startEditPost(post.id)}
                      >
                        <span className="post-menu__icon">✎</span>
                        <span className="post-menu__label">Редактировать</span>
                      </button>
                      <button
                        type="button"
                        className="post-menu__item"
                        onClick=${() => updatePost(post.id, { pinned: !post.pinned }, post.pinned ? "Пост откреплен" : "Пост закреплен")}
                      >
                        <span className="post-menu__icon">📌</span>
                        <span className="post-menu__label">${post.pinned ? "Открепить" : "Закрепить"}</span>
                      </button>
                      <button
                        type="button"
                        className="post-menu__item"
                        onClick=${() => updatePost(post.id, { archived: !post.archived, pinned: post.archived ? post.pinned : false }, post.archived ? "Пост возвращен" : "Пост отправлен в архив")}
                      >
                        <span className="post-menu__icon">🗂</span>
                        <span className="post-menu__label">${post.archived ? "Вернуть" : "В архив"}</span>
                      </button>
                      <button type="button" className="post-menu__item is-danger" onClick=${() => deletePost(post.id)}>
                        <span className="post-menu__icon">⌫</span>
                        <span className="post-menu__label">Удалить</span>
                      </button>
                    </div>
                  `}
                </div>
              </div>

              ${post.text ? html`<div className="post-text post-text--mobile">${post.text}</div>` : null}

              ${post.images?.length ? html`
                <div className=${`post-gallery gallery-${Math.min(post.images.length, 6)}`}>
                  ${post.images.map((image) => html`
                    <button key=${image.path || image.publicUrl} type="button" className="gallery-item" onClick=${() => setLightbox(imageSrc(image))}>
                      <img src=${imageSrc(image)} alt="Изображение публикации" />
                    </button>
                  `)}
                </div>
              ` : null}

              <div className="mobile-post-actions">
                <button
                  type="button"
                  className="mobile-post-action"
                  onClick=${() => {
                    setCommentsPostId(post.id);
                    setCommentMenuKey("");
                  }}
                  disabled=${saving}
                >
                  <span className="mobile-post-action__icon"><${AppIcon} name="comment" size=${18} /></span>
                  <span>${post.comments?.length || 0}</span>
                </button>
              </div>

              ${index < posts.length - 1 ? html`<div className="post-divider"></div>` : null}
            </article>
          `;
          }) : html`
            <section className="empty-state">
              <h3>${isArchived ? "Архив пока пуст" : "Лента пока пустая"}</h3>
              <p>${isArchived ? "Сюда попадут публикации после переноса в архив." : "Первый пост можно добавить через кнопку наверху."}</p>
            </section>
          `}
        </div>
      </section>

      ${commentsPost && html`
        <div className="comments-sheet-backdrop" onClick=${closeComments}>
          <section className="comments-sheet" onClick=${(event) => event.stopPropagation()}>
            <div className="comments-sheet__head">
              <div>
                <h3>Комментарии</h3>
                <p>${commentsPost.comments?.length || 0}</p>
              </div>
              <button type="button" className="modal-close" onClick=${closeComments}>×</button>
            </div>

            <div className="comments-sheet__body">
              ${commentsPost.text ? html`<div className="comments-sheet__post-preview">${commentsPost.text}</div>` : null}

              <div className="comments-sheet__list">
                ${(commentsPost.comments?.length || 0)
                  ? renderCommentThread(commentsPost.id, commentsPost.comments || [])
                  : html`
                    <div className="comments-sheet__empty">
                      <strong>Комментариев пока нет</strong>
                      <span>Начните обсуждение первыми.</span>
                    </div>
                  `}
              </div>
            </div>

            <div className="comments-sheet__composer">
              ${replyTargets[commentsPost.id] ? html`
                <div className="comments-sheet__replying">
                  <span>Ответ для ${replyTargets[commentsPost.id].author}</span>
                  <button
                    type="button"
                    className="sheet-comment__action"
                    onClick=${() => setReplyTargets((current) => ({ ...current, [commentsPost.id]: null }))}
                    disabled=${saving}
                  >Скрыть</button>
                </div>
              ` : null}

              <div className="comments-sheet__composer-row">
                <button type="button" className="sheet-compose__icon" aria-label="Приложить фото">📎</button>
                <div className="sheet-compose__field">
                  <input
                    type="text"
                    value=${commentDrafts[commentsPost.id] || ""}
                    onInput=${(event) => setCommentDrafts((current) => ({ ...current, [commentsPost.id]: event.target.value }))}
                    onKeyDown=${(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addComment(commentsPost.id);
                      }
                    }}
                    placeholder=${replyTargets[commentsPost.id] ? "Ответить..." : "Комментарий"}
                    disabled=${saving}
                  />
                </div>
                <button type="button" className="sheet-compose__icon" aria-label="Стикеры">☺</button>
                <button
                  type="button"
                  className="sheet-compose__send"
                  onClick=${() => addComment(commentsPost.id)}
                  disabled=${saving || !String(commentDrafts[commentsPost.id] || "").trim()}
                >➤</button>
              </div>
            </div>
          </section>
        </div>
      `}

      ${modalOpen && html`
        <${PostModal}
          saving=${saving}
          initialPost=${editingPost}
          onClose=${closePostModal}
          onSubmit=${async (draft) => {
            const saved = editingPost
              ? await onEditPost(editingPost.id, draft)
              : await onCreatePost(draft);
            if (saved) closePostModal();
          }}
        />
      `}

      ${lightbox && html`
        <div className="lightbox" onClick=${() => setLightbox(null)}>
          <div className="lightbox__frame" onClick=${(event) => event.stopPropagation()}>
            <button type="button" className="modal-close lightbox__close" onClick=${() => setLightbox(null)}>×</button>
            <img src=${lightbox} alt="Просмотр изображения" />
          </div>
        </div>
      `}
    </main>
  `;
}

function PostModal({ saving, onClose, onSubmit, initialPost = null }) {
  const fileInputRef = useRef(null);
  const isEditing = Boolean(initialPost);
  const buildDraft = React.useCallback((post = null) => ({
    text: post?.text || "",
    pinned: Boolean(post?.pinned),
    startDate: post?.startDate || todayISO(),
    endDate: post?.endDate || post?.startDate || todayISO(),
    existingImages: Array.isArray(post?.images) ? post.images.map((image) => ({ ...image })) : [],
    files: [],
    previews: [],
  }), []);
  const [draft, setDraft] = useState(() => buildDraft(initialPost));
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    setDraft((current) => {
      current.previews.forEach((preview) => URL.revokeObjectURL(preview));
      return buildDraft(initialPost);
    });
    setEmojiOpen(false);
  }, [buildDraft, initialPost]);

  useEffect(() => () => {
    draft.previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [draft.previews]);

  useEffect(() => {
    if (!emojiOpen) return undefined;
    const handleOutside = (event) => {
      if (!event.target.closest(".emoji-wrap")) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [emojiOpen]);

  const appendFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setDraft((current) => ({
      ...current,
      files: [...current.files, ...files],
      previews: [...current.previews, ...files.map((file) => URL.createObjectURL(file))],
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeExistingImage = (index) => {
    setDraft((current) => ({
      ...current,
      existingImages: current.existingImages.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const removeNewFile = (index) => {
    setDraft((current) => {
      const preview = current.previews[index];
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      return {
        ...current,
        files: current.files.filter((_, fileIndex) => fileIndex !== index),
        previews: current.previews.filter((_, previewIndex) => previewIndex !== index),
      };
    });
  };

  const totalImages = draft.existingImages.length + draft.files.length;

  return html`
    <div className="modal-backdrop" onClick=${onClose}>
      <div className="modal-sheet modal-sheet--post" onClick=${(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>${isEditing ? "Редактировать пост" : "Новая запись"}</h3>
            <p>${isEditing ? "Можно поменять текст, даты и состав фотографий." : "Добавь текст, фотографии и даты показа в календаре."}</p>
          </div>
          <button type="button" className="modal-close" onClick=${onClose}>×</button>
        </div>

        <div className="upload-drop upload-drop--compact upload-drop--list">
          <input
            ref=${fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange=${(event) => appendFiles(event.target.files)}
            disabled=${saving}
            hidden
          />
          <button
            type="button"
            className="button button--ghost upload-drop__button"
            onClick=${() => fileInputRef.current?.click()}
            disabled=${saving}
          >
            <span>📎</span>
            <span>Добавить фото</span>
          </button>
          <small>${totalImages ? `Фотографий: ${totalImages}` : "Можно добавлять и убирать изображения перед сохранением."}</small>
        </div>

        ${(draft.existingImages.length || draft.previews.length) ? html`
          <div className="attachment-list">
            ${draft.existingImages.map((image, index) => html`
              <div key=${image.path || image.publicUrl || `${index}-${getImageLabel(image)}`} className="attachment-item">
                <div className="attachment-item__preview">
                  <img src=${imageSrc(image)} alt="Изображение" />
                </div>
                <div className="attachment-item__meta">
                  <strong>${getImageLabel(image)}</strong>
                  <span>Уже в посте</span>
                </div>
                <button type="button" className="attachment-item__remove" onClick=${() => removeExistingImage(index)} disabled=${saving}>×</button>
              </div>
            `)}
            ${draft.previews.map((preview, index) => html`
              <div key=${preview} className="attachment-item">
                <div className="attachment-item__preview">
                  <img src=${preview} alt="Новое изображение" />
                </div>
                <div className="attachment-item__meta">
                  <strong>${draft.files[index]?.name || "Новое изображение"}</strong>
                  <span>Будет добавлено</span>
                </div>
                <button type="button" className="attachment-item__remove" onClick=${() => removeNewFile(index)} disabled=${saving}>×</button>
              </div>
            `)}
          </div>
        ` : null}

        <div className="modal-fields">
          <div className="field">
            <span>Текст</span>
            <div className="emoji-wrap">
              <textarea
                className="editor-textarea editor-textarea--modal"
                value=${draft.text}
                onInput=${(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
                placeholder="Что нового?"
                disabled=${saving}
              ></textarea>
              <div className="emoji-anchor">
                <button type="button" className="emoji-button" onClick=${() => setEmojiOpen((value) => !value)} disabled=${saving}>☺</button>
                ${emojiOpen && html`
                  <div className="emoji-pop">
                    ${EMOJIS.map((emoji) => html`
                      <button key=${emoji} type="button" onClick=${() => setDraft((current) => ({ ...current, text: `${current.text}${emoji}` }))}>${emoji}</button>
                    `)}
                  </div>
                `}
              </div>
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span>С</span>
              <input type="date" value=${draft.startDate} onInput=${(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} disabled=${saving} />
            </label>
            <label className="field">
              <span>По</span>
              <input type="date" value=${draft.endDate} onInput=${(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} disabled=${saving} />
            </label>
          </div>

          <div className="field-row field-row--end">
            <label className="checkbox-row">
              <input type="checkbox" checked=${draft.pinned} onChange=${(event) => setDraft((current) => ({ ...current, pinned: event.target.checked }))} disabled=${saving} />
              <span>Закрепить</span>
            </label>

            <button
              type="button"
              className="button button--red"
              onClick=${() => onSubmit(draft)}
              disabled=${saving || (!draft.text.trim() && !draft.files.length && !draft.existingImages.length)}
            >
              ${saving ? html`<${ButtonSpinner} />` : null}
              <span>${saving ? (isEditing ? "Сохраняется..." : "Публикуется...") : (isEditing ? "Сохранить" : "Опубликовать")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function CalendarPage({ state, onLocalChange }) {
  const monthKey = state.calendarMonth || toMonthKey(todayISO());
  const [selectedDate, setSelectedDate] = useState(`${monthKey}-01`);
  const days = useMemo(() => monthMatrix(monthKey), [monthKey]);
  const events = useMemo(() => collectEventsForDate(state, selectedDate), [state, selectedDate]);
  const totals = useMemo(() => {
    const next = { planner: 0, post: 0 };
    days.forEach((day) => {
      if (!day) return;
      collectEventsForDate(state, day).forEach((item) => {
        if (Object.hasOwn(next, item.type)) {
          next[item.type] += 1;
        }
      });
    });
    return next;
  }, [days, state]);

  useEffect(() => {
    setSelectedDate(`${monthKey}-01`);
  }, [monthKey]);

  const shiftMonth = (direction) => {
    const current = new Date(`${monthKey}-01T12:00:00`);
    current.setMonth(current.getMonth() + direction);
    onLocalChange({ ...state, calendarMonth: current.toISOString().slice(0, 7) });
  };

  return html`
    <main className="page calendar-page">
      <section className="panel calendar-panel">
        <div className="calendar-controls calendar-controls--compact">
          <button type="button" className="icon-button" onClick=${() => shiftMonth(-1)}>←</button>
          <input
            className="calendar-month-input"
            type="month"
            value=${monthKey}
            onInput=${(event) => onLocalChange({ ...state, calendarMonth: event.target.value })}
          />
          <button type="button" className="icon-button" onClick=${() => shiftMonth(1)}>→</button>
        </div>

        <div className="calendar-summary">
          <div className="calendar-summary__item"><i className="dot dot--planner"></i><span>Траты: ${totals.planner}</span></div>
          <div className="calendar-summary__item"><i className="dot dot--post"></i><span>Лента: ${totals.post}</span></div>
        </div>

        <div className="calendar-grid">
          <div className="calendar-week">Пн</div>
          <div className="calendar-week">Вт</div>
          <div className="calendar-week">Ср</div>
          <div className="calendar-week">Чт</div>
          <div className="calendar-week">Пт</div>
          <div className="calendar-week">Сб</div>
          <div className="calendar-week">Вс</div>

          ${days.map((day, index) => {
            if (!day) {
              return html`<div key=${`empty-${index}`} className="calendar-cell is-empty"></div>`;
            }
            const cellEvents = collectEventsForDate(state, day);
            const preview = previewEventsForDate(state, day);
            return html`
              <button
                key=${day}
                type="button"
                className=${`calendar-cell${selectedDate === day ? " is-active" : ""}`}
                onClick=${() => setSelectedDate(day)}
              >
                <div className="calendar-cell__top">
                  <span className="calendar-cell__day">${day.slice(8, 10)}</span>
                  <small className="calendar-cell__count">${cellEvents.length || ""}</small>
                </div>
                <div className="calendar-lines">
                  ${preview.map((item) => html`
                    <div key=${item.id} className=${`calendar-line calendar-line--${item.type}`}>
                      <span>${item.label}</span>
                    </div>
                  `)}
                </div>
              </button>
            `;
          })}
        </div>
      </section>

      <section className="panel agenda-panel">
        <div className="calendar-agenda-head">
          <h2>Календарь</h2>
          <p>${formatDate(selectedDate)}</p>
        </div>

        <div className="agenda-list">
          ${events.length ? events.map((item) => item.type === "post" && item.post ? html`
            <article key=${item.id} className="agenda-item agenda-item--post">
              <div className="agenda-badge agenda-badge--post">${item.label}</div>
              <div className="agenda-post-meta">${item.post.author || item.post.createdBy || "Lesha"} • ${formatFeedTimeMsk(item.post.createdAt || item.post.updatedAt)}</div>
              ${item.post.text ? html`<div className="agenda-text">${item.post.text}</div>` : null}
              ${item.post.images?.length ? html`
                <div className=${`post-gallery gallery-${Math.min(item.post.images.length, 6)} agenda-gallery`}>
                  ${item.post.images.map((image) => html`
                    <div key=${image.path || image.publicUrl || image.url} className="gallery-item">
                      <img src=${imageSrc(image)} alt="Изображение публикации" />
                    </div>
                  `)}
                </div>
              ` : null}
            </article>
          ` : html`
            <article key=${item.id} className="agenda-item">
              <div className=${`agenda-badge agenda-badge--${item.type}`}>${item.label}</div>
              <div className="agenda-text">${item.text}</div>
            </article>
          `) : html`
            <div className="empty-state empty-state--soft">
              <p>На выбранную дату событий пока нет.</p>
            </div>
          `}
        </div>
      </section>
    </main>
  `;
}

function MoneyTabPage({ tabs, tab, activeTabId, saving, actor, onSave, onDelete, onAddTab, onSelectTab }) {
  const cloneGroups = (list) => (list || []).map((group) => ({
    ...group,
    items: (group.items || []).map((item) => ({ ...item })),
  }));

  const [title, setTitle] = useState(tab?.title || "");
  const [groups, setGroups] = useState(() => cloneGroups(tab?.groups || []));
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [editingGroups, setEditingGroups] = useState({});
  const [editingItems, setEditingItems] = useState({});
  const [itemDrafts, setItemDrafts] = useState({});
  const [titleError, setTitleError] = useState("");
  const [titleShake, setTitleShake] = useState(false);

  useEffect(() => {
    setTitle(tab?.title || "");
    setGroups(cloneGroups(tab?.groups || []));
    setEditingGroups({});
    setEditingItems({});
    setItemDrafts({});
    setTitleError("");
    setTitleShake(false);
  }, [tab?.id, tab?.title, tab?.updatedAt, tab?.groups?.length]);

  useEffect(() => {
    if (!titleShake) return undefined;
    const timeout = window.setTimeout(() => setTitleShake(false), 420);
    return () => window.clearTimeout(timeout);
  }, [titleShake]);

  const startCreate = () => {
    setDraftTitle("");
    setCreating(true);
  };

  const cancelCreate = () => {
    setDraftTitle("");
    setCreating(false);
  };

  const confirmCreate = async () => {
    const savedTitle = draftTitle.trim();
    if (!savedTitle) return;
    await onAddTab(savedTitle);
    setDraftTitle("");
    setCreating(false);
  };

  if (!tab && !creating) {
    return html`
      <main className="page">
        <section className="panel money-panel money-panel--empty">
          <button type="button" className="money-plus" onClick=${startCreate} disabled=${saving}>+</button>
        </section>
      </main>
    `;
  }

  if (!tab && creating) {
    return html`
      <main className="page">
        <section className="panel money-panel money-panel--empty">
          <div className="money-tabs money-tabs--center">
            <div className="money-tab-editor">
              <input
                type="text"
                value=${draftTitle}
                onInput=${(event) => setDraftTitle(event.target.value)}
                placeholder="Название вкладки"
                disabled=${saving}
              />
              <button type="button" className="icon-button money-tab-editor__apply" onClick=${confirmCreate} disabled=${saving || !draftTitle.trim()}>✓</button>
              <button type="button" className="icon-button money-tab-editor__cancel" onClick=${cancelCreate} disabled=${saving}>×</button>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  const groupTotal = (group) => (group.items || []).reduce((sum, item) => sum + parseMoneyInput(item.cost), 0);
  const total = useMemo(() => groups.reduce((sum, group) => sum + groupTotal(group), 0), [groups]);
  const titleDirty = String(title || "") !== String(tab?.title || "");

  const getSavedGroup = (groupId) => (tab?.groups || []).find((group) => group.id === groupId) || null;
  const getSavedItem = (groupId, itemId) => (getSavedGroup(groupId)?.items || []).find((item) => item.id === itemId) || null;

  const buildNextTab = (nextTitle = title, nextGroups = groups) => {
    if (!String(nextTitle || "").trim()) {
      setTitleError("Введите название плана");
      setTitleShake(false);
      window.setTimeout(() => setTitleShake(true), 0);
      return null;
    }

    setTitleError("");
    const timestamp = nowISO();
    return normalizeMoneyTab({
      ...tab,
      title: String(nextTitle || "").trim(),
      createdAt: tab.createdAt || timestamp,
      createdBy: tab.createdBy || actor,
      updatedAt: timestamp,
      updatedBy: actor,
      groups: (nextGroups || []).map((group) => normalizeMoneyGroup({
        ...group,
        title: String(group.title || "").trim(),
        createdAt: group.createdAt || timestamp,
        createdBy: group.createdBy || actor,
        updatedAt: timestamp,
        updatedBy: actor,
        items: sortMoneySubitems(group.items || []).map((item) => normalizeMoneySubitem({
          ...item,
          name: String(item.name || "").trim(),
          cost: String(item.cost ?? "").trim(),
          isNew: false,
          createdAt: item.createdAt || timestamp,
          createdBy: item.createdBy || actor,
          updatedAt: timestamp,
          updatedBy: actor,
        })),
      })),
    });
  };

  const commitTab = async (nextTitle = title, nextGroups = groups, afterSave = null) => {
    const nextTab = buildNextTab(nextTitle, nextGroups);
    if (!nextTab) return false;
    const saved = await onSave(tab.id, nextTab);
    if (saved) {
      setTitle(nextTab.title);
      setGroups(cloneGroups(nextTab.groups));
      if (typeof afterSave === "function") {
        afterSave(nextTab);
      }
    }
    return saved;
  };

  const updateGroup = (groupId, patch) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
  };

  const replaceGroup = (groupId, nextGroup) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? nextGroup : group)));
  };

  const addGroup = () => {
    const nextGroup = getDefaultMoneyGroup(actor);
    setGroups((current) => [...current, nextGroup]);
    setEditingGroups((current) => ({ ...current, [nextGroup.id]: true }));
  };

  const startEditGroup = (groupId) => {
    setEditingGroups((current) => ({ ...current, [groupId]: true }));
  };

  const isGroupDirty = (group) => {
    const savedGroup = getSavedGroup(group.id) || { id: group.id, title: "", items: [] };
    return serializeMoneyDraft("group", [group]) !== serializeMoneyDraft("group", [savedGroup]);
  };

  const saveGroup = async (groupId) => {
    const target = groups.find((group) => group.id === groupId);
    if (!target || !String(target.title || "").trim()) return;
    await commitTab(title, groups, () => {
      setEditingGroups((current) => ({ ...current, [groupId]: false }));
    });
  };

  const cancelGroupEdit = (groupId) => {
    const savedGroup = getSavedGroup(groupId);
    if (!savedGroup) {
      setGroups((current) => current.filter((group) => group.id !== groupId));
    } else {
      replaceGroup(groupId, {
        ...savedGroup,
        items: (savedGroup.items || []).map((item) => ({ ...item })),
      });
    }
    setEditingGroups((current) => ({ ...current, [groupId]: false }));
    setEditingItems((current) => {
      const next = { ...current };
      Object.keys(next).forEach((itemId) => {
        if ((savedGroup?.items || []).some((item) => item.id === itemId) || !savedGroup) {
          delete next[itemId];
        }
      });
      return next;
    });
    setItemDrafts((current) => {
      const next = { ...current };
      Object.keys(next).forEach((itemId) => {
        if ((savedGroup?.items || []).some((item) => item.id === itemId) || !savedGroup) {
          delete next[itemId];
        }
      });
      return next;
    });
  };

  const removeGroup = async (groupId) => {
    const nextGroups = groups.filter((group) => group.id !== groupId);
    await commitTab(title, nextGroups, () => {
      setEditingGroups((current) => {
        const next = { ...current };
        delete next[groupId];
        return next;
      });
    });
  };

  const addSubitem = (groupId) => {
    const nextItem = getDefaultMoneySubitem(actor);
    setGroups((current) => current.map((group) => (
      group.id === groupId
        ? { ...group, items: [...group.items, nextItem] }
        : group
    )));
    setEditingGroups((current) => ({ ...current, [groupId]: true }));
    setEditingItems((current) => ({ ...current, [nextItem.id]: true }));
    setItemDrafts((current) => ({ ...current, [nextItem.id]: { ...nextItem } }));
  };

  const updateSubitem = (groupId, itemId, patch) => {
    setGroups((current) => current.map((group) => (
      group.id === groupId
        ? {
          ...group,
          items: group.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        }
        : group
    )));
  };

  const startEditSubitem = (groupId, item) => {
    setEditingGroups((current) => ({ ...current, [groupId]: true }));
    setEditingItems((current) => ({ ...current, [item.id]: true }));
    setItemDrafts((current) => ({ ...current, [item.id]: { ...item } }));
  };

  const updateDraftSubitem = (itemId, patch) => {
    setItemDrafts((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        ...patch,
      },
    }));
  };

  const clearSubitemEdit = (itemId) => {
    setEditingItems((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setItemDrafts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

  const cancelEditSubitem = (groupId, itemId) => {
    const savedItem = getSavedItem(groupId, itemId);
    if (!savedItem) {
      setGroups((current) => current.map((group) => (
        group.id === groupId ? { ...group, items: group.items.filter((item) => item.id !== itemId) } : group
      )));
    }
    clearSubitemEdit(itemId);
  };

  const isSubitemDirty = (item, draft) => serializeMoneySubitem(item) !== serializeMoneySubitem(draft);

  const saveSubitem = async (groupId, itemId) => {
    const draft = itemDrafts[itemId];
    if (!draft || (!String(draft.name || "").trim() && !String(draft.cost || "").trim())) return;
    const nextGroups = groups.map((group) => (
      group.id === groupId
        ? {
          ...group,
          items: group.items.map((item) => (
            item.id === itemId
              ? {
                ...item,
                ...draft,
                isNew: false,
                updatedAt: nowISO(),
                updatedBy: actor,
              }
              : item
          )),
        }
        : group
    ));
    await commitTab(title, nextGroups, () => {
      clearSubitemEdit(itemId);
    });
  };

  const toggleSubitemCompleted = async (groupId, item) => {
    const nextGroups = groups.map((group) => (
      group.id === groupId
        ? {
          ...group,
          items: group.items.map((entry) => (
            entry.id === item.id
              ? { ...entry, completed: !entry.completed, updatedAt: nowISO(), updatedBy: actor }
              : entry
          )),
        }
        : group
    ));
    await commitTab(title, nextGroups);
  };

  const removeSubitem = async (groupId, itemId) => {
    const nextGroups = groups.map((group) => (
      group.id === groupId
        ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
        : group
    ));
    await commitTab(title, nextGroups, () => {
      clearSubitemEdit(itemId);
    });
  };

  const saveTitle = async () => {
    await commitTab(title, groups);
  };

  const cancelTitle = () => {
    setTitle(tab?.title || "");
    setTitleError("");
    setTitleShake(false);
  };

  return html`
    <main className="page">
      <section className="panel money-panel">
        <div className="money-tabs">
          ${tabs.map((item) => html`
            <button
              key=${item.id}
              type="button"
              className=${`money-tabs__item${activeTabId === item.id ? " is-active" : ""}`}
              onClick=${() => onSelectTab(item.id)}
              disabled=${saving}
            >${item.title}</button>
          `)}
          ${creating
            ? html`
              <div className="money-tab-editor">
                <input
                  type="text"
                  value=${draftTitle}
                  onInput=${(event) => setDraftTitle(event.target.value)}
                  placeholder="Название вкладки"
                  disabled=${saving}
                />
                <button type="button" className="icon-button money-tab-editor__apply" onClick=${confirmCreate} disabled=${saving || !draftTitle.trim()}>✓</button>
                <button type="button" className="icon-button money-tab-editor__cancel" onClick=${cancelCreate} disabled=${saving}>×</button>
              </div>
            `
            : html`<button type="button" className="money-tab-create" onClick=${startCreate} disabled=${saving}>+</button>`}
        </div>

        <div className="money-mini-head">
          <div className="money-mini-head__plan">
            <input
              className=${`money-mini-head__title${titleError ? " is-invalid" : ""}${titleShake ? " is-shake" : ""}`}
              type="text"
              value=${title}
              onInput=${(event) => {
                setTitle(event.target.value);
                if (event.target.value.trim()) {
                  setTitleError("");
                }
              }}
              placeholder="Название плана"
              disabled=${saving}
            />
            ${titleError ? html`<div className="field-error">${titleError}</div>` : null}
            <div className="money-plan-total">Итого: ${formatMoney(total)}</div>
          </div>
          <div className="money-mini-head__actions">
            <button type="button" className="icon-button money-tab-editor__apply" onClick=${saveTitle} disabled=${saving || !title.trim() || !titleDirty}>✓</button>
            <button type="button" className="icon-button money-tab-editor__cancel" onClick=${cancelTitle} disabled=${saving || !titleDirty}>×</button>
            <button type="button" className="icon-button money-row__delete" onClick=${() => onDelete(tab.id)} disabled=${saving}>⌫</button>
          </div>
        </div>

        <div className="money-table money-table--minimal">
          ${groups.length ? groups.map((group) => html`
            <section key=${group.id} className="money-group">
              <div className="money-group__head">
                <div className="money-group__title-wrap">
                  ${editingGroups[group.id]
                    ? html`
                      <input
                        className="money-group__title"
                        type="text"
                        value=${group.title}
                        onInput=${(event) => updateGroup(group.id, { title: event.target.value })}
                        placeholder="Название дела"
                        disabled=${saving}
                      />
                    `
                    : html`<div className="money-group__title-text">${group.title || "Без названия"}</div>`}
                  <div className="money-group__total">${formatMoney(groupTotal(group))}</div>
                </div>
                <div className="money-group__actions">
                  ${editingGroups[group.id]
                    ? html`
                      <button type="button" className="icon-button money-tab-editor__apply" onClick=${() => saveGroup(group.id)} disabled=${saving || !group.title.trim() || !isGroupDirty(group)}>✓</button>
                      <button type="button" className="icon-button money-tab-editor__cancel" onClick=${() => cancelGroupEdit(group.id)} disabled=${saving}>×</button>
                    `
                    : html`
                      <button
                        type="button"
                        className="icon-button money-row__edit"
                        onClick=${() => startEditGroup(group.id)}
                        disabled=${saving}
                      >✎</button>
                    `}
                  <button type="button" className="icon-button money-row__delete" onClick=${() => removeGroup(group.id)} disabled=${saving || groups.length <= 1}>⌫</button>
                </div>
              </div>

              <div className="money-group__items">
                ${group.items.length ? sortMoneySubitems(group.items).map((item) => {
                  const isEditing = Boolean(editingItems[item.id]);
                  const draft = itemDrafts[item.id] || item;
                  const itemDirty = isSubitemDirty(item, draft);
                  return isEditing && editingGroups[group.id] ? html`
                    <div key=${item.id} className="money-row money-row--editing">
                      <div className="money-row__edit-head">
                        <strong>${draft.name || "Подпункт"}</strong>
                        <div className="money-row__edit-actions">
                          ${draft.isNew ? null : html`
                            <button
                              type="button"
                              className=${`money-status-toggle${draft.completed ? " is-return" : " is-done"}`}
                              onClick=${() => updateDraftSubitem(item.id, { completed: !draft.completed })}
                              disabled=${saving}
                            >${draft.completed ? "Вернуть" : "Сделано"}</button>
                          `}
                          <button type="button" className="icon-button money-tab-editor__apply" onClick=${() => saveSubitem(group.id, item.id)} disabled=${saving || !itemDirty || (!String(draft.name || "").trim() && !String(draft.cost || "").trim())}>✓</button>
                          <button type="button" className="icon-button money-tab-editor__cancel" onClick=${() => cancelEditSubitem(group.id, item.id)} disabled=${saving}>×</button>
                        </div>
                      </div>

                      <label className="money-cell">
                        <span className="money-cell__label">Подпункт</span>
                        <input
                          type="text"
                          value=${draft.name}
                          onInput=${(event) => updateDraftSubitem(item.id, { name: event.target.value })}
                          placeholder="Например: ворота, бетон, крыша"
                          disabled=${saving}
                        />
                      </label>

                      <label className="money-cell">
                        <span className="money-cell__label">Стоимость</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value=${draft.cost}
                          onInput=${(event) => updateDraftSubitem(item.id, { cost: event.target.value })}
                          placeholder="0"
                          disabled=${saving}
                        />
                      </label>
                    </div>
                  ` : html`
                    <div key=${item.id} className=${`money-row money-row--compact${item.completed ? " is-done" : ""}`}>
                      <div className="money-row__summary">
                        <strong>${item.name || "Без названия"}</strong>
                        ${item.completed ? html`<span className="money-row__badge">Сделано</span>` : null}
                      </div>
                      <div className="money-row__amount">${formatMoney(parseMoneyInput(item.cost))}</div>
                      ${editingGroups[group.id] ? html`
                        <div className="money-row__side">
                          ${item.isNew ? null : html`
                            <button
                              type="button"
                              className=${`money-status-toggle${item.completed ? " is-return" : " is-done"}`}
                              onClick=${() => toggleSubitemCompleted(group.id, item)}
                              disabled=${saving}
                            >${item.completed ? "Вернуть" : "Сделано"}</button>
                          `}
                          <button type="button" className="icon-button money-row__edit" onClick=${() => startEditSubitem(group.id, item)} disabled=${saving}>✎</button>
                          <button type="button" className="icon-button money-row__delete" onClick=${() => removeSubitem(group.id, item.id)} disabled=${saving || group.items.length <= 1}>⌫</button>
                        </div>
                      ` : html`<div></div>`}
                    </div>
                  `;
                }) : null}
              </div>

              ${editingGroups[group.id] ? html`
                <div className="money-group__footer">
                  <button type="button" className="button button--ghost" onClick=${() => addSubitem(group.id)} disabled=${saving}>Добавить подпункт</button>
                </div>
              ` : null}
            </section>
          `) : html`
            <div className="empty-state empty-state--soft money-empty">
              <p>Добавьте первое дело внутри плана.</p>
            </div>
          `}
        </div>

        <div className="money-mini-footer">
          <button type="button" className="button button--ghost" onClick=${addGroup} disabled=${saving}>Добавить дело</button>
        </div>
      </section>
    </main>
  `;
}

createRoot(document.getElementById("app")).render(html`<${App} />`);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

