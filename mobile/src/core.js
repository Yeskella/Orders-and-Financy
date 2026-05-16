import { createClient } from "@supabase/supabase-js";

export const APP_NAME = "Планирование семьи";
export const DEFAULT_SUPABASE_URL = "https://echazrstskbnoxzxqoms.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_mKHl0igDFDZSndml-XbF4w_pvaO1Rlo";
export const DEFAULT_SUPABASE_BUCKET = "feed-images";
export const LOCAL_USERS = {
  Lesha: "vandal2020",
  Lera: "vandal2021",
};

export const STORAGE_KEYS = {
  theme: "budget-planner-theme",
  view: "budget-planner-view",
  session: "budget-planner-session",
  supabaseUrl: "budget-planner-supabase-url",
  supabaseAnonKey: "budget-planner-supabase-anon-key",
  supabaseBucket: "budget-planner-supabase-bucket",
};

export const VIEWS = [
  { id: "calendar", label: "Календарь", icon: "calendar-outline", iconActive: "calendar" },
  { id: "planner", label: "События", icon: "list-outline", iconActive: "list" },
  { id: "money", label: "Планы", icon: "wallet-outline", iconActive: "wallet" },
  { id: "plans", label: "Лента", icon: "home-outline", iconActive: "home" },
  { id: "settings", label: "Настройки", icon: "settings-outline", iconActive: "settings" },
];

export const THEMES = [
  { id: "light", label: "Светлая" },
  { id: "paper", label: "Мягкая" },
  { id: "dark", label: "Темная" },
];

export const AUTHOR_THEME = {
  Lesha: { bg: "#1eb8c9", tint: "#dff7fa" },
  Lera: { bg: "#5b8def", tint: "#e6efff" },
};

const DEFAULT_META_ROW_ID = "main";
const TABLES = {
  meta: "app_meta",
  planner: "planner_entries",
  posts: "posts",
  comments: "post_comments",
  moneyTabs: "money_tabs",
  moneyGroups: "money_groups",
  moneyItems: "money_items",
  legacy: "app_state",
};

export const DEFAULT_STATE = {
  settings: {
    theme: "light",
    lastSyncedAt: "",
    lastUpdatedBy: "",
    feedSeenBy: {},
  },
  view: "calendar",
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

export const PAYROLL_BY_ROLE = {
  Lesha: 260000,
  Lera: 220000,
};

const RF_2026_EXTRA_NON_WORKING_DAYS = new Set([
  "2026-01-01",
  "2026-01-02",
  "2026-01-03",
  "2026-01-04",
  "2026-01-05",
  "2026-01-06",
  "2026-01-07",
  "2026-01-08",
  "2026-01-09",
  "2026-02-23",
  "2026-03-09",
  "2026-05-01",
  "2026-05-11",
  "2026-06-12",
  "2026-11-04",
  "2026-12-31",
]);

const PLANNER_EVENT_TEXT_PREFIX = "__BFP_EVENT_V2__:";

export const clone = (value) => JSON.parse(JSON.stringify(value));
export const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
export const nowISO = () => new Date().toISOString();
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const toMonthKey = (date) => (date || todayISO()).slice(0, 7);
export const toDateFromIso = (value) => new Date(`${value}T12:00:00`);

export const sanitizeFileName = (value) => String(value || "file").replace(/[^\w.\-]+/g, "_");

export const formatDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
};

export const formatShortDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
};

export const formatMonthTitle = (monthKey) => {
  if (!monthKey) return "";
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
    .format(new Date(`${monthKey}-01T12:00:00`));
};

export const formatTime = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const MOSCOW_TIME_ZONE = "Europe/Moscow";

export const formatMoscowDayKey = (value) => new Intl.DateTimeFormat("en-CA", {
  timeZone: MOSCOW_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date(value));

export const formatClockTimeMsk = (value) => new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: MOSCOW_TIME_ZONE,
}).format(new Date(value));

export const formatFeedTimeMsk = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (formatMoscowDayKey(date) === formatMoscowDayKey(now)) {
    return `сегодня ${formatClockTimeMsk(value)}`;
  }
  if (formatMoscowDayKey(date) === formatMoscowDayKey(yesterday)) {
    return `вчера ${formatClockTimeMsk(value)}`;
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

export const compareDesc = (left, right) => new Date(right).getTime() - new Date(left).getTime();

export const parseMoneyInput = (value) => {
  const normalized = String(value || "").replace(/\s+/g, "").replace(/\u00A0/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoney = (value) => new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

export const pluralizeRu = (value, one, few, many) => {
  const abs = Math.abs(Number(value) || 0);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

export const initials = (value) => {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

export const getAuthorTheme = (author) => AUTHOR_THEME[author] || { bg: "#28aebf", tint: "#def6f7" };

export const getDefaultMoneySubitem = (actor = "") => {
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

export const getDefaultMoneyGroup = (actor = "") => {
  const timestamp = nowISO();
  return {
    id: uid("money-group"),
    title: "",
    items: [],
    createdAt: timestamp,
    createdBy: actor,
    updatedAt: timestamp,
    updatedBy: actor,
  };
};

export const createPlannerDraftRow = (row = {}) => ({
  id: row.id || uid("planner-row"),
  text: String(row.text || ""),
  amount: String(row.amount ?? ""),
});

export const sortPlannerRows = (rows) => [...(Array.isArray(rows) ? rows : [])].sort((left, right) => {
  const amountDiff = parseMoneyInput(right.amount) - parseMoneyInput(left.amount);
  if (amountDiff !== 0) return amountDiff;
  return String(left.text || "").localeCompare(String(right.text || ""), "ru", { sensitivity: "base" });
});

export const getIsoWeekday = (value) => {
  const day = toDateFromIso(value).getDay();
  return day === 0 ? 7 : day;
};

export const isWeekendDay = (value) => {
  const weekday = getIsoWeekday(value);
  return weekday === 6 || weekday === 7;
};

export const daysInMonth = (monthKey) => {
  const [year, month] = String(monthKey).split("-").map(Number);
  return new Date(year, month, 0).getDate();
};

export const monthStart = (monthKey) => `${monthKey}-01`;
export const monthEnd = (monthKey) => `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, "0")}`;

export const shiftIsoDate = (value, days) => {
  const date = toDateFromIso(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const shiftMonthKey = (monthKey, delta) => {
  const date = toDateFromIso(`${monthKey}-01`);
  date.setMonth(date.getMonth() + delta);
  return date.toISOString().slice(0, 7);
};

export const isRfNonWorkingDay = (value) => {
  if (!value) return false;
  if (isWeekendDay(value)) return true;
  if (String(value).startsWith("2026-")) {
    return RF_2026_EXTRA_NON_WORKING_DAYS.has(value);
  }
  return false;
};

export const moveToPreviousWorkingDay = (value) => {
  let current = value;
  while (isRfNonWorkingDay(current)) {
    current = shiftIsoDate(current, -1);
  }
  return current;
};

export const getWorkingDaysCount = (start, end) => {
  if (!start || !end || start > end) return 0;
  let current = start;
  let count = 0;
  while (current <= end) {
    if (!isRfNonWorkingDay(current)) {
      count += 1;
    }
    current = shiftIsoDate(current, 1);
  }
  return count;
};

export const getPayrollMonthBreakdown = (role, monthKey) => {
  const salary = PAYROLL_BY_ROLE[role];
  if (!salary || !monthKey) return null;

  const monthFirstDay = monthStart(monthKey);
  const monthLastDay = monthEnd(monthKey);
  const firstHalfLastDay = `${monthKey}-15`;
  const workingDaysInMonth = getWorkingDaysCount(monthFirstDay, monthLastDay);
  const firstHalfWorkingDays = getWorkingDaysCount(monthFirstDay, firstHalfLastDay);
  if (!workingDaysInMonth) return null;

  const dayRate = salary / workingDaysInMonth;
  const advance = Math.round(dayRate * firstHalfWorkingDays * 100) / 100;
  const settlement = Math.round((salary - advance) * 100) / 100;

  return {
    role,
    monthKey,
    salary,
    workingDaysInMonth,
    firstHalfWorkingDays,
    advance,
    settlement,
    advanceDate: moveToPreviousWorkingDay(firstHalfLastDay),
    settlementDate: moveToPreviousWorkingDay(monthLastDay),
  };
};

export const getNearestPayroll = (role, today = todayISO()) => {
  const currentMonth = toMonthKey(today);
  const nextMonth = shiftMonthKey(currentMonth, 1);
  const breakdowns = [getPayrollMonthBreakdown(role, currentMonth), getPayrollMonthBreakdown(role, nextMonth)].filter(Boolean);
  const candidates = breakdowns.flatMap((item) => ([
    {
      kind: "advance",
      label: "Аванс",
      amount: item.advance,
      date: item.advanceDate,
      monthKey: item.monthKey,
    },
    {
      kind: "settlement",
      label: "Расчет",
      amount: item.settlement,
      date: item.settlementDate,
      monthKey: item.monthKey,
    },
  ]))
    .filter((item) => item.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date));

  return candidates[0] || null;
};

export const normalizeEntry = (entry, prefix) => ({
  id: entry?.id || uid(prefix),
  date: entry?.date || "",
  text: entry?.text || "",
  amount: entry?.amount ?? "",
  repeatMonthly: Boolean(entry?.repeatMonthly),
  repeatWeekly: Boolean(entry?.repeatWeekly),
  repeatYearly: Boolean(entry?.repeatYearly),
  createdAt: entry?.createdAt || entry?.updatedAt || "",
  createdBy: entry?.createdBy || "",
  updatedAt: entry?.updatedAt || "",
  updatedBy: entry?.updatedBy || "",
});

export const normalizeComment = (comment) => ({
  id: comment?.id || uid("comment"),
  author: comment?.author || comment?.createdBy || "Lesha",
  text: comment?.text || "",
  parentId: comment?.parentId || "",
  createdAt: comment?.createdAt || nowISO(),
  createdBy: comment?.createdBy || comment?.author || "",
  updatedAt: comment?.updatedAt || comment?.createdAt || "",
  updatedBy: comment?.updatedBy || comment?.createdBy || comment?.author || "",
});

export const normalizePost = (post) => ({
  id: post?.id || uid("post"),
  author: post?.author || post?.createdBy || "Lesha",
  text: post?.text || "",
  images: Array.isArray(post?.images) ? post.images : [],
  pinned: Boolean(post?.pinned),
  archived: Boolean(post?.archived),
  createdAt: post?.createdAt || nowISO(),
  createdBy: post?.createdBy || post?.author || "",
  updatedAt: post?.updatedAt || post?.createdAt || "",
  updatedBy: post?.updatedBy || post?.createdBy || post?.author || "",
  startDate: post?.startDate || "",
  endDate: post?.endDate || post?.startDate || "",
  comments: Array.isArray(post?.comments) ? post.comments.map((comment) => normalizeComment(comment)) : [],
});

export const normalizeMoneySubitem = (row) => ({
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

export const sortMoneySubitems = (items) => [...(items || [])].sort((left, right) => {
  const completedDiff = Number(Boolean(left.completed)) - Number(Boolean(right.completed));
  if (completedDiff !== 0) return completedDiff;
  const amountDiff = parseMoneyInput(right.cost) - parseMoneyInput(left.cost);
  if (amountDiff !== 0) return amountDiff;
  return String(left.name || "").localeCompare(String(right.name || ""), "ru", { sensitivity: "base" });
});

export const normalizeMoneyGroup = (group) => ({
  id: group?.id || uid("money-group"),
  title: group?.title || group?.name || "",
  items: Array.isArray(group?.items) ? group.items.map((item) => normalizeMoneySubitem(item)) : [],
  createdAt: group?.createdAt || group?.updatedAt || "",
  createdBy: group?.createdBy || "",
  updatedAt: group?.updatedAt || "",
  updatedBy: group?.updatedBy || "",
});

export const normalizeMoneyTab = (tab) => ({
  id: tab?.id || uid("money-tab"),
  title: tab?.title || "Планы",
  groups: Array.isArray(tab?.groups)
    ? tab.groups.map((group) => normalizeMoneyGroup(group))
    : [],
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
    amount: "",
    repeatMonthly: false,
    repeatWeekly: false,
    repeatYearly: false,
    updatedAt: legacyNote.updatedAt || "",
  }, prefix)];
};

export const validateView = (view, customTabs) => {
  const valid = new Set(VIEWS.map((item) => item.id));
  if (valid.has(view)) return view;
  if (customTabs?.length) return "calendar";
  return "calendar";
};

export const getFeedSeenBy = (settings) => (
  settings?.feedSeenBy && typeof settings.feedSeenBy === "object" && !Array.isArray(settings.feedSeenBy)
    ? settings.feedSeenBy
    : {}
);

export const mergeFeedSeenBy = (current, incoming) => {
  const left = getFeedSeenBy({ feedSeenBy: current });
  const right = getFeedSeenBy({ feedSeenBy: incoming });
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const merged = {};
  keys.forEach((key) => {
    const leftValue = String(left[key] || "");
    const rightValue = String(right[key] || "");
    if (!leftValue) merged[key] = rightValue;
    else if (!rightValue) merged[key] = leftValue;
    else {
      merged[key] = new Date(leftValue).getTime() >= new Date(rightValue).getTime() ? leftValue : rightValue;
    }
  });
  return merged;
};

export const normalizeState = (payload = {}) => {
  const customTabs = Array.isArray(payload.customTabs)
    ? payload.customTabs.map((tab) => normalizeMoneyTab(tab))
    : [];
  const nextView = validateView(payload.view || DEFAULT_STATE.view, customTabs);
  return {
    settings: {
      theme: payload.settings?.theme || DEFAULT_STATE.settings.theme,
      lastSyncedAt: payload.settings?.lastSyncedAt || "",
      lastUpdatedBy: payload.settings?.lastUpdatedBy || "",
      feedSeenBy: payload.settings?.feedSeenBy && typeof payload.settings.feedSeenBy === "object"
        ? payload.settings.feedSeenBy
        : {},
    },
    view: nextView,
    calendarMonth: payload.calendarMonth || "",
    plannerSelectedDate: payload.plannerSelectedDate || "",
    dogsSelectedDate: payload.dogsSelectedDate || "",
    moneyActiveTabId: payload.moneyActiveTabId || customTabs[0]?.id || "",
    feedFilters: {
      search: payload.feedFilters?.search || "",
      mode: payload.feedFilters?.mode || "active",
    },
    plannerEntries: Array.isArray(payload.plannerEntries)
      ? payload.plannerEntries.map((entry) => normalizeEntry(entry, "planner"))
      : convertLegacyNote(payload.planner, "planner"),
    dogsEntries: Array.isArray(payload.dogsEntries)
      ? payload.dogsEntries.map((entry) => normalizeEntry(entry, "dogs"))
      : convertLegacyNote(payload.dogs, "dogs"),
    posts: Array.isArray(payload.posts) ? payload.posts.map((post) => normalizePost(post)) : [],
    customTabs,
  };
};

export const mergeStatePatch = (current, patch = {}) => normalizeState({
  settings: Object.prototype.hasOwnProperty.call(patch, "settings")
    ? {
      ...current.settings,
      ...patch.settings,
      feedSeenBy: mergeFeedSeenBy(current.settings?.feedSeenBy, patch.settings?.feedSeenBy),
    }
    : current.settings,
  view: Object.prototype.hasOwnProperty.call(patch, "view") ? patch.view : current.view,
  calendarMonth: Object.prototype.hasOwnProperty.call(patch, "calendarMonth") ? patch.calendarMonth : current.calendarMonth,
  plannerSelectedDate: Object.prototype.hasOwnProperty.call(patch, "plannerSelectedDate") ? patch.plannerSelectedDate : current.plannerSelectedDate,
  dogsSelectedDate: Object.prototype.hasOwnProperty.call(patch, "dogsSelectedDate") ? patch.dogsSelectedDate : current.dogsSelectedDate,
  moneyActiveTabId: Object.prototype.hasOwnProperty.call(patch, "moneyActiveTabId") ? patch.moneyActiveTabId : current.moneyActiveTabId,
  feedFilters: Object.prototype.hasOwnProperty.call(patch, "feedFilters") ? patch.feedFilters : current.feedFilters,
  plannerEntries: Object.prototype.hasOwnProperty.call(patch, "plannerEntries") ? patch.plannerEntries : current.plannerEntries,
  dogsEntries: Object.prototype.hasOwnProperty.call(patch, "dogsEntries") ? patch.dogsEntries : current.dogsEntries,
  posts: Object.prototype.hasOwnProperty.call(patch, "posts") ? patch.posts : current.posts,
  customTabs: Object.prototype.hasOwnProperty.call(patch, "customTabs") ? patch.customTabs : current.customTabs,
});

export const parsePlannerEntryRows = (entry) => {
  if (!entry) return [];
  const rawText = String(entry.text || "");
  if (rawText.startsWith(PLANNER_EVENT_TEXT_PREFIX)) {
    try {
      const parsed = JSON.parse(rawText.slice(PLANNER_EVENT_TEXT_PREFIX.length));
      const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
      return sortPlannerRows(rows.map((row) => createPlannerDraftRow(row)).filter((row) => String(row.text || "").trim()));
    } catch (_) {
      return [createPlannerDraftRow({
        id: `${entry.id || "planner"}-broken`,
        text: rawText.slice(PLANNER_EVENT_TEXT_PREFIX.length),
        amount: entry.amount ?? "",
      })];
    }
  }
  if (!String(entry.text || "").trim()) return [];
  return [createPlannerDraftRow({
    id: `${entry.id || "planner"}-legacy`,
    text: entry.text || "",
    amount: entry.amount ?? "",
  })];
};

export const getPlannerRowsTotal = (rows) => sortPlannerRows(rows).reduce((total, row) => total + parseMoneyInput(row.amount), 0);

export const buildPlannerEntryPayload = (rows) => {
  const prepared = sortPlannerRows(
    (Array.isArray(rows) ? rows : [])
      .map((row) => ({
        text: String(row.text || "").trim(),
        amount: String(row.amount ?? "").trim(),
      }))
      .filter((row) => row.text)
  );
  if (!prepared.length) {
    return { text: "", amount: "" };
  }
  if (prepared.length === 1) {
    return { text: prepared[0].text, amount: prepared[0].amount };
  }
  return {
    text: `${PLANNER_EVENT_TEXT_PREFIX}${JSON.stringify({ rows: prepared })}`,
    amount: String(getPlannerRowsTotal(prepared)),
  };
};

export const getPlannerEntryRows = (entry) => parsePlannerEntryRows(entry);
export const getPlannerEntryTotal = (entry) => getPlannerRowsTotal(getPlannerEntryRows(entry));
export const getPlannerEntryPrimaryText = (entry) => {
  const rows = getPlannerEntryRows(entry);
  if (!rows.length) return String(entry?.text || "").trim() || "Событие";
  const primary = rows[0];
  return rows.length > 1 ? `${primary.text} +${rows.length - 1}` : primary.text;
};

export const actorStamp = (actor, at) => {
  if (!actor && !at) return "";
  return [actor, at ? formatTime(at) : ""].filter(Boolean).join(" • ");
};

export const dateMatchesEntry = (entry, date) => {
  if (!entry?.date || !date) return false;
  if (entry.repeatWeekly) {
    return new Date(`${entry.date}T12:00:00`).getDay() === new Date(`${date}T12:00:00`).getDay();
  }
  if (entry.repeatMonthly) {
    return entry.date.slice(8, 10) === date.slice(8, 10);
  }
  if (entry.repeatYearly) {
    return entry.date.slice(5, 10) === date.slice(5, 10);
  }
  return entry.date === date;
};

export const upsertEntry = (entries, nextEntry) => {
  const next = entries.filter((entry) => entry.id !== nextEntry.id);
  next.push(nextEntry);
  return next.sort((left, right) => compareDesc(left.updatedAt || left.date, right.updatedAt || right.date));
};

export const sortedPosts = (posts, filters) => {
  const search = String(filters?.search || "").trim().toLowerCase();
  const filtered = (posts || []).filter((post) => {
    if (filters?.mode === "archived" && !post.archived) return false;
    if ((filters?.mode || "active") === "active" && post.archived) return false;
    if (!search) return true;
    const commentText = (post.comments || []).map((comment) => `${comment.author} ${comment.text}`).join(" ");
    return `${post.author} ${post.text} ${commentText}`.toLowerCase().includes(search);
  });
  const ordered = filtered.sort((left, right) => compareDesc(left.createdAt, right.createdAt));
  const pinned = ordered.filter((post) => post.pinned && !post.archived);
  const regular = ordered.filter((post) => !post.pinned);
  return (filters?.mode || "active") === "archived" ? regular : [...pinned, ...regular];
};

export const getFeedSeenAt = (settings, actor) => (actor ? String(getFeedSeenBy(settings)[actor] || "") : "");
export const isPostOwnedByActor = (post, actor) => (post?.createdBy || post?.author || "") === (actor || "");
export const getPostFreshStamp = (post) => post?.updatedAt || post?.createdAt || "";

export const isPostUnreadForActor = (post, actor, settings) => {
  if (!actor || !post || post.archived || isPostOwnedByActor(post, actor)) return false;
  const stamp = getPostFreshStamp(post);
  if (!stamp) return false;
  const seenAt = getFeedSeenAt(settings, actor);
  if (!seenAt) return true;
  return new Date(stamp).getTime() > new Date(seenAt).getTime();
};

export const getUnreadPostsForActor = (posts, actor, settings) => (posts || []).filter((post) => isPostUnreadForActor(post, actor, settings));

const inRange = (date, start, end) => date >= start && date <= end;

export const collectEventsForDate = (state, date) => {
  const items = [];
  sortPlannerRows((state.plannerEntries || []).map((entry) => ({
    ...entry,
    amount: getPlannerEntryTotal(entry),
    text: getPlannerEntryPrimaryText(entry),
  }))).forEach((entry) => {
    const sourceEntry = (state.plannerEntries || []).find((candidate) => candidate.id === entry.id);
    if (!sourceEntry) return;
    if (dateMatchesEntry(entry, date)) {
      items.push({
        id: `${sourceEntry.id}-${date}`,
        countKey: `${sourceEntry.id}-${date}`,
        sourceId: sourceEntry.id,
        type: "planner",
        label: "Событие",
        text: getPlannerEntryPrimaryText(sourceEntry),
        entry: sourceEntry,
      });
    }
  });
  (state.posts || []).forEach((post) => {
    const start = post.startDate || "";
    const end = post.endDate || start;
    if (start && end && inRange(date, start, end)) {
      items.push({
        id: `${post.id}-${date}`,
        countKey: post.id,
        sourceId: post.id,
        type: "post",
        label: "Лента",
        text: post.text || "Публикация",
        post,
      });
    }
  });
  return items.sort((left, right) => {
    if (left.type === "planner" && right.type === "planner") {
      return getPlannerEntryTotal(right.entry) - getPlannerEntryTotal(left.entry);
    }
    if (left.type === "planner") return -1;
    if (right.type === "planner") return 1;
    return compareDesc(left.post?.updatedAt || left.post?.createdAt || "", right.post?.updatedAt || right.post?.createdAt || "");
  });
};

export const previewEventsForDate = (state, date) => collectEventsForDate(state, date).slice(0, 2).map((item) => ({
  id: item.id,
  type: item.type,
  label: item.type === "planner" && item.entry?.amount
    ? `${getPlannerEntryPrimaryText(item.entry)} • ${formatMoney(getPlannerEntryTotal(item.entry))}`
    : (String(item.text || item.label).split("\n")[0].trim() || item.label),
}));

export const monthMatrix = (monthKey) => {
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

export const getImageLabel = (image, fallback = "Изображение") => {
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

export const imageSrc = (image) => {
  if (!image) return "";
  if (image.publicUrl) return image.publicUrl;
  if (image.uri) return image.uri;
  return "";
};

export const sameImageRef = (left, right) => {
  if (!left || !right) return false;
  if (left.path && right.path) return left.path === right.path;
  if (left.publicUrl && right.publicUrl) return left.publicUrl === right.publicUrl;
  if (left.fileName && right.fileName) return left.fileName === right.fileName;
  if (left.uri && right.uri) return left.uri === right.uri;
  return false;
};

export const loginLocal = (role, password) => {
  if (LOCAL_USERS[role] === password) {
    return { role };
  }
  throw new Error("Неверная роль или пароль");
};

export const createStore = ({ url = DEFAULT_SUPABASE_URL, anonKey = DEFAULT_SUPABASE_ANON_KEY, bucket = DEFAULT_SUPABASE_BUCKET } = {}) => {
  if (!url || !anonKey || !bucket) {
    throw new Error("Supabase не настроен");
  }
  return {
    client: createClient(url, anonKey),
    bucket,
    tables: TABLES,
    metaRowId: DEFAULT_META_ROW_ID,
  };
};

export const SUPABASE_SCHEMA_MESSAGE = "Нужно обновить схему Supabase. Выполните SQL из файла supabase/relational_state.sql.";

const isMissingSupabaseTableError = (error) => {
  const message = String(error?.message || "");
  return error?.code === "42P01"
    || error?.code === "42703"
    || /does not exist/i.test(message)
    || /Could not find the table/i.test(message)
    || /Could not find the .* column/i.test(message)
    || /schema cache/i.test(message);
};

const assertSupabaseResult = (result, missingMessage = SUPABASE_SCHEMA_MESSAGE) => {
  if (!result?.error) {
    return result.data;
  }
  if (isMissingSupabaseTableError(result.error)) {
    throw new Error(missingMessage);
  }
  throw new Error(result.error.message || "Supabase request failed");
};

const SUPABASE_QUERY_TIMEOUT_MS = 15000;
const SUPABASE_QUERY_RETRIES = 2;

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const isRetryableSupabaseError = (error) => {
  const message = String(error?.message || error || "");
  return error?.name === "AbortError"
    || /timeout/i.test(message)
    || /aborted/i.test(message)
    || /network/i.test(message)
    || /fetch failed/i.test(message)
    || /failed to fetch/i.test(message);
};

const withQueryTimeout = async (queryFactory, name, timeoutMs = SUPABASE_QUERY_TIMEOUT_MS) => {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (controller) {
        controller.abort();
      }
      reject(new Error(`Supabase request timeout: ${name}`));
    }, timeoutMs);
  });

  try {
    const query = queryFactory(controller?.signal);
    const queryPromise = Promise.resolve(query);
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Supabase request timeout: ${name}`);
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const attachAbortSignal = (query, signal) => {
  if (signal && query && typeof query.abortSignal === "function") {
    return query.abortSignal(signal);
  }
  return query;
};

const runSupabaseQuery = async (name, queryFactory, options = {}) => {
  const timeoutMs = options.timeoutMs || SUPABASE_QUERY_TIMEOUT_MS;
  const retries = Number.isFinite(options.retries) ? options.retries : SUPABASE_QUERY_RETRIES;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withQueryTimeout(
        (signal) => attachAbortSignal(queryFactory(), signal),
        `${name}${attempt ? ` retry ${attempt}` : ""}`,
        timeoutMs,
      );
    } catch (error) {
      lastError = error;
      if (!isRetryableSupabaseError(error) || attempt >= retries) {
        throw error;
      }
      await delay(350 * (attempt + 1));
    }
  }

  throw lastError || new Error(`Supabase request failed: ${name}`);
};

const sortByPosition = (left, right) => {
  const leftPosition = Number.isFinite(left?.position) ? left.position : 0;
  const rightPosition = Number.isFinite(right?.position) ? right.position : 0;
  return leftPosition - rightPosition;
};

const hasMeaningfulMeta = (meta) => Boolean(
  meta
  && (
    (meta.settings && Object.keys(meta.settings).length)
    || meta.view !== DEFAULT_STATE.view
    || meta.calendar_month
    || meta.planner_selected_date
    || meta.dogs_selected_date
    || meta.money_active_tab_id
    || (meta.feed_filters && (meta.feed_filters.search || meta.feed_filters.mode !== DEFAULT_STATE.feedFilters.mode))
  )
);

const fetchLegacySupabaseJsonState = async (store) => {
  const { data, error } = await runSupabaseQuery("legacy_app_state", () => (
    store.client
      .from(store.tables.legacy)
      .select("payload")
      .eq("id", store.metaRowId)
      .maybeSingle()
  ));

  if (error) {
    if (isMissingSupabaseTableError(error)) {
      return null;
    }
    throw error;
  }
  return data?.payload ? normalizeState(data.payload) : null;
};

const upsertRows = async (client, table, rows) => {
  if (!rows.length) return;
  const { error } = await runSupabaseQuery(`${table}_upsert`, () => (
    client.from(table).upsert(rows, { onConflict: "id" })
  ));
  if (error) throw error;
};

const deleteMissingRows = async (client, table, activeIds) => {
  const { data, error } = await runSupabaseQuery(`${table}_select_missing`, () => (
    client.from(table).select("id")
  ));
  if (error) throw error;
  const active = new Set(activeIds);
  const missingIds = (data || []).map((row) => row.id).filter((id) => !active.has(id));
  if (!missingIds.length) return;
  const { error: deleteError } = await runSupabaseQuery(`${table}_delete_missing`, () => (
    client.from(table).delete().in("id", missingIds)
  ));
  if (deleteError) throw deleteError;
};

export const ensureRemoteStateReady = async (store) => {
  const [metaResult, plannerResult, postsResult, tabsResult] = await Promise.all([
    runSupabaseQuery("app_meta_ready", () => (
      store.client.from(store.tables.meta).select("*").eq("id", store.metaRowId).maybeSingle()
    )),
    runSupabaseQuery("planner_entries_ready", () => (
      store.client.from(store.tables.planner).select("id", { count: "exact", head: true })
    )),
    runSupabaseQuery("posts_ready", () => (
      store.client.from(store.tables.posts).select("id", { count: "exact", head: true })
    )),
    runSupabaseQuery("money_tabs_ready", () => (
      store.client.from(store.tables.moneyTabs).select("id", { count: "exact", head: true })
    )),
  ]);

  const results = [metaResult, plannerResult, postsResult, tabsResult];
  const missingResult = results.find((result) => result.error && isMissingSupabaseTableError(result.error));
  if (missingResult) {
    throw new Error(SUPABASE_SCHEMA_MESSAGE);
  }
  const failedResult = results.find((result) => result.error);
  if (failedResult) {
    throw new Error(failedResult.error.message || "Supabase request failed");
  }

  const hasData = hasMeaningfulMeta(metaResult.data)
    || Number(plannerResult.count || 0) > 0
    || Number(postsResult.count || 0) > 0
    || Number(tabsResult.count || 0) > 0;

  if (hasData) return;

  const legacyState = await fetchLegacySupabaseJsonState(store);
  await saveAppState(store, legacyState || normalizeState(DEFAULT_STATE));
};

export const fetchAppState = async (store) => {
  const [
    metaResult,
    plannerResult,
    postsResult,
    commentsResult,
    tabsResult,
    groupsResult,
    itemsResult,
  ] = await Promise.all([
    runSupabaseQuery("app_meta", () => (
      store.client.from(store.tables.meta).select("*").eq("id", store.metaRowId).maybeSingle()
    )),
    runSupabaseQuery("planner_entries", () => (
      store.client.from(store.tables.planner).select("*").order("updated_at", { ascending: false })
    )),
    runSupabaseQuery("posts", () => (
      store.client.from(store.tables.posts).select("*").order("created_at", { ascending: false })
    )),
    runSupabaseQuery("post_comments", () => (
      store.client.from(store.tables.comments).select("*").order("created_at", { ascending: true })
    )),
    runSupabaseQuery("money_tabs", () => (
      store.client.from(store.tables.moneyTabs).select("*").order("position", { ascending: true })
    )),
    runSupabaseQuery("money_groups", () => (
      store.client.from(store.tables.moneyGroups).select("*").order("position", { ascending: true })
    )),
    runSupabaseQuery("money_items", () => (
      store.client.from(store.tables.moneyItems).select("*").order("position", { ascending: true })
    )),
  ]);
  const meta = assertSupabaseResult(metaResult);
  const plannerRows = assertSupabaseResult(plannerResult);
  const postRows = assertSupabaseResult(postsResult);
  const commentRows = assertSupabaseResult(commentsResult);
  const tabRows = assertSupabaseResult(tabsResult);
  const groupRows = assertSupabaseResult(groupsResult);
  const itemRows = assertSupabaseResult(itemsResult);

  const commentsByPostId = new Map();
  (commentRows || []).forEach((comment) => {
    const list = commentsByPostId.get(comment.post_id) || [];
    list.push({
      id: comment.id,
      author: comment.author || comment.created_by || "Lesha",
      text: comment.text || "",
      parentId: comment.parent_id || "",
      createdAt: comment.created_at || "",
      createdBy: comment.created_by || comment.author || "",
      updatedAt: comment.updated_at || comment.created_at || "",
      updatedBy: comment.updated_by || comment.created_by || comment.author || "",
    });
    commentsByPostId.set(comment.post_id, list);
  });

  const itemsByGroupId = new Map();
  (itemRows || []).forEach((item) => {
    const list = itemsByGroupId.get(item.group_id) || [];
    list.push({
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
    itemsByGroupId.set(item.group_id, list);
  });

  const groupsByTabId = new Map();
  (groupRows || []).forEach((group) => {
    const list = groupsByTabId.get(group.tab_id) || [];
    list.push({
      id: group.id,
      title: group.title || "",
      items: (itemsByGroupId.get(group.id) || []).sort(sortByPosition),
      createdAt: group.created_at || "",
      createdBy: group.created_by || "",
      updatedAt: group.updated_at || "",
      updatedBy: group.updated_by || "",
      position: group.position || 0,
    });
    groupsByTabId.set(group.tab_id, list);
  });

  return normalizeState({
    settings: meta?.settings || DEFAULT_STATE.settings,
    view: meta?.view || DEFAULT_STATE.view,
    calendarMonth: meta?.calendar_month || "",
    plannerSelectedDate: meta?.planner_selected_date || "",
    dogsSelectedDate: meta?.dogs_selected_date || "",
    moneyActiveTabId: meta?.money_active_tab_id || "",
    feedFilters: meta?.feed_filters || DEFAULT_STATE.feedFilters,
    plannerEntries: (plannerRows || []).map((entry) => ({
      id: entry.id,
      date: entry.date || "",
      text: entry.text || "",
      amount: entry.amount ?? "",
      repeatMonthly: Boolean(entry.repeat_monthly),
      repeatWeekly: Boolean(entry.repeat_weekly),
      repeatYearly: Boolean(entry.repeat_yearly),
      createdAt: entry.created_at || "",
      createdBy: entry.created_by || "",
      updatedAt: entry.updated_at || "",
      updatedBy: entry.updated_by || "",
    })),
    posts: (postRows || []).map((post) => ({
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
    customTabs: (tabRows || []).map((tab) => ({
      id: tab.id,
      title: tab.title || "",
      groups: (groupsByTabId.get(tab.id) || []).sort(sortByPosition),
      createdAt: tab.created_at || "",
      createdBy: tab.created_by || "",
      updatedAt: tab.updated_at || "",
      updatedBy: tab.updated_by || "",
      position: tab.position || 0,
    })),
  });
};

export const saveAppState = async (store, payload) => {
  const state = normalizeState(payload);
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
    amount: entry.amount ?? "",
    repeat_monthly: Boolean(entry.repeatMonthly),
    repeat_weekly: Boolean(entry.repeatWeekly),
    repeat_yearly: Boolean(entry.repeatYearly),
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

  const { error: metaError } = await runSupabaseQuery("app_meta_upsert", () => (
    client.from(store.tables.meta).upsert(metaRow, { onConflict: "id" })
  ));
  if (metaError) {
    if (isMissingSupabaseTableError(metaError)) throw new Error(SUPABASE_SCHEMA_MESSAGE);
    throw new Error(metaError.message || "Не удалось обновить данные в Supabase");
  }

  try {
    await upsertRows(client, store.tables.planner, plannerRows);
    await upsertRows(client, store.tables.posts, postRows);
    await upsertRows(client, store.tables.comments, commentRows);
    await upsertRows(client, store.tables.moneyTabs, tabRows);
    await upsertRows(client, store.tables.moneyGroups, groupRows);
    await upsertRows(client, store.tables.moneyItems, itemRows);

    await deleteMissingRows(client, store.tables.comments, commentRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.posts, postRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.planner, plannerRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.moneyItems, itemRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.moneyGroups, groupRows.map((row) => row.id));
    await deleteMissingRows(client, store.tables.moneyTabs, tabRows.map((row) => row.id));
  } catch (error) {
    if (isMissingSupabaseTableError(error)) throw new Error(SUPABASE_SCHEMA_MESSAGE);
    throw new Error(error.message || "Не удалось сохранить данные в Supabase");
  }

  return { ok: true };
};

export const uploadAssets = async (store, assets) => {
  const list = Array.isArray(assets) ? assets : [];
  const uploaded = [];
  for (const asset of list) {
    if (!asset?.uri) continue;
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const fileName = sanitizeFileName(asset.fileName || `image-${Date.now()}.jpg`);
    const filePath = `posts/${uid("image")}-${fileName}`;
    const contentType = asset.mimeType || blob.type || "image/jpeg";
    const { error: uploadError } = await store.client.storage.from(store.bucket).upload(filePath, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });
    if (uploadError) {
      throw new Error(uploadError.message || "Не удалось загрузить изображение в Supabase");
    }
    const { data } = store.client.storage.from(store.bucket).getPublicUrl(filePath);
    uploaded.push({
      type: "supabase",
      path: filePath,
      fileName,
      mimeType: contentType,
      publicUrl: data.publicUrl,
    });
  }
  return uploaded;
};

export const deleteImages = async (store, images) => {
  const paths = (Array.isArray(images) ? images : []).filter((image) => image?.path).map((image) => image.path);
  if (!paths.length) return;
  const { error } = await store.client.storage.from(store.bucket).remove(paths);
  if (error) {
    throw new Error(error.message || "Не удалось удалить изображения из Supabase");
  }
};
