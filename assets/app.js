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
  { id: "planner", label: "Планировщик трат" },
  { id: "plans", label: "Лента" },
  { id: "money", label: "Планы (деньги)" },
  { id: "dogs", label: "Собаки" },
  { id: "calendar", label: "Календарь" },
];

const THEMES = [
  { id: "light", label: "Светлая" },
  { id: "paper", label: "Мягкая" },
  { id: "dark", label: "Тёмная" },
];

const EMOJIS = ["😊", "🙂", "💡", "📅", "🐶", "💸", "✨", "🔥", "📌", "🤍"];
const LOCAL_USERS = {
  Lesha: "vandal2020",
  Lera: "vandal2021",
};

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
  title: tab?.title || "Планы (деньги)",
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
    case "dogs":
      return [DATA_SLICE_META, DATA_SLICE_DOGS];
    case "plans":
      return [DATA_SLICE_META, DATA_SLICE_POSTS];
    case "money":
      return [DATA_SLICE_META, DATA_SLICE_MONEY];
    case "calendar":
      return [DATA_SLICE_META, DATA_SLICE_PLANNER, DATA_SLICE_DOGS, DATA_SLICE_POSTS];
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
  settings: hasOwn(patch, "settings") ? { ...current.settings, ...patch.settings } : current.settings,
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
      items.push({ id: `${entry.id}-${date}`, type: "planner", label: "Планировщик трат", text: entry.text });
    }
  });
  state.dogsEntries.forEach((entry) => {
    if (dateMatchesEntry(entry, date)) {
      items.push({ id: `${entry.id}-${date}`, type: "dogs", label: "Собаки", text: entry.text });
    }
  });
  state.posts.filter((post) => !post.archived).forEach((post) => {
    const start = post.startDate || post.createdAt.slice(0, 10);
    const end = post.endDate || start;
    if (inRange(date, start, end)) {
      items.push({ id: `${post.id}-${date}`, type: "post", label: "Лента", text: post.text || "Публикация" });
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
  const [authSaving, setAuthSaving] = useState(false);
  const loadedSlicesRef = useRef({});

  useEffect(() => {
    document.title = "Планировщик";
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
    setState((current) => ({ ...current, view: nextView }));
  };

  const selectMoneyTab = (tabId) => {
    setViewRefreshToken((current) => current + 1);
    applyLocal((current) => ({ ...current, moneyActiveTabId: tabId }));
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

  const persist = async (nextState, message = "Сохранено") => {
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
      setToast({ tone: "success", text: "Пост удалён" });
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
      title: title?.trim() || (state.customTabs.length ? `Новый план ${state.customTabs.length + 1}` : "Новый план"),
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
    }, "План сохранён");
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
        title="Планировщик трат"
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
        onDeletePost=${handleDeletePost}
        saving=${saving}
        actor=${session?.role || ""}
      />
    `;
  } else if (!pageLoading && state.view === "dogs") {
    page = html`
      <${NotePage}
        kind="dogs"
        title="Собаки"
        state=${state}
        onSave=${persist}
        onLocalChange=${applyLocal}
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
          <h2>Денежных вкладок пока нет</h2>
          <p>Создайте первую вкладку и собирайте таблицу из названий и сумм в одном месте.</p>
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

  const submitComment = (post) => {
    const text = String(commentDrafts[post.id] || "").trim();
    if (!text || saving) return;
    const timestamp = nowISO();
    onSave({
      ...state,
      posts: state.posts.map((item) => (item.id === post.id ? normalizePost({
        ...item,
        comments: [
          ...(item.comments || []),
          normalizeComment({
            id: uid("comment"),
            author: actor || "Lesha",
            text,
            createdAt: timestamp,
            createdBy: actor || "Lesha",
            updatedAt: timestamp,
            updatedBy: actor || "Lesha",
          }),
        ],
        updatedAt: timestamp,
        updatedBy: actor || item.updatedBy || item.author,
      }) : item)),
    }, "Комментарий добавлен");
    setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
    setExpandedComments((current) => ({ ...current, [post.id]: true }));
  };

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
    persistPostComments(postId, (comments, timestamp) => ([
      ...comments,
      normalizeComment({
        id: uid("comment"),
        author: actor || "Lesha",
        text,
        createdAt: timestamp,
        createdBy: actor || "Lesha",
        updatedAt: timestamp,
        updatedBy: actor || "Lesha",
      }),
    ]), "Комментарий добавлен");
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setExpandedComments((current) => ({ ...current, [postId]: true }));
  };

  const startEditComment = (postId, comment) => {
    setCommentMenuKey("");
    setEditingCommentKey(`${postId}:${comment.id}`);
    setEditingCommentText(comment.text || "");
    setExpandedComments((current) => ({ ...current, [postId]: true }));
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
    )), "Комментарий обновлён");
    setEditingCommentKey("");
    setEditingCommentText("");
  };

  const removeComment = (postId, commentId) => {
    setCommentMenuKey("");
    if (editingCommentKey === `${postId}:${commentId}`) {
      setEditingCommentKey("");
      setEditingCommentText("");
    }
    persistPostComments(postId, (comments) => comments.filter((comment) => comment.id !== commentId), "Комментарий удалён");
  };

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
            <span>${state.settings.lastUpdatedBy ? `последнее обновление: ${state.settings.lastUpdatedBy}` : "рабочая сессия"}</span>
          </div>

          <div className="theme-menu">
            <button type="button" className="icon-button" onClick=${() => setThemeMenuOpen((value) => !value)} disabled=${saving}>◐</button>
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

          <button type="button" className="button button--ghost" onClick=${handleLogout} disabled=${saving}>Выйти</button>
        </div>
      </header>

      ${page}
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
                placeholder="Запишите план, расходы, напоминания или договорённости"
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

function FeedPage({ state, onSave, onLocalChange, onCreatePost, onDeletePost, saving, actor }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [commentMenuKey, setCommentMenuKey] = useState("");
  const [editingCommentKey, setEditingCommentKey] = useState("");
  const [editingCommentText, setEditingCommentText] = useState("");
  const posts = useMemo(() => sortedPosts([...state.posts], state.feedFilters), [state.posts, state.feedFilters]);
  const isArchived = state.feedFilters.mode === "archived";

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
    persistPostComments(postId, (comments, timestamp) => ([
      ...comments,
      normalizeComment({
        id: uid("comment"),
        author: actor || "Lesha",
        text,
        createdAt: timestamp,
        createdBy: actor || "Lesha",
        updatedAt: timestamp,
        updatedBy: actor || "Lesha",
      }),
    ]), "Комментарий добавлен");
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    setExpandedComments((current) => ({ ...current, [postId]: true }));
  };

  const startEditComment = (postId, comment) => {
    setCommentMenuKey("");
    setEditingCommentKey(`${postId}:${comment.id}`);
    setEditingCommentText(comment.text || "");
    setExpandedComments((current) => ({ ...current, [postId]: true }));
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
    )), "Комментарий обновлён");
    setEditingCommentKey("");
    setEditingCommentText("");
  };

  const removeComment = (postId, commentId) => {
    setCommentMenuKey("");
    if (editingCommentKey === `${postId}:${commentId}`) {
      setEditingCommentKey("");
      setEditingCommentText("");
    }
    persistPostComments(postId, (comments) => comments.filter((comment) => comment.id !== commentId), "Комментарий удалён");
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
    await onDeletePost(postId);
  };

  return html`
    <main className="page page--wide">
      <section className="panel composer-bar">
        <button type="button" className="create-post create-post--wide" onClick=${() => setModalOpen(true)} disabled=${saving}>
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

      <section className="panel feed-board">
        <div className="feed-board__head">
          <div className="feed-switches">
            <button
              type="button"
              className=${`feed-switch${!isArchived ? " is-active" : ""}`}
              onClick=${() => onLocalChange({ ...state, feedFilters: { ...state.feedFilters, mode: "active" } })}
              disabled=${saving}
            >Активные</button>
            <button
              type="button"
              className=${`feed-switch${isArchived ? " is-active" : ""}`}
              onClick=${() => onLocalChange({ ...state, feedFilters: { ...state.feedFilters, mode: "archived" } })}
              disabled=${saving}
            >Архив</button>
          </div>
          <div className="feed-board__meta">${isArchived ? "Архивные публикации" : "Актуальные публикации"}</div>
        </div>

        <div className="feed-stack feed-stack--board">
          ${posts.length ? posts.map((post, index) => html`
            <article key=${post.id} className=${`post-card post-card--flat${post.pinned ? " is-pinned" : ""}${post.archived ? " is-archived" : ""}`}>
              <div className="post-head">
                <div>
                  <div className="post-author">${post.author || "Lesha"}</div>
                  ${(post.pinned || post.archived) ? html`
                    <div className="post-meta">${post.pinned ? "Закреплено" : "Архив"}</div>
                  ` : null}
                </div>

                <div className="post-menu-wrap">
                  <button type="button" className="menu-button" onClick=${() => setMenuOpenId((value) => value === post.id ? "" : post.id)} disabled=${saving}>⋯</button>
                  ${menuOpenId === post.id && html`
                    <div className="post-menu">
                      <button
                        type="button"
                        className="post-menu__item"
                        onClick=${() => updatePost(post.id, { pinned: !post.pinned }, post.pinned ? "Пост откреплён" : "Пост закреплён")}
                      >
                        <span className="post-menu__icon">📌</span>
                        <span className="post-menu__label">${post.pinned ? "Открепить" : "Закрепить"}</span>
                      </button>
                      <button
                        type="button"
                        className="post-menu__item"
                        onClick=${() => updatePost(post.id, { archived: !post.archived, pinned: post.archived ? post.pinned : false }, post.archived ? "Пост возвращён" : "Пост отправлен в архив")}
                      >
                        <span className="post-menu__icon">🗃</span>
                        <span className="post-menu__label">${post.archived ? "Вернуть" : "В архив"}</span>
                      </button>
                      <button type="button" className="post-menu__item is-danger" onClick=${() => deletePost(post.id)}>
                        <span className="post-menu__icon">🗑</span>
                        <span className="post-menu__label">Удалить</span>
                      </button>
                    </div>
                  `}
                </div>
              </div>

              ${post.images?.length ? html`
                <div className=${`post-gallery gallery-${Math.min(post.images.length, 4)}`}>
                  ${post.images.map((image) => html`
                    <button key=${image.path || image.publicUrl} type="button" className="gallery-item" onClick=${() => setLightbox(imageSrc(image))}>
                      <img src=${imageSrc(image)} alt="Изображение публикации" />
                    </button>
                  `)}
                </div>
              ` : null}

              ${post.text ? html`<div className="post-text">${post.text}</div>` : null}

              <div className="post-footer">
                <div className="post-footer__meta">${post.updatedBy ? `Обновил ${post.updatedBy}` : `Создал ${post.author}`}</div>
                <div className="post-dates">${formatShortDate(post.startDate)}${post.endDate && post.endDate !== post.startDate ? ` - ${formatShortDate(post.endDate)}` : ""}</div>
              </div>

              <div className="post-comments">
                ${post.comments?.length > 2 && !expandedComments[post.id] ? html`
                  <button
                    type="button"
                    className="post-comments__more"
                    onClick=${() => setExpandedComments((current) => ({ ...current, [post.id]: true }))}
                  >
                    Показать ещё ${post.comments.length - 2}
                  </button>
                ` : null}

                <div className="comment-list">
                  ${(expandedComments[post.id] ? post.comments : (post.comments || []).slice(-2)).map((comment) => html`
                    <article key=${comment.id} className="comment-item">
                      <div className="comment-avatar">${initials(comment.author)}</div>
                      <div className="comment-bubble">
                        <div className="comment-top">
                          <div className="comment-author-row">
                            <strong className="comment-author">${comment.author}</strong>
                            ${comment.author === post.author ? html`<span className="comment-role">Автор</span>` : null}
                          </div>
                          <div className="comment-menu-wrap">
                            <button
                              type="button"
                              className="menu-button comment-menu-button"
                              onClick=${() => setCommentMenuKey((value) => value === `${post.id}:${comment.id}` ? "" : `${post.id}:${comment.id}`)}
                              disabled=${saving}
                            >⋯</button>
                            ${commentMenuKey === `${post.id}:${comment.id}` ? html`
                              <div className="post-menu comment-menu">
                                <button
                                  type="button"
                                  className="post-menu__item"
                                  onClick=${() => startEditComment(post.id, comment)}
                                >
                                  <span className="post-menu__icon">✎</span>
                                  <span className="post-menu__label">Редактировать</span>
                                </button>
                                <button
                                  type="button"
                                  className="post-menu__item is-danger"
                                  onClick=${() => removeComment(post.id, comment.id)}
                                >
                                  <span className="post-menu__icon">🗑</span>
                                  <span className="post-menu__label">Удалить комментарий</span>
                                </button>
                              </div>
                            ` : null}
                          </div>
                        </div>
                        ${editingCommentKey === `${post.id}:${comment.id}` ? html`
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
                                onClick=${() => saveEditedComment(post.id, comment.id)}
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
                          <div className="comment-text">${comment.text}</div>
                          <div className="comment-meta">${formatTime(comment.createdAt)}</div>
                        `}
                      </div>
                    </article>
                  `)}
                </div>

                <div className="comment-compose">
                  <div className="comment-avatar is-self">${initials(actor || "L")}</div>
                  <div className="comment-compose__field">
                    <input
                      type="text"
                      value=${commentDrafts[post.id] || ""}
                      onInput=${(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                      onKeyDown=${(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addComment(post.id);
                        }
                      }}
                      placeholder="Написать комментарий..."
                      disabled=${saving}
                    />
                  </div>
                  <button
                    type="button"
                    className="comment-send"
                    onClick=${() => addComment(post.id)}
                    disabled=${saving || !String(commentDrafts[post.id] || "").trim()}
                  >➤</button>
                </div>
              </div>

              ${index < posts.length - 1 ? html`<div className="post-divider"></div>` : null}
            </article>
          `) : html`
            <section className="empty-state">
              <h3>${isArchived ? "Архив пока пуст" : "Лента пока пустая"}</h3>
              <p>${isArchived ? "Сюда попадут публикации после переноса в архив." : "Первый пост можно добавить через верхнюю кнопку."}</p>
            </section>
          `}
        </div>
      </section>

      ${modalOpen && html`
        <${PostModal}
          saving=${saving}
          onClose=${() => setModalOpen(false)}
          onSubmit=${async (draft) => {
            const saved = await onCreatePost(draft);
            if (saved) setModalOpen(false);
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

function PostModal({ saving, onClose, onSubmit }) {
  const [draft, setDraft] = useState({
    text: "",
    pinned: false,
    startDate: todayISO(),
    endDate: todayISO(),
    files: [],
    previews: [],
  });
  const [emojiOpen, setEmojiOpen] = useState(false);

  const changeFiles = (fileList) => {
    const files = Array.from(fileList || []);
    setDraft((current) => {
      current.previews.forEach((preview) => URL.revokeObjectURL(preview));
      return {
        ...current,
        files,
        previews: files.map((file) => URL.createObjectURL(file)),
      };
    });
  };

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

  return html`
    <div className="modal-backdrop" onClick=${onClose}>
      <div className="modal-sheet modal-sheet--post" onClick=${(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>Новый пост</h3>
            <p>Фотографии и текст можно опубликовать одной карточкой.</p>
          </div>
          <button type="button" className="modal-close" onClick=${onClose}>×</button>
        </div>

        <label className="upload-drop upload-drop--compact">
          <input type="file" accept="image/*" multiple onChange=${(event) => changeFiles(event.target.files)} disabled=${saving} hidden />
          <span>Добавить фото</span>
          <small>Файлы с телефона и ПК</small>
        </label>

        ${draft.previews.length ? html`
          <div className=${`post-gallery gallery-${Math.min(draft.previews.length, 4)} post-gallery--preview`}>
            ${draft.previews.map((preview) => html`
              <div key=${preview} className="gallery-item is-static">
                <img src=${preview} alt="Предпросмотр" />
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
                placeholder="Напишите что-нибудь"
                disabled=${saving}
              ></textarea>
              <div className="emoji-anchor">
                <button type="button" className="emoji-button" onClick=${() => setEmojiOpen((value) => !value)} disabled=${saving}>😊</button>
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
              <span>Начало</span>
              <input type="date" value=${draft.startDate} onInput=${(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} disabled=${saving} />
            </label>
            <label className="field">
              <span>Окончание</span>
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
              disabled=${saving || (!draft.text.trim() && !draft.files.length)}
            >
              ${saving ? html`<${ButtonSpinner} />` : null}
              <span>${saving ? "Публикация..." : "Опубликовать"}</span>
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
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T12:00:00`));
  const totals = useMemo(() => {
    const next = { planner: 0, dogs: 0, post: 0 };
    days.forEach((day) => {
      if (!day) return;
      collectEventsForDate(state, day).forEach((item) => {
        next[item.type] += 1;
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
    <main className="page">
      <section className="panel calendar-panel">
        <div className="page-head">
          <div>
            <h2>Проверка плана по датам</h2>
            <p>Календарь собирает записи из планировщика, собак и ленты.</p>
          </div>

          <div className="calendar-controls">
            <button type="button" className="icon-button" onClick=${() => shiftMonth(-1)}>←</button>
            <div className="calendar-month-pill">${monthLabel}</div>
            <button type="button" className="icon-button" onClick=${() => shiftMonth(1)}>→</button>
            <label className="date-field date-field--month">
              <span>Месяц</span>
              <input type="month" value=${monthKey} onInput=${(event) => onLocalChange({ ...state, calendarMonth: event.target.value })} />
            </label>
          </div>
        </div>

        <div className="calendar-summary">
          <div className="calendar-summary__item"><i className="dot dot--planner"></i><span>Траты: ${totals.planner}</span></div>
          <div className="calendar-summary__item"><i className="dot dot--dogs"></i><span>Собаки: ${totals.dogs}</span></div>
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
        <div className="page-head">
          <div>
            <h2>${formatDate(selectedDate)}</h2>
            <p>${events.length ? "Все события на выбранный день." : "На выбранную дату событий пока нет."}</p>
          </div>
        </div>

        <div className="agenda-list">
          ${events.length ? events.map((item) => html`
            <article key=${item.id} className="agenda-item">
              <div className=${`agenda-badge agenda-badge--${item.type}`}>${item.label}</div>
              <div className="agenda-text">${item.text}</div>
            </article>
          `) : html`
            <div className="empty-state empty-state--soft">
              <p>Календарь станет плотнее, когда появятся новые записи и публикации.</p>
            </div>
          `}
        </div>
      </section>
    </main>
  `;
}

function MoneyTabPage({ tabs, tab, activeTabId, saving, actor, onSave, onDelete, onAddTab, onSelectTab }) {
  const [title, setTitle] = useState(tab?.title || "");
  const [groups, setGroups] = useState(() => (tab?.groups || []).map((group) => ({
    ...group,
    items: (group.items || []).map((item) => ({ ...item })),
  })));
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [editingGroups, setEditingGroups] = useState({});
  const [editingItems, setEditingItems] = useState({});
  const [itemDrafts, setItemDrafts] = useState({});
  const [titleError, setTitleError] = useState("");
  const [titleShake, setTitleShake] = useState(false);

  useEffect(() => {
    setTitle(tab?.title || "");
    setGroups((tab?.groups || []).map((group) => ({
      ...group,
      items: (group.items || []).map((item) => ({ ...item })),
    })));
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

  const addGroup = () => {
    setGroups((current) => [...current, getDefaultMoneyGroup(actor)]);
  };

  const updateGroup = (groupId, patch) => {
    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
  };

  const removeGroup = (groupId) => {
    setGroups((current) => current.filter((group) => group.id !== groupId));
    setEditingGroups((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
  };

  const toggleGroupEditing = (groupId) => {
    setEditingGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  const addSubitem = (groupId) => {
    const nextItem = getDefaultMoneySubitem(actor);
    setGroups((current) => current.map((group) => (
      group.id === groupId
        ? { ...group, items: [...group.items, nextItem] }
        : group
    )));
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

  const removeSubitem = (groupId, itemId) => {
    setGroups((current) => current.map((group) => (
      group.id === groupId
        ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
        : group
    )));
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

  const groupTotal = (group) => (group.items || []).reduce((sum, item) => sum + parseMoneyInput(item.cost), 0);
  const total = useMemo(() => groups.reduce((sum, group) => sum + groupTotal(group), 0), [groups]);
  const initialSignature = useMemo(() => serializeMoneyDraft(tab?.title || "", tab?.groups || []), [tab?.title, tab?.groups]);
  const currentSignature = useMemo(() => serializeMoneyDraft(title, groups), [title, groups]);
  const isDirty = initialSignature !== currentSignature;

  const startEditSubitem = (item) => {
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

  const cancelEditSubitem = (itemId) => {
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

  const applyEditSubitem = (groupId, itemId) => {
    const draft = itemDrafts[itemId];
    if (!draft) return;
    updateSubitem(groupId, itemId, {
      ...draft,
      isNew: false,
      updatedAt: nowISO(),
      updatedBy: actor,
    });
    cancelEditSubitem(itemId);
  };

  const saveTab = async () => {
    if (!isDirty) return;
    if (!title.trim()) {
      setTitleError("Введите название плана");
      setTitleShake(false);
      window.setTimeout(() => setTitleShake(true), 0);
      return;
    }

    setTitleError("");
    const timestamp = nowISO();
    const nextTab = normalizeMoneyTab({
      ...tab,
      title: title.trim() || "Планы (деньги)",
      createdAt: tab.createdAt || timestamp,
      createdBy: tab.createdBy || actor,
      updatedAt: timestamp,
      updatedBy: actor,
      groups: groups
        .filter((group) => group.title.trim() || group.items.some((item) => item.name.trim() || String(item.cost).trim()))
        .map((group) => normalizeMoneyGroup({
          ...group,
          title: group.title.trim(),
          createdAt: group.createdAt || timestamp,
          createdBy: group.createdBy || actor,
          updatedAt: timestamp,
          updatedBy: actor,
          items: sortMoneySubitems(group.items)
            .filter((item) => item.name.trim() || String(item.cost).trim())
            .map((item) => normalizeMoneySubitem({
              ...item,
              name: item.name.trim(),
              cost: String(item.cost || "").trim(),
              completed: Boolean(item.completed),
              isNew: false,
              createdAt: item.createdAt || timestamp,
              createdBy: item.createdBy || actor,
              updatedAt: timestamp,
              updatedBy: actor,
            })),
        })),
    });

    await onSave(tab.id, nextTab);
  };

  const isSubitemDirty = (item, draft) => {
    return serializeMoneySubitem(item) !== serializeMoneySubitem(draft);
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
            ${isDirty ? html`
              <button type="button" className="icon-button money-tab-editor__apply" onClick=${saveTab} disabled=${saving}>
                ${saving ? html`<${ButtonSpinner} />` : "✓"}
              </button>
            ` : null}
            <button type="button" className="icon-button money-tab-editor__cancel" onClick=${() => onDelete(tab.id)} disabled=${saving}>×</button>
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
                  <button
                    type="button"
                    className=${`icon-button money-row__edit${editingGroups[group.id] ? " is-active" : ""}`}
                    onClick=${() => toggleGroupEditing(group.id)}
                    disabled=${saving}
                  >✎</button>
                  <button type="button" className="icon-button money-row__delete" onClick=${() => removeGroup(group.id)} disabled=${saving || groups.length <= 1}>×</button>
                </div>
              </div>

              <div className="money-group__items">
                ${group.items.length ? sortMoneySubitems(group.items).map((item) => {
                  const isEditing = Boolean(editingItems[item.id]);
                  const draft = itemDrafts[item.id] || item;
                  const itemDirty = isSubitemDirty(item, draft);
                  return isEditing && editingGroups[group.id] ? html`
                    <div key=${item.id} className="money-row money-row--editing">
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

                      <div className="money-row__side money-row__side--edit">
                        ${draft.isNew ? null : html`
                          <button
                            type="button"
                            className=${`money-status-toggle${draft.completed ? " is-return" : " is-done"}`}
                            onClick=${() => updateDraftSubitem(item.id, { completed: !draft.completed })}
                            disabled=${saving}
                          >${draft.completed ? "Вернуть" : "Сделано"}</button>
                        `}
                        ${itemDirty ? html`
                          <button type="button" className="icon-button money-tab-editor__apply" onClick=${() => applyEditSubitem(group.id, item.id)} disabled=${saving}>✓</button>
                        ` : null}
                        <button type="button" className="icon-button money-tab-editor__cancel" onClick=${() => cancelEditSubitem(item.id)} disabled=${saving}>×</button>
                      </div>
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
                              onClick=${() => updateSubitem(group.id, item.id, {
                                completed: !item.completed,
                                updatedAt: nowISO(),
                                updatedBy: actor,
                              })}
                              disabled=${saving}
                            >${item.completed ? "Вернуть" : "Сделано"}</button>
                          `}
                          <button type="button" className="icon-button money-row__edit" onClick=${() => startEditSubitem(item)} disabled=${saving}>✎</button>
                          <button type="button" className="icon-button money-row__delete" onClick=${() => removeSubitem(group.id, item.id)} disabled=${saving || group.items.length <= 1}>×</button>
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

