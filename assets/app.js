import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHR1TZP8doS1WXuZlsQ5-d2DybpfAPBbYtzOblXp_VDMO2aIIOBiEofUacjLeF2TFFNg/exec";
const THEME_STORAGE_KEY = "budget-planner-theme";
const NAV_ITEMS = [
  { id: "planner", label: "Планировщик трат" },
  { id: "plans", label: "Лента" },
  { id: "dogs", label: "Собаки" },
  { id: "calendar", label: "Календарь" },
  { id: "ai", label: "ИИ-анализ" },
];
const THEMES = [
  { id: "light", label: "Светлая" },
  { id: "paper", label: "Мягкая" },
  { id: "dark", label: "Тёмная" },
];
const EMOJIS = ["😊", "🙂", "😌", "🤍", "📌", "📅", "🐶", "💸", "✨", "🔥"];
const AI_ENDPOINTS = {
  deepseek: "https://api.deepseek.com/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
};
const DEFAULT_STATE = {
  settings: { theme: "light", lastSyncedAt: "" },
  view: "planner",
  calendarMonth: "",
  plannerSelectedDate: "",
  dogsSelectedDate: "",
  feedFilters: { search: "", mode: "active" },
  plannerEntries: [],
  dogsEntries: [],
  posts: [],
  ai: {
    provider: "deepseek",
    model: "deepseek-chat",
    prompt: "",
    csvText: "",
    analysisResult: "",
    categoryMappings: [],
    lastRunAt: "",
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
const getStoredTheme = () => window.localStorage.getItem(THEME_STORAGE_KEY) || "light";
const setStoredTheme = (theme) => window.localStorage.setItem(THEME_STORAGE_KEY, theme);
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
const routeToView = (hash) => NAV_ITEMS.find((item) => `#/${item.id}` === hash)?.id || "planner";
const toHash = (view) => `#/${view}`;
const toMonthKey = (date) => (date || todayISO()).slice(0, 7);
const formatDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
};
const formatShortDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
};
const formatTime = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
};
const compareDesc = (a, b) => new Date(b).getTime() - new Date(a).getTime();
const normalizeState = (payload = {}) => ({
  settings: {
    theme: payload.settings?.theme || DEFAULT_STATE.settings.theme,
    lastSyncedAt: payload.settings?.lastSyncedAt || "",
  },
  view: payload.view || DEFAULT_STATE.view,
  calendarMonth: payload.calendarMonth || "",
  plannerSelectedDate: payload.plannerSelectedDate || "",
  dogsSelectedDate: payload.dogsSelectedDate || "",
  feedFilters: {
    search: payload.feedFilters?.search || "",
    mode: payload.feedFilters?.mode || (payload.feedFilters?.showArchived ? "archived" : "active"),
  },
  plannerEntries: Array.isArray(payload.plannerEntries) ? payload.plannerEntries.map((entry) => ({
    id: entry.id || uid("planner"),
    date: entry.date || "",
    text: entry.text || "",
    repeatMonthly: Boolean(entry.repeatMonthly),
    updatedAt: entry.updatedAt || "",
  })) : [],
  dogsEntries: Array.isArray(payload.dogsEntries) ? payload.dogsEntries.map((entry) => ({
    id: entry.id || uid("dogs"),
    date: entry.date || "",
    text: entry.text || "",
    repeatMonthly: Boolean(entry.repeatMonthly),
    updatedAt: entry.updatedAt || "",
  })) : [],
  posts: Array.isArray(payload.posts) ? payload.posts.map((post) => ({
    id: post.id || uid("post"),
    author: post.author || "Лёша",
    text: post.text || "",
    images: Array.isArray(post.images) ? post.images : (post.image ? [post.image] : []),
    pinned: Boolean(post.pinned),
    archived: Boolean(post.archived),
    createdAt: post.createdAt || nowISO(),
    startDate: post.startDate || (post.createdAt ? post.createdAt.slice(0, 10) : todayISO()),
    endDate: post.endDate || post.startDate || (post.createdAt ? post.createdAt.slice(0, 10) : todayISO()),
  })) : [],
  ai: {
    provider: payload.ai?.provider || DEFAULT_STATE.ai.provider,
    model: payload.ai?.model || DEFAULT_STATE.ai.model,
    prompt: payload.ai?.prompt || "",
    csvText: payload.ai?.csvText || "",
    analysisResult: payload.ai?.analysisResult || "",
    categoryMappings: Array.isArray(payload.ai?.categoryMappings) ? payload.ai.categoryMappings : [],
    lastRunAt: payload.ai?.lastRunAt || "",
  },
});
const readTextFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
  reader.readAsText(file, "utf-8");
});
const readArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
  reader.readAsArrayBuffer(file);
});
const scoreDecodedCsv = (text) => {
  const header = String(text || "").split(/\r?\n/, 1)[0] || "";
  const keywords = [
    "\u0414\u0430\u0442\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438",
    "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f",
    "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    "\u0421\u0443\u043c\u043c\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438",
    "\u0412\u0430\u043b\u044e\u0442\u0430 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438",
  ];
  const keywordScore = keywords.reduce((score, keyword) => score + (header.includes(keyword) ? 2 : 0), 0);
  const mojibakePenalty = /Р.|С.|Ѓ|ђ|ё|�/.test(header) ? -4 : 0;
  const delimiterScore = (header.match(/;/g) || []).length > 5 ? 1 : 0;
  return keywordScore + delimiterScore + mojibakePenalty;
};
const readCsvFile = async (file) => {
  const buffer = await readArrayBuffer(file);
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  let cp1251 = utf8;
  try {
    cp1251 = new TextDecoder("windows-1251", { fatal: false }).decode(buffer);
  } catch (error) {
    cp1251 = utf8;
  }
  return scoreDecodedCsv(cp1251) >= scoreDecodedCsv(utf8) ? cp1251 : utf8;
};
const readBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
  reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
  reader.readAsDataURL(file);
});
const resizeImageFile = (file, maxSide = 1400, quality = 0.84) => new Promise((resolve, reject) => {
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
const detectDelimiter = (text) => {
  const head = String(text || "").split(/\r?\n/, 1)[0] || "";
  const semicolonCount = (head.match(/;/g) || []).length;
  const commaCount = (head.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
};
const parseCsv = (text) => {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"") {
      if (quoted && next === "\"") {
        value += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => String(cell || "").trim()));
};
const parseAmount = (value) => {
  const normalized = String(value || "")
    .replace(/\s+/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeCategoryName = (value) => String(value || "")
  .replace(/\s+/g, " ")
  .replace(/\u00A0/g, " ")
  .trim();
const normalizeKey = (value) => normalizeCategoryName(value).toLowerCase();
const parseOperationDate = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) return 0;
  const [, day, month, year, hours = "00", minutes = "00", seconds = "00"] = match;
  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`).getTime();
};
const buildCardLabel = (value) => {
  const text = String(value || "").trim();
  if (!text) return "Без номера карты";
  return text.startsWith("*") ? `Карта ${text}` : text;
};
const detectBankByTransfer = (cardNumber, description) => {
  const text = `${cardNumber || ""} ${description || ""}`.toLowerCase();
  if (text.includes("сбер")) return "СберБанк";
  if (text.includes("тинькофф") || text.includes("t-bank") || text.includes("т-банк")) return "Т-Банк";
  if (text.includes("альфа")) return "Альфа-Банк";
  if (text.includes("втб")) return "ВТБ";
  if (text.includes("газпром")) return "Газпромбанк";
  if (text.includes("райфф")) return "Райффайзен";
  if (text.includes("озон")) return "Ozon Банк";
  if (text.includes("совком")) return "Совкомбанк";
  if (text.includes("мтс")) return "МТС Банк";
  return "Банк не определён";
};
const buildLocalAiData = (csvText, currentMappings = []) => {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return {
      rows: [],
      mappings: [],
      summary: null,
    };
  }
  const header = rows[0].map((cell) => String(cell || "").trim().toLowerCase());
  const dataRows = rows.slice(1);
  const bankLayoutFallback = rows[0].length >= 12 ? { date: 0, amount: 4, currency: 5, category: 9, description: 11 } : {};
  const dateIndex = header.findIndex((cell) => cell.includes("дата опера") || cell.includes("transaction date"));
  const categoryIndex = header.findIndex((cell) => cell.includes("катег") || cell.includes("category"));
  const descriptionIndex = header.findIndex((cell) => cell.includes("опис") || cell.includes("description"));
  const amountIndex = header.findIndex((cell) => (cell.includes("сумма") && cell.includes("опера")) || cell.includes("amount"));
  const currencyIndex = header.findIndex((cell) => (cell.includes("валют") && cell.includes("опера")) || cell.includes("currency"));
  const resolvedDateIndex = dateIndex >= 0 ? dateIndex : (bankLayoutFallback.date ?? 0);
  const resolvedCategoryIndex = categoryIndex >= 0 ? categoryIndex : (bankLayoutFallback.category ?? 0);
  const resolvedDescriptionIndex = descriptionIndex >= 0 ? descriptionIndex : (bankLayoutFallback.description ?? 1);
  const resolvedAmountIndex = amountIndex >= 0 ? amountIndex : (bankLayoutFallback.amount ?? 0);
  const resolvedCurrencyIndex = currencyIndex >= 0 ? currencyIndex : (bankLayoutFallback.currency ?? 0);
  const items = dataRows.map((row, index) => ({
    id: uid(`txn-${index}`),
    date: String(row[resolvedDateIndex] || "").trim(),
    category: normalizeCategoryName(row[resolvedCategoryIndex] || "Без категории"),
    description: String(row[resolvedDescriptionIndex] || "").trim(),
    amount: parseAmount(row[resolvedAmountIndex]),
    currency: String(row[resolvedCurrencyIndex] || "RUB").trim(),
    cardNumber: String(row[2] || "").trim(),
  })).filter((item) => item.category || item.description || item.amount)
    .map((item) => ({
      ...item,
      sourceKey: normalizeKey(item.category),
      dateValue: parseOperationDate(item.date),
      bankLabel: normalizeKey(item.category) === normalizeKey("Переводы")
        ? detectBankByTransfer(item.cardNumber, item.description)
        : "",
    }));

  const grouped = new Map();
  items.forEach((item) => {
    const groupKey = item.sourceKey;
    const current = grouped.get(groupKey) || {
      id: uid("map"),
      source: item.category,
      target: item.category,
      comment: "",
      count: 0,
      total: 0,
    };
    current.count += 1;
    current.total += item.amount;
    grouped.set(groupKey, current);
  });

  const mappings = [...grouped.values()]
    .map((item) => {
      const existing = currentMappings.find((row) => row.source === item.source);
      return existing
        ? { ...item, target: existing.target, comment: existing.comment || "" }
        : item;
    })
    .sort((left, right) => Math.abs(right.total) - Math.abs(left.total));

  const summary = {
    operations: items.length,
    categories: mappings.length,
    totalSpent: items.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0),
    topCategories: mappings.slice(0, 4),
    recentRows: items.slice(0, 6),
  };

  return {
    rows: items,
    mappings,
    summary,
  };
};
const formatMoney = (value, currency = "RUB") => {
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `${value} ${currency}`;
  }
};
const detectCategories = (csvText, currentMappings = []) => {
  return buildLocalAiData(csvText, currentMappings).mappings.map((source) => {
    const current = currentMappings.find((item) => item.source === source.source);
    return current || { id: uid("map"), source: source.source, target: source.source, comment: "" };
  });
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
    return `${post.author} ${post.text}`.toLowerCase().includes(search);
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
    if (dateMatchesEntry(entry, date)) items.push({ id: `${entry.id}-${date}`, type: "planner", label: "Планировщик трат", text: entry.text });
  });
  state.dogsEntries.forEach((entry) => {
    if (dateMatchesEntry(entry, date)) items.push({ id: `${entry.id}-${date}`, type: "dogs", label: "Собаки", text: entry.text });
  });
  state.posts.filter((post) => !post.archived).forEach((post) => {
    const start = post.startDate || post.createdAt.slice(0, 10);
    const end = post.endDate || start;
    if (inRange(date, start, end)) items.push({ id: `${post.id}-${date}`, type: "post", label: "Лента", text: post.text || "Публикация" });
  });
  return items;
};
const previewEventsForDate = (state, date) => {
  const items = collectEventsForDate(state, date);
  return items.slice(0, 2).map((item) => ({
    id: item.id,
    type: item.type,
    label: item.text.split("\n")[0].trim() || item.label,
  }));
};
const monthMatrix = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days = [];
  const shift = (first.getDay() + 6) % 7;
  for (let index = 0; index < shift; index += 1) days.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    const iso = new Date(year, month - 1, day, 12, 0, 0).toISOString().slice(0, 10);
    days.push(iso);
  }
  while (days.length % 7) days.push(null);
  return days;
};
const imageSrc = (image) => {
  if (image?.fileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(image.fileId)}&sz=w1600`;
  }
  return image?.imageUrl || "";
};
const fetchState = async () => {
  const response = await fetch(`${DEFAULT_SCRIPT_URL}?action=getState`, { method: "GET" });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "Не удалось загрузить данные");
  return normalizeState(data.payload);
};
const saveState = async (payload) => {
  const response = await fetch(DEFAULT_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "saveState", payload }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "Не удалось сохранить данные");
  return data;
};
const uploadImages = async (files) => {
  const result = [];
  for (const file of files) {
    const prepared = await resizeImageFile(file);
    const response = await fetch(DEFAULT_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "uploadImage",
        imageBase64: await readBase64(prepared),
        mimeType: prepared.type || "application/octet-stream",
        fileName: prepared.name,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Не удалось загрузить изображение");
    result.push(data.payload);
  }
  return result;
};

function App() {
  const [state, setState] = useState(() => ({
    ...clone(DEFAULT_STATE),
    settings: {
      ...clone(DEFAULT_STATE).settings,
      theme: getStoredTheme(),
    },
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "Планировщик";
    window.history.replaceState(null, "", toHash(routeToView(window.location.hash)));
    const onHashChange = () => setState((current) => ({ ...current, view: routeToView(window.location.hash) }));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme || "light";
  }, [state.settings.theme]);

  useEffect(() => {
    let alive = true;
    fetchState()
      .then((payload) => {
        if (!alive) return;
        const view = routeToView(window.location.hash);
        setState({
          ...payload,
          view,
          settings: {
            ...payload.settings,
            theme: getStoredTheme(),
          },
        });
      })
      .catch((error) => {
        if (!alive) return;
        setToast({ tone: "danger", text: error.message });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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
        },
      });
      const payloadToSave = {
        ...normalized,
        settings: {
          ...normalized.settings,
          theme: "light",
        },
        ai: {
          ...normalized.ai,
          csvText: "",
          categoryMappings: [],
        },
      };
      await saveState(payloadToSave);
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

  const applyLocal = (updater) => {
    setState((current) => normalizeState(typeof updater === "function" ? updater(current) : updater));
  };

  const setView = (view) => {
    window.history.replaceState(null, "", toHash(view));
    setState((current) => ({ ...current, view }));
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

  const handleCreatePost = async (draft) => {
    if (saving) return false;
    setSaving(true);
    try {
      const images = draft.files.length ? await uploadImages(draft.files) : [];
      const nextPost = {
        id: uid("post"),
        author: draft.author || "Лёша",
        text: draft.text.trim(),
        images,
        pinned: draft.pinned,
        archived: false,
        createdAt: nowISO(),
        startDate: draft.startDate,
        endDate: draft.endDate,
      };
      const nextState = normalizeState({
        ...state,
        posts: [nextPost, ...state.posts],
      });
      nextState.settings.lastSyncedAt = nowISO();
      await saveState({
        ...nextState,
        settings: {
          ...nextState.settings,
          theme: "light",
        },
        ai: {
          ...nextState.ai,
          csvText: "",
          categoryMappings: [],
        },
      });
      setState(nextState);
      setToast({ tone: "success", text: "Пост опубликован" });
      return true;
    } catch (error) {
      setToast({ tone: "danger", text: error.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const page = loading
    ? html`<${LoadingPage} view=${state.view} />`
    : state.view === "planner"
      ? html`<${NotePage} kind="planner" title="Планировщик трат" state=${state} onSave=${persist} onLocalChange=${applyLocal} saving=${saving} />`
      : state.view === "plans"
        ? html`<${FeedPage} state=${state} onSave=${persist} onLocalChange=${applyLocal} onCreatePost=${handleCreatePost} saving=${saving} />`
        : state.view === "dogs"
          ? html`<${NotePage} kind="dogs" title="Собаки" state=${state} onSave=${persist} onLocalChange=${applyLocal} saving=${saving} />`
          : state.view === "calendar"
            ? html`<${CalendarPage} state=${state} onSave=${persist} onLocalChange=${applyLocal} />`
            : html`<${AiPage} state=${state} onSave=${persist} onLocalChange=${applyLocal} saving=${saving} />`;

  return html`
    <div className=${`app-shell${saving ? " is-busy" : ""}`}>
      <header className="topbar">
        <nav className="nav-tabs" aria-label="Навигация">
          ${NAV_ITEMS.map((item) => html`
            <button
              key=${item.id}
              type="button"
              className=${`nav-tab${state.view === item.id ? " is-active" : ""}`}
              onClick=${() => setView(item.id)}
              disabled=${saving}
            >${item.label}</button>
          `)}
        </nav>
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
      </header>
      ${page}
      ${toast && html`<div className=${`toast toast--${toast.tone}`}>${toast.text}</div>`}
    </div>
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

function NotePage({ kind, title, state, onSave, onLocalChange, saving }) {
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
    const entryDate = draft.repeatMonthly && activeEntry?.repeatMonthly ? activeEntry.date : selectedDate;
    const nextEntry = {
      id: activeEntry?.id || uid(kind),
      date: entryDate,
      text: draft.text.trim(),
      repeatMonthly: draft.repeatMonthly,
      updatedAt: nowISO(),
    };
    const nextState = {
      ...state,
      [dateKey]: selectedDate,
      [listKey]: upsertEntry(entries, nextEntry),
    };
    const saved = await onSave(nextState, "Запись сохранена");
    if (saved) setEditing(false);
  };

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
                placeholder="Запишите расходы, важные суммы, напоминания"
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
            </div>
          `}
        </div>
      </section>
    </main>
  `;
}

function FeedPage({ state, onSave, onLocalChange, onCreatePost, saving }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const posts = useMemo(() => sortedPosts([...state.posts], state.feedFilters), [state.posts, state.feedFilters]);
  const isArchived = state.feedFilters.mode === "archived";

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

  const updatePost = (postId, patch, message) => {
    const nextState = {
      ...state,
      posts: state.posts.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    };
    setMenuOpenId("");
    onSave(nextState, message);
  };

  const deletePost = (postId) => {
    const nextState = { ...state, posts: state.posts.filter((post) => post.id !== postId) };
    setMenuOpenId("");
    onSave(nextState, "Пост удалён");
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
          <div className="feed-board__meta">${isArchived ? "Архивные записи" : "Актуальные публикации"}</div>
        </div>
        <div className="feed-stack feed-stack--board">
          ${posts.length
            ? posts.map((post, index) => html`
              <article key=${post.id} className=${`post-card post-card--flat${post.pinned ? " is-pinned" : ""}${post.archived ? " is-archived" : ""}`}>
                <div className="post-head">
                  <div>
                    <div className="post-author">${post.author || "Лёша"}</div>
                    ${(post.pinned || post.archived) ? html`<div className="post-meta">${post.pinned ? "Закреплено" : "Архив"}</div>` : null}
                  </div>
                  <div className="post-menu-wrap">
                    <button type="button" className="menu-button" onClick=${() => setMenuOpenId((value) => value === post.id ? "" : post.id)} disabled=${saving}>⋯</button>
                    ${menuOpenId === post.id && html`
                      <div className="post-menu">
                        <button type="button" className="post-menu__item" onClick=${() => updatePost(post.id, { pinned: !post.pinned }, post.pinned ? "Пост откреплён" : "Пост закреплён")}>
                          <span className="post-menu__icon">📌</span>
                          <span className="post-menu__label">${post.pinned ? "Открепить" : "Закрепить"}</span>
                        </button>
                        <button type="button" className="post-menu__item" onClick=${() => updatePost(post.id, { archived: !post.archived, pinned: post.archived ? post.pinned : false }, post.archived ? "Пост возвращён из архива" : "Пост отправлен в архив")}>
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
                      <button key=${image.fileId || image.imageUrl} type="button" className="gallery-item" onClick=${() => setLightbox(imageSrc(image))}>
                        <img src=${imageSrc(image)} alt="Изображение публикации" />
                      </button>
                    `)}
                  </div>
                ` : null}
                ${post.text ? html`<div className="post-text">${post.text}</div>` : null}
                <div className="post-dates">${formatShortDate(post.startDate)}${post.endDate && post.endDate !== post.startDate ? ` - ${formatShortDate(post.endDate)}` : ""}</div>
                ${index < posts.length - 1 ? html`<div className="post-divider"></div>` : null}
              </article>
            `)
            : html`<section className="empty-state"><h3>${isArchived ? "Архив пока пуст" : "Лента пока пустая"}</h3><p>${isArchived ? "Сюда попадут публикации после отправки в архив." : "Первый пост можно добавить через верхнюю кнопку."}</p></section>`}
        </div>
      </section>
      ${modalOpen && html`<${PostModal} onClose=${() => setModalOpen(false)} onSubmit=${async (draft) => { const saved = await onCreatePost(draft); if (saved) setModalOpen(false); }} saving=${saving} />`}
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

function PostModal({ onClose, onSubmit, saving }) {
  const [draft, setDraft] = useState({
    author: "Лёша",
    text: "",
    pinned: false,
    startDate: todayISO(),
    endDate: todayISO(),
    files: [],
    previews: [],
  });
  const [emojiOpen, setEmojiOpen] = useState(false);

  const changeFiles = (files) => {
    const list = Array.from(files || []);
    setDraft((current) => ({
      ...current,
      files: list,
      previews: list.map((file) => URL.createObjectURL(file)),
    }));
  };

  useEffect(() => () => {
    draft.previews.forEach((src) => URL.revokeObjectURL(src));
  }, [draft.previews]);

  return html`
    <div className="modal-backdrop" onClick=${onClose}>
      <div className="modal-sheet" onClick=${(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>Новый пост</h3>
          <button type="button" className="modal-close" onClick=${onClose}>×</button>
        </div>
        <label className="upload-drop">
          <input type="file" accept="image/*" multiple onChange=${(event) => changeFiles(event.target.files)} disabled=${saving} hidden />
          <span>Добавить фото</span>
          <small>Файлы с телефона и ПК</small>
        </label>
        ${draft.previews.length ? html`
          <div className=${`post-gallery gallery-${Math.min(draft.previews.length, 4)}`}>
            ${draft.previews.map((src) => html`<div key=${src} className="gallery-item is-static"><img src=${src} alt="Предпросмотр" /></div>`)}
          </div>
        ` : null}
        <div className="modal-fields">
          <div className="field">
            <span>Текст</span>
            <div className="emoji-wrap">
              <textarea
                className="editor-textarea"
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
            <button type="button" className="button button--red" onClick=${() => onSubmit(draft)} disabled=${saving || (!draft.text.trim() && !draft.files.length)}>
              ${saving ? html`<${ButtonSpinner} />` : null}
              <span>${saving ? "Публикация..." : "Опубликовать"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function CalendarPage({ state, onSave, onLocalChange }) {
  const monthKey = state.calendarMonth || toMonthKey(todayISO());
  const [selectedDate, setSelectedDate] = useState(`${monthKey}-01`);
  const days = useMemo(() => monthMatrix(monthKey), [monthKey]);
  const events = useMemo(() => collectEventsForDate(state, selectedDate), [state, selectedDate]);
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${monthKey}-01T12:00:00`));
  const eventTotals = useMemo(() => {
    const totals = { planner: 0, dogs: 0, post: 0 };
    days.forEach((date) => {
      if (!date) return;
      collectEventsForDate(state, date).forEach((item) => {
        totals[item.type] += 1;
      });
    });
    return totals;
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
            <p>Календарь показывает траты, заметки по собакам и публикации из ленты.</p>
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
          <div className="calendar-summary__item"><i className="dot dot--planner"></i><span>Траты: ${eventTotals.planner}</span></div>
          <div className="calendar-summary__item"><i className="dot dot--dogs"></i><span>Собаки: ${eventTotals.dogs}</span></div>
          <div className="calendar-summary__item"><i className="dot dot--post"></i><span>Лента: ${eventTotals.post}</span></div>
        </div>
        <div className="calendar-grid">
          <div className="calendar-week">Пн</div>
          <div className="calendar-week">Вт</div>
          <div className="calendar-week">Ср</div>
          <div className="calendar-week">Чт</div>
          <div className="calendar-week">Пт</div>
          <div className="calendar-week">Сб</div>
          <div className="calendar-week">Вс</div>
          ${days.map((date, index) => {
            if (!date) return html`<div key=${`empty-${index}`} className="calendar-cell is-empty"></div>`;
            const cellEvents = collectEventsForDate(state, date);
            const previewEvents = previewEventsForDate(state, date);
            return html`
              <button
                key=${date}
                type="button"
                className=${`calendar-cell${selectedDate === date ? " is-active" : ""}`}
                onClick=${() => setSelectedDate(date)}
              >
                <div className="calendar-cell__top">
                  <span className="calendar-cell__day">${date.slice(8, 10)}</span>
                  <small className="calendar-cell__count">${cellEvents.length ? `${cellEvents.length}` : ""}</small>
                </div>
                <div className="calendar-lines">
                  ${previewEvents.map((item) => html`
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
            <p>${events.length ? "Все события на выбранную дату." : "На выбранную дату пока ничего нет."}</p>
          </div>
        </div>
        <div className="agenda-list">
          ${events.length ? events.map((item) => html`
            <article key=${item.id} className="agenda-item">
              <div className=${`agenda-badge agenda-badge--${item.type}`}>${item.label}</div>
              <div className="agenda-text">${item.text}</div>
            </article>
          `) : html`<div className="empty-state empty-state--soft"><p>Календарь станет плотнее, когда появятся записи и публикации.</p></div>`}
        </div>
      </section>
    </main>
  `;
}

function AiPage({ state, onSave, onLocalChange, saving }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("budget-ai-key") || "");
  const [working, setWorking] = useState(false);
  const [localCsv, setLocalCsv] = useState({
    fileName: "",
    csvText: "",
    rows: [],
    mappings: [],
    summary: null,
    customTargets: [],
  });
  const [newTargetName, setNewTargetName] = useState("");
  const mappings = localCsv.mappings;
  const boardColumns = useMemo(() => {
    const targetBySource = new Map(mappings.map((item) => [normalizeKey(item.source), (item.target || item.source).trim()]));
    const targets = [...new Set([
      ...mappings.map((item) => item.target.trim()).filter(Boolean),
      ...(localCsv.customTargets || []).map((item) => item.trim()).filter(Boolean),
    ])];
    return targets.map((target) => {
      const groups = mappings.filter((item) => (item.target || item.source).trim() === target);
      const operations = localCsv.rows
        .filter((row) => targetBySource.get(row.sourceKey) === target)
        .sort((left, right) => right.dateValue - left.dateValue);
      return {
        id: target,
        title: target,
        groups,
        operations,
        operationsCount: operations.length,
        total: operations.reduce((sum, item) => sum + (item.amount || 0), 0),
      };
    }).sort((left, right) => Math.abs(right.total) - Math.abs(left.total));
  }, [mappings, localCsv.customTargets, localCsv.rows]);

  useEffect(() => {
    localStorage.setItem("budget-ai-key", apiKey);
  }, [apiKey]);

  const updateAiLocal = (patch) => {
    onLocalChange({ ...state, ai: { ...state.ai, ...patch } });
  };

  const updateAi = (patch, message = "Данные обновлены") => {
    onSave({ ...state, ai: { ...state.ai, ...patch } }, message);
  };

  const handleCsv = async (file) => {
    const csvText = await readCsvFile(file);
    const parsed = buildLocalAiData(csvText, localCsv.mappings);
    setLocalCsv({
      fileName: file.name,
      csvText,
      rows: parsed.rows,
      mappings: parsed.mappings,
      summary: parsed.summary,
      customTargets: [],
    });
  };

  const moveMappingToTarget = (mappingId, target) => {
    setLocalCsv((current) => ({
      ...current,
      customTargets: [...new Set([...(current.customTargets || []), target])],
      mappings: current.mappings.map((item) => item.id === mappingId ? { ...item, target } : item),
    }));
  };

  const createTargetColumn = () => {
    const value = newTargetName.trim();
    if (!value) return;
    setLocalCsv((current) => ({
      ...current,
      customTargets: [...new Set([...(current.customTargets || []), value])],
    }));
    setNewTargetName("");
  };

  const runAnalysis = async () => {
    if (!apiKey) {
      window.alert("Добавьте API key для ИИ-анализа");
      return;
    }
    if (!localCsv.csvText) {
      window.alert("Сначала загрузите CSV");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(AI_ENDPOINTS[state.ai.provider], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: state.ai.model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "Ты анализируешь финансовые и текстовые CSV-данные, раскладываешь записи по категориям, отмечаешь спорные места и даёшь короткие рекомендации.",
            },
            {
              role: "user",
              content: [
                `Промпт пользователя:\n${state.ai.prompt || "Разбери CSV и предложи понятные категории."}`,
                `Категории и переводы:\n${JSON.stringify(mappings, null, 2)}`,
                `CSV:\n${localCsv.csvText.slice(0, 14000)}`,
              ].join("\n\n"),
            },
          ],
        }),
      });
      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || data.error?.message || "Пустой ответ";
      const text = /quota|billing/i.test(rawText)
        ? "У текущего AI-провайдера закончилась квота или не подключён биллинг. Проверьте лимиты и оплату в кабинете API, либо переключитесь на другого провайдера."
        : rawText;
      updateAi({ analysisResult: text, lastRunAt: nowISO() }, "ИИ-анализ завершён");
    } catch (error) {
      window.alert(error.message || "Не удалось получить ответ от ИИ");
    } finally {
      setWorking(false);
    }
  };

  return html`
    <main className="page">
      <section className="panel ai-top">
        <div className="ai-top__left">
          <div className="page-head">
            <div>
              <h2>ИИ-анализ</h2>
              <p>CSV хранится только локально в браузере и в JSON не записывается.</p>
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Провайдер</span>
              <select
                value=${state.ai.provider}
                onChange=${(event) => {
                  const provider = event.target.value;
                  const model = provider === "openai"
                    ? "gpt-4o-mini"
                    : provider === "groq"
                      ? "llama-3.1-8b-instant"
                      : "deepseek-chat";
                  updateAiLocal({ provider, model });
                }}
                disabled=${saving || working}
              >
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
              </select>
            </label>
            <label className="field">
              <span>Модель</span>
              <input type="text" value=${state.ai.model} onInput=${(event) => updateAiLocal({ model: event.target.value })} disabled=${saving || working} />
            </label>
          </div>
          <label className="field">
            <span>API key</span>
            <input type="password" value=${apiKey} onInput=${(event) => setApiKey(event.target.value)} placeholder="sk-..." disabled=${working} />
          </label>
          <label className="upload-drop upload-drop--compact ai-upload">
            <input type="file" accept=".csv,text/csv" onChange=${(event) => event.target.files?.[0] && handleCsv(event.target.files[0])} disabled=${saving || working} hidden />
            <span>Загрузить CSV</span>
            <small>${localCsv.fileName || "Файл пока не выбран"}</small>
          </label>
          <label className="field">
            <span>Запрос к ИИ</span>
            <textarea className="editor-textarea editor-textarea--small" value=${state.ai.prompt} onInput=${(event) => updateAiLocal({ prompt: event.target.value })} placeholder="Например: найди спорные переводы и предложи финальные категории" disabled=${saving || working}></textarea>
          </label>
          <button type="button" className="button button--red ai-run" onClick=${runAnalysis} disabled=${saving || working || !localCsv.csvText}>
            ${working ? html`<${ButtonSpinner} />` : null}
            <span>${working ? "Анализ..." : "Отправить в ИИ"}</span>
          </button>
          ${localCsv.fileName ? html`<div className="ai-inline-file">Локально: ${localCsv.fileName}</div>` : null}
        </div>
      </section>
      <section className="panel ai-map-panel">
        <div className="page-head">
          <div>
            <h2>Переводы категорий</h2>
            <p>Колонка показывает итоговую категорию. Сверху операции, ниже расход.</p>
          </div>
          <div className="ai-column-create">
            <input
              type="text"
              value=${newTargetName}
              onInput=${(event) => setNewTargetName(event.target.value)}
              placeholder="Создать категорию"
              disabled=${saving || working || !localCsv.csvText}
            />
            <button type="button" className="button button--blue" onClick=${createTargetColumn} disabled=${saving || working || !newTargetName.trim()}>Добавить</button>
          </div>
        </div>
        <div className="ai-board">
          ${boardColumns.length ? boardColumns.map((column) => html`
            <section
              key=${column.id}
              className="ai-column"
              onDragOver=${(event) => event.preventDefault()}
              onDrop=${(event) => {
                event.preventDefault();
                const mappingId = event.dataTransfer.getData("text/plain");
                if (mappingId) moveMappingToTarget(mappingId, column.title);
              }}
            >
              <div className="ai-column__head">
                <strong>${column.title}</strong>
                <div className="ai-column__meta">
                  <span>Операции: ${column.operationsCount}</span>
                  <span>Расход: ${formatMoney(column.total)}</span>
                </div>
              </div>
              <div className="ai-column__cards">
                ${column.groups.length ? html`
                  <div className="ai-group-list">
                    ${column.groups.map((item) => html`
                      <div
                        key=${item.id}
                        className="ai-group-row"
                        draggable=${true}
                        onDragStart=${(event) => event.dataTransfer.setData("text/plain", item.id)}
                      >
                        <div className="ai-group-row__meta">
                          <strong>${item.source}</strong>
                          <span>${item.count} операций · ${formatMoney(item.total)}</span>
                        </div>
                        <input
                          type="text"
                          value=${item.comment || ""}
                          onInput=${(event) => setLocalCsv((current) => ({ ...current, mappings: current.mappings.map((row) => row.id === item.id ? { ...row, comment: event.target.value } : row) }))}
                          placeholder="Комментарий"
                          disabled=${saving || working}
                        />
                      </div>
                    `)}
                  </div>
                ` : null}
                ${column.operations.length ? html`
                  <div className="ai-operation-list">
                    ${column.operations.map((item) => html`
                      <div key=${item.id} className="ai-operation-row">
                        <div className="ai-operation-row__main">
                          <strong>${normalizeKey(column.title) === normalizeKey("Переводы") ? (item.description || "Перевод") : (item.description || item.category)}</strong>
                          <span>
                            ${normalizeKey(column.title) === normalizeKey("Переводы")
                              ? `${buildCardLabel(item.cardNumber)} · ${item.bankLabel}`
                              : `${item.date}${item.cardNumber ? ` · ${buildCardLabel(item.cardNumber)}` : ""}`}
                          </span>
                        </div>
                        <div className="ai-operation-row__amount">${formatMoney(item.amount, item.currency)}</div>
                      </div>
                    `)}
                  </div>
                ` : html`<div className="empty-state empty-state--soft"><p>Сюда можно перетащить категории.</p></div>`}
              </div>
            </section>
          `) : html`<div className="empty-state empty-state--soft"><p>После загрузки CSV здесь появятся колонки категорий.</p></div>`}
        </div>
      </section>
      <section className="panel ai-result">
        <div className="page-head">
          <div>
            <h2>Ответ ИИ</h2>
            <p>${state.ai.lastRunAt ? `Последний запуск: ${formatTime(state.ai.lastRunAt)}` : "Ответ появится после анализа."}</p>
          </div>
        </div>
        <pre>${state.ai.analysisResult || "Пока пусто."}</pre>
      </section>
    </main>
  `;
}

createRoot(document.getElementById("app")).render(html`<${App} />`);
