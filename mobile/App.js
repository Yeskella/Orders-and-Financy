import "react-native-url-polyfill/auto";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import htm from "htm";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  APP_NAME,
  DEFAULT_STATE,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_BUCKET,
  DEFAULT_SUPABASE_URL,
  STORAGE_KEYS,
  THEMES,
  VIEWS,
  actorStamp,
  buildPlannerEntryPayload,
  clone,
  collectEventsForDate,
  createPlannerDraftRow,
  createStore,
  dateMatchesEntry,
  deleteImages,
  fetchAppState,
  formatDate,
  formatFeedTimeMsk,
  formatMoney,
  formatMonthTitle,
  getAuthorTheme,
  getFeedSeenBy,
  getImageLabel,
  getNearestPayroll,
  getPlannerEntryPrimaryText,
  getPlannerEntryRows,
  getPlannerEntryTotal,
  getUnreadPostsForActor,
  imageSrc,
  initials,
  isPostOwnedByActor,
  isPostUnreadForActor,
  isRfNonWorkingDay,
  loginLocal,
  mergeFeedSeenBy,
  mergeStatePatch,
  monthMatrix,
  normalizeComment,
  normalizeEntry,
  normalizeMoneyGroup,
  normalizeMoneySubitem,
  normalizeMoneyTab,
  normalizePost,
  normalizeState,
  nowISO,
  parseMoneyInput,
  pluralizeRu,
  previewEventsForDate,
  sameImageRef,
  saveStateSlices,
  shiftIsoDate,
  shiftMonthKey,
  sortMoneySubitems,
  sortedPosts,
  toMonthKey,
  todayISO,
  uid,
  uploadAssets,
  upsertEntry,
  validateView,
} from "./src/core";
import { getTheme } from "./src/theme";

const html = htm.bind(React.createElement);

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const DEFAULT_STORE_CONFIG = {
  url: DEFAULT_SUPABASE_URL,
  anonKey: DEFAULT_SUPABASE_ANON_KEY,
  bucket: DEFAULT_SUPABASE_BUCKET,
};

const REMOTE_LOAD_TIMEOUT_MS = 45000;

const withTimeout = (promise, timeoutMs, message) => Promise.race([
  promise,
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeoutMs);
  }),
]);

const FEED_EMOJIS = ["❤️", "🔥", "👏", "✨", "😂", "🙏"];

const createToast = (text, tone = "info") => ({ id: uid("toast"), text, tone });

const getMoneyGroupTotal = (group) => (group?.items || []).reduce((sum, item) => sum + parseMoneyInput(item.cost), 0);
const getMoneyTabTotal = (tab) => (tab?.groups || []).reduce((sum, group) => sum + getMoneyGroupTotal(group), 0);
const getMoneyGroupCount = (group) => (group?.items || []).length;

const createEventDraft = (entry, date = todayISO()) => {
  if (!entry) {
    return {
      id: "",
      date,
      rows: [createPlannerDraftRow()],
      repeatMonthly: false,
      repeatWeekly: false,
      repeatYearly: false,
    };
  }
  return {
    id: entry.id,
    date: entry.date || date,
    rows: getPlannerEntryRows(entry).length ? getPlannerEntryRows(entry) : [createPlannerDraftRow()],
    repeatMonthly: Boolean(entry.repeatMonthly),
    repeatWeekly: Boolean(entry.repeatWeekly),
    repeatYearly: Boolean(entry.repeatYearly),
  };
};

const createPostDraft = (post, actor) => ({
  id: post?.id || "",
  author: post?.author || actor || "Lesha",
  text: post?.text || "",
  startDate: post?.startDate || "",
  endDate: post?.endDate || post?.startDate || "",
  existingImages: Array.isArray(post?.images) ? clone(post.images) : [],
  removedImages: [],
  newAssets: [],
  pinned: Boolean(post?.pinned),
  archived: Boolean(post?.archived),
});

const createMoneyEditor = (kind, values = {}, scope = {}) => ({
  kind,
  ...scope,
  id: values.id || "",
  title: values.title || "",
  name: values.name || "",
  cost: String(values.cost ?? ""),
});

const getMediaKey = (image, index, prefix = "media") => (
  image?.path
  || image?.publicUrl
  || image?.fileName
  || image?.uri
  || `${prefix}-${index}`
);

const inputHeight = 48;

function App() {
  return html`
    <${SafeAreaProvider}>
      <${MobileRoot} />
    <//>
  `;
}

function MobileRoot() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState(null);
  const [themeId, setThemeId] = useState(DEFAULT_STATE.settings.theme);
  const [view, setView] = useState(DEFAULT_STATE.view);
  const [storeConfig, setStoreConfig] = useState(DEFAULT_STORE_CONFIG);
  const [appState, setAppState] = useState(normalizeState(DEFAULT_STATE));
  const [booting, setBooting] = useState(true);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [savingRemote, setSavingRemote] = useState(false);
  const [toast, setToast] = useState(null);
  const [eventDraft, setEventDraft] = useState(null);
  const [postDraft, setPostDraft] = useState(null);
  const [commentsPostId, setCommentsPostId] = useState("");
  const [commentDraft, setCommentDraft] = useState({ text: "", parentId: "", commentId: "" });
  const [moneyEditor, setMoneyEditor] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [feedComposerEmojiOpen, setFeedComposerEmojiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bootstrappedRef = useRef(false);
  const theme = getTheme(themeId);
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);
  const store = useMemo(() => {
    try {
      return createStore(storeConfig);
    } catch (_) {
      return null;
    }
  }, [storeConfig]);
  const actor = session?.role || "";
  const activeMonth = appState.calendarMonth || toMonthKey(todayISO());
  const selectedDate = appState.plannerSelectedDate || todayISO();
  const activeTab = appState.customTabs.find((item) => item.id === appState.moneyActiveTabId) || appState.customTabs[0] || null;
  const unreadPosts = useMemo(
    () => getUnreadPostsForActor(appState.posts, actor, appState.settings),
    [actor, appState.posts, appState.settings],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((text, tone = "info") => {
    setToast(createToast(text, tone));
  }, []);

  const persistTheme = useCallback(async (nextThemeId) => {
    await AsyncStorage.setItem(STORAGE_KEYS.theme, nextThemeId);
  }, []);

  const persistView = useCallback(async (nextView) => {
    await AsyncStorage.setItem(STORAGE_KEYS.view, nextView);
  }, []);

  const persistSession = useCallback(async (nextSession) => {
    if (!nextSession) {
      await AsyncStorage.removeItem(STORAGE_KEYS.session);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(nextSession));
  }, []);

  const persistStoreConfig = useCallback(async (nextConfig) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.supabaseUrl, nextConfig.url || DEFAULT_SUPABASE_URL],
      [STORAGE_KEYS.supabaseAnonKey, nextConfig.anonKey || DEFAULT_SUPABASE_ANON_KEY],
      [STORAGE_KEYS.supabaseBucket, nextConfig.bucket || DEFAULT_SUPABASE_BUCKET],
    ]);
  }, []);

  const refreshRemote = useCallback(async (nextSession = session, nextStoreConfig = storeConfig) => {
    if (!nextSession) {
      setBooting(false);
      return;
    }
    setLoadingRemote(true);
    try {
      const nextStore = createStore(nextStoreConfig);
      const remoteState = await withTimeout(
        fetchAppState(nextStore),
        REMOTE_LOAD_TIMEOUT_MS,
        "Supabase долго загружает данные. Открываю приложение с локальным состоянием.",
      );
      setAppState(remoteState);
      setThemeId((current) => current || remoteState.settings.theme || DEFAULT_STATE.settings.theme);
    } catch (error) {
      showToast(error.message || "Не удалось загрузить данные", "danger");
      setAppState((current) => normalizeState(current || DEFAULT_STATE));
    } finally {
      setLoadingRemote(false);
      setBooting(false);
    }
  }, [session, showToast, storeConfig]);

  useEffect(() => {
    if (bootstrappedRef.current) return undefined;
    bootstrappedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet([
          STORAGE_KEYS.theme,
          STORAGE_KEYS.view,
          STORAGE_KEYS.session,
          STORAGE_KEYS.supabaseUrl,
          STORAGE_KEYS.supabaseAnonKey,
          STORAGE_KEYS.supabaseBucket,
        ]);
        const map = Object.fromEntries(pairs);
        const nextThemeId = map[STORAGE_KEYS.theme] || DEFAULT_STATE.settings.theme;
        const nextView = validateView(map[STORAGE_KEYS.view] || DEFAULT_STATE.view);
        const nextStoreConfig = {
          url: map[STORAGE_KEYS.supabaseUrl] || DEFAULT_SUPABASE_URL,
          anonKey: map[STORAGE_KEYS.supabaseAnonKey] || DEFAULT_SUPABASE_ANON_KEY,
          bucket: map[STORAGE_KEYS.supabaseBucket] || DEFAULT_SUPABASE_BUCKET,
        };
        const nextSession = map[STORAGE_KEYS.session] ? JSON.parse(map[STORAGE_KEYS.session]) : null;
        if (cancelled) return;
        setThemeId(nextThemeId);
        setView(nextView);
        setStoreConfig(nextStoreConfig);
        setSession(nextSession);
        setBooting(false);
        if (nextSession) {
          void refreshRemote(nextSession, nextStoreConfig);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || "Не удалось инициализировать mobile-приложение", "danger");
          setBooting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshRemote, showToast]);

  const commitState = useCallback(async (updater, successText = "") => {
    if (!store) {
      showToast("Supabase не настроен", "danger");
      return null;
    }
    let previousState = null;
    let nextState = null;
    setAppState((current) => {
      previousState = current;
      nextState = normalizeState(typeof updater === "function" ? updater(current) : updater);
      return nextState;
    });
    if (!nextState) return null;
    setSavingRemote(true);
    try {
      await saveStateSlices(store, previousState, nextState);
      if (successText) showToast(successText, "success");
      return nextState;
    } catch (error) {
      showToast(error.message || "Не удалось сохранить данные", "danger");
      try {
        const fresh = await fetchAppState(store);
        setAppState(fresh);
      } catch (_) {
        // ignore secondary refresh failure
      }
      return null;
    } finally {
      setSavingRemote(false);
    }
  }, [showToast, store]);

  useEffect(() => {
    if (themeId === appState.settings.theme) return;
    setThemeId(appState.settings.theme || DEFAULT_STATE.settings.theme);
  }, [appState.settings.theme, themeId]);

  useEffect(() => {
    if (view !== "plans" || !actor || !unreadPosts.length) return;
    const seenAt = nowISO();
    void commitState((current) => mergeStatePatch(current, {
      settings: {
        ...current.settings,
        feedSeenBy: mergeFeedSeenBy(current.settings.feedSeenBy, { [actor]: seenAt }),
        lastSyncedAt: seenAt,
        lastUpdatedBy: actor,
      },
      feedFilters: {
        ...current.feedFilters,
        mode: "active",
      },
    }));
  }, [actor, commitState, unreadPosts.length, view]);

  const handleLogin = useCallback(async (role, password) => {
    try {
      setLoadingRemote(true);
      const nextSession = loginLocal(role, password);
      setSession(nextSession);
      await persistSession(nextSession);
      await persistStoreConfig(storeConfig);
      await refreshRemote(nextSession, storeConfig);
      showToast(`Привет, ${role}`, "success");
    } catch (error) {
      showToast(error.message || "Не удалось войти", "danger");
    } finally {
      setLoadingRemote(false);
    }
  }, [persistSession, persistStoreConfig, refreshRemote, showToast, storeConfig]);

  const handleLogout = useCallback(async () => {
    setSettingsOpen(false);
    setSession(null);
    setAppState(normalizeState(DEFAULT_STATE));
    setView(DEFAULT_STATE.view);
    await persistSession(null);
    await persistView(DEFAULT_STATE.view);
  }, [persistSession, persistView]);

  const handleChangeTheme = useCallback(async (nextThemeId) => {
    setThemeId(nextThemeId);
    await persistTheme(nextThemeId);
    if (!actor) return;
    void commitState((current) => mergeStatePatch(current, {
      settings: {
        ...current.settings,
        theme: nextThemeId,
        lastSyncedAt: nowISO(),
        lastUpdatedBy: actor,
      },
    }), "Тема обновлена");
  }, [actor, commitState, persistTheme]);

  const handleSwitchView = useCallback(async (nextView) => {
    if (nextView === view) return;
    setSettingsOpen(false);
    setView(nextView);
    await persistView(nextView);
    if (nextView === "plans" && appState.feedFilters.mode !== "active") {
      await commitState((current) => mergeStatePatch(current, {
        feedFilters: {
          ...current.feedFilters,
          mode: "active",
        },
      }));
    }
    void refreshRemote();
  }, [appState.feedFilters.mode, commitState, persistView, refreshRemote, view]);

  const handleSelectDate = useCallback((date) => {
    setAppState((current) => mergeStatePatch(current, {
      plannerSelectedDate: date,
      calendarMonth: toMonthKey(date),
    }));
  }, []);

  const openNewEvent = useCallback((date = selectedDate) => {
    setEventDraft(createEventDraft(null, date));
  }, [selectedDate]);

  const openEditEvent = useCallback((entry) => {
    setEventDraft(createEventDraft(entry, entry?.date || selectedDate));
  }, [selectedDate]);

  const closeEventDraft = useCallback(() => setEventDraft(null), []);

  const handleSaveEvent = useCallback(async () => {
    if (!eventDraft || !actor) return;
    const payload = buildPlannerEntryPayload(eventDraft.rows);
    if (!eventDraft.date || !payload.text) {
      showToast("Укажите дату и хотя бы одну строку события", "danger");
      return;
    }
    const timestamp = nowISO();
    const source = appState.plannerEntries.find((entry) => entry.id === eventDraft.id);
    const nextEntry = normalizeEntry({
      ...(source || {}),
      id: source?.id || uid("planner"),
      date: eventDraft.date,
      text: payload.text,
      amount: payload.amount,
      repeatMonthly: Boolean(eventDraft.repeatMonthly),
      repeatWeekly: Boolean(eventDraft.repeatWeekly),
      repeatYearly: Boolean(eventDraft.repeatYearly),
      createdAt: source?.createdAt || timestamp,
      createdBy: source?.createdBy || actor,
      updatedAt: timestamp,
      updatedBy: actor,
    }, "planner");
    const result = await commitState((current) => mergeStatePatch(current, {
      plannerEntries: upsertEntry(current.plannerEntries, nextEntry),
      plannerSelectedDate: nextEntry.date,
      calendarMonth: toMonthKey(nextEntry.date),
      settings: {
        ...current.settings,
        lastSyncedAt: timestamp,
        lastUpdatedBy: actor,
      },
    }), source ? "Событие обновлено" : "Событие добавлено");
    if (result) {
      setEventDraft(null);
    }
  }, [actor, appState.plannerEntries, commitState, eventDraft, showToast]);

  const handleDeleteEvent = useCallback((entryId) => {
    if (!entryId || !actor) return;
    Alert.alert("Удалить событие?", "Эта запись исчезнет из календаря и списка событий.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          const timestamp = nowISO();
          void commitState((current) => mergeStatePatch(current, {
            plannerEntries: current.plannerEntries.filter((entry) => entry.id !== entryId),
            settings: {
              ...current.settings,
              lastSyncedAt: timestamp,
              lastUpdatedBy: actor,
            },
          }), "Событие удалено");
          setEventDraft((current) => (current?.id === entryId ? null : current));
        },
      },
    ]);
  }, [actor, commitState]);

  const openNewPost = useCallback(() => {
    setPostDraft(createPostDraft(null, actor));
  }, [actor]);

  const openEditPost = useCallback((post) => {
    setPostDraft(createPostDraft(post, actor));
  }, [actor]);

  const closePostDraft = useCallback(() => {
    setPostDraft(null);
    setFeedComposerEmojiOpen(false);
  }, []);

  const handlePickImages = useCallback(async () => {
    if (!postDraft) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Нужен доступ к фото, чтобы прикреплять изображения", "danger");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.82,
    });
    if (result.canceled) return;
    setPostDraft((current) => current ? {
      ...current,
      newAssets: [...current.newAssets, ...(result.assets || [])],
    } : current);
  }, [postDraft]);

  const handleTogglePostImage = useCallback((image, isExisting) => {
    setPostDraft((current) => {
      if (!current) return current;
      if (isExisting) {
        const alreadyRemoved = current.removedImages.some((item) => sameImageRef(item, image));
        return {
          ...current,
          removedImages: alreadyRemoved
            ? current.removedImages.filter((item) => !sameImageRef(item, image))
            : [...current.removedImages, image],
        };
      }
      return {
        ...current,
        newAssets: current.newAssets.filter((asset) => asset.uri !== image.uri),
      };
    });
  }, []);

  const handleSavePost = useCallback(async () => {
    if (!postDraft || !actor || !store) return;
    if (!String(postDraft.text || "").trim()) {
      showToast("Нужен текст публикации", "danger");
      return;
    }
    const timestamp = nowISO();
    const source = appState.posts.find((post) => post.id === postDraft.id);
    let uploadedImages = [];
    try {
      if (postDraft.newAssets.length) {
        uploadedImages = await uploadAssets(store, postDraft.newAssets);
      }
      const existingImages = postDraft.existingImages.filter(
        (image) => !postDraft.removedImages.some((removed) => sameImageRef(removed, image)),
      );
      const nextPost = normalizePost({
        ...(source || {}),
        id: source?.id || uid("post"),
        author: source?.author || actor,
        text: postDraft.text.trim(),
        images: [...existingImages, ...uploadedImages],
        pinned: Boolean(postDraft.pinned),
        archived: Boolean(postDraft.archived),
        createdAt: source?.createdAt || timestamp,
        createdBy: source?.createdBy || actor,
        updatedAt: timestamp,
        updatedBy: actor,
        startDate: postDraft.startDate || "",
        endDate: postDraft.endDate || postDraft.startDate || "",
        comments: source?.comments || [],
      });
      const result = await commitState((current) => {
        const nextPosts = current.posts.filter((post) => post.id !== nextPost.id);
        nextPosts.push(nextPost);
        return mergeStatePatch(current, {
          posts: nextPosts,
          settings: {
            ...current.settings,
            lastSyncedAt: timestamp,
            lastUpdatedBy: actor,
          },
        });
      }, source ? "Публикация обновлена" : "Публикация создана");
      if (!result) {
        if (uploadedImages.length) {
          await deleteImages(store, uploadedImages);
        }
        return;
      }
      if (postDraft.removedImages.length) {
        await deleteImages(store, postDraft.removedImages);
      }
      setPostDraft(null);
      setFeedComposerEmojiOpen(false);
    } catch (error) {
      if (uploadedImages.length) {
        try {
          await deleteImages(store, uploadedImages);
        } catch (_) {
          // ignore cleanup failure
        }
      }
      showToast(error.message || "Не удалось сохранить публикацию", "danger");
    }
  }, [actor, appState.posts, commitState, postDraft, showToast, store]);

  const handleDeletePost = useCallback((postId) => {
    const post = appState.posts.find((item) => item.id === postId);
    if (!post || !actor || !store) return;
    Alert.alert("Удалить публикацию?", "Удалим публикацию, комментарии и прикрепленные фото.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          const timestamp = nowISO();
          void commitState((current) => mergeStatePatch(current, {
            posts: current.posts.filter((item) => item.id !== postId),
            settings: {
              ...current.settings,
              lastSyncedAt: timestamp,
              lastUpdatedBy: actor,
            },
          }), "Публикация удалена");
          void deleteImages(store, post.images || []);
          if (commentsPostId === postId) {
            setCommentsPostId("");
          }
        },
      },
    ]);
  }, [actor, appState.posts, commentsPostId, commitState, store]);

  const handleTogglePostFlag = useCallback((post, key) => {
    if (!post || !actor) return;
    const timestamp = nowISO();
    void commitState((current) => mergeStatePatch(current, {
      posts: current.posts.map((item) => {
        if (item.id !== post.id) return item;
        return normalizePost({
          ...item,
          [key]: !item[key],
          updatedAt: timestamp,
          updatedBy: actor,
        });
      }),
      settings: {
        ...current.settings,
        lastSyncedAt: timestamp,
        lastUpdatedBy: actor,
      },
    }), key === "archived" ? "Статус архива обновлен" : "Статус закрепления обновлен");
  }, [actor, commitState]);

  const commentsPost = appState.posts.find((post) => post.id === commentsPostId) || null;

  const handleOpenComments = useCallback((postId) => {
    setCommentsPostId(postId);
    setCommentDraft({ text: "", parentId: "", commentId: "" });
  }, []);

  const handleSaveComment = useCallback(async () => {
    if (!commentsPost || !actor) return;
    const text = String(commentDraft.text || "").trim();
    if (!text) {
      showToast("Введите текст комментария", "danger");
      return;
    }
    const timestamp = nowISO();
    const editingComment = commentDraft.commentId
      ? (commentsPost.comments || []).find((comment) => comment.id === commentDraft.commentId)
      : null;
    const nextComment = normalizeComment({
      ...(editingComment || {}),
      id: editingComment?.id || uid("comment"),
      author: editingComment?.author || actor,
      text,
      parentId: commentDraft.parentId || "",
      createdAt: editingComment?.createdAt || timestamp,
      createdBy: editingComment?.createdBy || actor,
      updatedAt: timestamp,
      updatedBy: actor,
    });
    const result = await commitState((current) => {
      const nextPosts = current.posts.map((post) => {
        if (post.id !== commentsPost.id) return post;
        const nextComments = (post.comments || []).filter((comment) => comment.id !== nextComment.id);
        nextComments.push(nextComment);
        nextComments.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
        return normalizePost({
          ...post,
          comments: nextComments,
          updatedAt: timestamp,
          updatedBy: actor,
        });
      });
      return mergeStatePatch(current, {
        posts: nextPosts,
        settings: {
          ...current.settings,
          lastSyncedAt: timestamp,
          lastUpdatedBy: actor,
        },
      });
    }, editingComment ? "Комментарий обновлен" : "Комментарий отправлен");
    if (result) {
      setCommentDraft({ text: "", parentId: "", commentId: "" });
    }
  }, [actor, commentDraft, commentsPost, commitState, showToast]);

  const handleDeleteComment = useCallback((postId, commentId) => {
    if (!actor) return;
    Alert.alert("Удалить комментарий?", "Удалим выбранный комментарий и ответы на него.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          const timestamp = nowISO();
          const blocked = new Set([commentId]);
          const source = appState.posts.find((post) => post.id === postId);
          let changed = true;
          while (changed && source) {
            changed = false;
            (source.comments || []).forEach((comment) => {
              if (!blocked.has(comment.id) && blocked.has(comment.parentId)) {
                blocked.add(comment.id);
                changed = true;
              }
            });
          }
          void commitState((current) => mergeStatePatch(current, {
            posts: current.posts.map((post) => {
              if (post.id !== postId) return post;
              return normalizePost({
                ...post,
                comments: (post.comments || []).filter((comment) => !blocked.has(comment.id)),
                updatedAt: timestamp,
                updatedBy: actor,
              });
            }),
            settings: {
              ...current.settings,
              lastSyncedAt: timestamp,
              lastUpdatedBy: actor,
            },
          }), "Комментарий удален");
          setCommentDraft((current) => (current.commentId === commentId ? { text: "", parentId: "", commentId: "" } : current));
        },
      },
    ]);
  }, [actor, appState.posts, commitState]);

  const openMoneyEditor = useCallback((nextEditor) => setMoneyEditor(nextEditor), []);
  const closeMoneyEditor = useCallback(() => setMoneyEditor(null), []);

  const handleSaveMoneyEditor = useCallback(async () => {
    if (!moneyEditor || !actor) return;
    const timestamp = nowISO();
    if (moneyEditor.kind === "tab") {
      const title = String(moneyEditor.title || "").trim();
      if (!title) {
        showToast("Нужно название вкладки", "danger");
        return;
      }
      const source = appState.customTabs.find((tab) => tab.id === moneyEditor.id);
      const nextTab = normalizeMoneyTab({
        ...(source || {}),
        id: source?.id || uid("money-tab"),
        title,
        groups: source?.groups || [],
        createdAt: source?.createdAt || timestamp,
        createdBy: source?.createdBy || actor,
        updatedAt: timestamp,
        updatedBy: actor,
      });
      const result = await commitState((current) => {
        const nextTabs = current.customTabs.filter((tab) => tab.id !== nextTab.id);
        nextTabs.push(nextTab);
        return mergeStatePatch(current, {
          customTabs: nextTabs,
          moneyActiveTabId: nextTab.id,
          settings: {
            ...current.settings,
            lastSyncedAt: timestamp,
            lastUpdatedBy: actor,
          },
        });
      }, source ? "Вкладка обновлена" : "Вкладка добавлена");
      if (result) {
        setMoneyEditor(null);
      }
      return;
    }

    if (moneyEditor.kind === "group") {
      const title = String(moneyEditor.title || "").trim();
      if (!title || !moneyEditor.tabId) {
        showToast("Нужно название раздела", "danger");
        return;
      }
      const tab = appState.customTabs.find((item) => item.id === moneyEditor.tabId);
      const source = tab?.groups.find((group) => group.id === moneyEditor.id);
      const nextGroup = normalizeMoneyGroup({
        ...(source || {}),
        id: source?.id || uid("money-group"),
        title,
        items: source?.items || [],
        createdAt: source?.createdAt || timestamp,
        createdBy: source?.createdBy || actor,
        updatedAt: timestamp,
        updatedBy: actor,
      });
      const result = await commitState((current) => mergeStatePatch(current, {
        customTabs: current.customTabs.map((item) => {
          if (item.id !== moneyEditor.tabId) return item;
          const nextGroups = item.groups.filter((group) => group.id !== nextGroup.id);
          nextGroups.push(nextGroup);
          return normalizeMoneyTab({
            ...item,
            groups: nextGroups,
            updatedAt: timestamp,
            updatedBy: actor,
          });
        }),
        settings: {
          ...current.settings,
          lastSyncedAt: timestamp,
          lastUpdatedBy: actor,
        },
      }), source ? "Раздел обновлен" : "Раздел добавлен");
      if (result) {
        setExpandedGroups((current) => ({ ...current, [nextGroup.id]: true }));
        setMoneyEditor(null);
      }
      return;
    }

    if (moneyEditor.kind === "item") {
      const name = String(moneyEditor.name || "").trim();
      if (!name || !moneyEditor.tabId || !moneyEditor.groupId) {
        showToast("Нужно название дела", "danger");
        return;
      }
      const tab = appState.customTabs.find((item) => item.id === moneyEditor.tabId);
      const group = tab?.groups.find((item) => item.id === moneyEditor.groupId);
      const source = group?.items.find((item) => item.id === moneyEditor.id);
      const nextItem = normalizeMoneySubitem({
        ...(source || {}),
        id: source?.id || uid("money-subitem"),
        name,
        cost: String(moneyEditor.cost || ""),
        completed: Boolean(source?.completed),
        isNew: false,
        createdAt: source?.createdAt || timestamp,
        createdBy: source?.createdBy || actor,
        updatedAt: timestamp,
        updatedBy: actor,
      });
      const result = await commitState((current) => mergeStatePatch(current, {
        customTabs: current.customTabs.map((item) => {
          if (item.id !== moneyEditor.tabId) return item;
          return normalizeMoneyTab({
            ...item,
            groups: item.groups.map((row) => {
              if (row.id !== moneyEditor.groupId) return row;
              const nextItems = row.items.filter((subitem) => subitem.id !== nextItem.id);
              nextItems.push(nextItem);
              return normalizeMoneyGroup({
                ...row,
                items: sortMoneySubitems(nextItems),
                updatedAt: timestamp,
                updatedBy: actor,
              });
            }),
            updatedAt: timestamp,
            updatedBy: actor,
          });
        }),
        settings: {
          ...current.settings,
          lastSyncedAt: timestamp,
          lastUpdatedBy: actor,
        },
      }), source ? "Дело обновлено" : "Дело добавлено");
      if (result) {
        setExpandedGroups((current) => ({ ...current, [moneyEditor.groupId]: true }));
        setMoneyEditor(null);
      }
    }
  }, [actor, appState.customTabs, commitState, moneyEditor, showToast]);

  const handleDeleteMoneyEntity = useCallback((kind, ids) => {
    if (!actor) return;
    const titles = {
      tab: "вкладку",
      group: "раздел",
      item: "дело",
    };
    Alert.alert("Подтвердите удаление", `Удаляем ${titles[kind] || "элемент"} без возможности отката.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          const timestamp = nowISO();
          void commitState((current) => {
            if (kind === "tab") {
              const nextTabs = current.customTabs.filter((tab) => tab.id !== ids.tabId);
              return mergeStatePatch(current, {
                customTabs: nextTabs,
                moneyActiveTabId: nextTabs[0]?.id || "",
                settings: {
                  ...current.settings,
                  lastSyncedAt: timestamp,
                  lastUpdatedBy: actor,
                },
              });
            }
            if (kind === "group") {
              return mergeStatePatch(current, {
                customTabs: current.customTabs.map((tab) => {
                  if (tab.id !== ids.tabId) return tab;
                  return normalizeMoneyTab({
                    ...tab,
                    groups: tab.groups.filter((group) => group.id !== ids.groupId),
                    updatedAt: timestamp,
                    updatedBy: actor,
                  });
                }),
                settings: {
                  ...current.settings,
                  lastSyncedAt: timestamp,
                  lastUpdatedBy: actor,
                },
              });
            }
            return mergeStatePatch(current, {
              customTabs: current.customTabs.map((tab) => {
                if (tab.id !== ids.tabId) return tab;
                return normalizeMoneyTab({
                  ...tab,
                  groups: tab.groups.map((group) => {
                    if (group.id !== ids.groupId) return group;
                    return normalizeMoneyGroup({
                      ...group,
                      items: group.items.filter((item) => item.id !== ids.itemId),
                      updatedAt: timestamp,
                      updatedBy: actor,
                    });
                  }),
                  updatedAt: timestamp,
                  updatedBy: actor,
                });
              }),
              settings: {
                ...current.settings,
                lastSyncedAt: timestamp,
                lastUpdatedBy: actor,
              },
            });
          }, "Удалено");
          setMoneyEditor(null);
        },
      },
    ]);
  }, [actor, commitState]);

  const toggleMoneyItemCompleted = useCallback((tabId, groupId, itemId) => {
    if (!actor) return;
    const timestamp = nowISO();
    void commitState((current) => mergeStatePatch(current, {
      customTabs: current.customTabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        return normalizeMoneyTab({
          ...tab,
          groups: tab.groups.map((group) => {
            if (group.id !== groupId) return group;
            return normalizeMoneyGroup({
              ...group,
              items: sortMoneySubitems(group.items.map((item) => item.id === itemId ? normalizeMoneySubitem({
                ...item,
                completed: !item.completed,
                updatedAt: timestamp,
                updatedBy: actor,
              }) : item)),
              updatedAt: timestamp,
              updatedBy: actor,
            });
          }),
          updatedAt: timestamp,
          updatedBy: actor,
        });
      }),
      settings: {
        ...current.settings,
        lastSyncedAt: timestamp,
        lastUpdatedBy: actor,
      },
    }));
  }, [actor, commitState]);

  const renderScreen = () => {
    if (view === "calendar") {
      return html`
        <${CalendarScreen}
          theme=${theme}
          styles=${styles}
          state=${appState}
          selectedDate=${selectedDate}
          activeMonth=${activeMonth}
          actor=${actor}
          onSelectDate=${handleSelectDate}
          onShiftMonth=${(delta) => setAppState((current) => mergeStatePatch(current, { calendarMonth: shiftMonthKey(activeMonth, delta) }))}
          onCreateEvent=${openNewEvent}
          onEditEvent=${openEditEvent}
          onDeleteEvent=${handleDeleteEvent}
          onEditPost=${openEditPost}
          onDeletePost=${handleDeletePost}
          onOpenImage=${setLightboxImage}
        />
      `;
    }
    if (view === "planner") {
      return html`
        <${EventsScreen}
          theme=${theme}
          styles=${styles}
          state=${appState}
          selectedDate=${selectedDate}
          onSelectDate=${handleSelectDate}
          onCreateEvent=${openNewEvent}
          onEditEvent=${openEditEvent}
          onDeleteEvent=${handleDeleteEvent}
        />
      `;
    }
    if (view === "money") {
      return html`
        <${MoneyScreen}
          theme=${theme}
          styles=${styles}
          actor=${actor}
          state=${appState}
          activeTab=${activeTab}
          expandedGroups=${expandedGroups}
          onToggleGroup=${(groupId) => setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }))}
          onSelectTab=${(tabId) => setAppState((current) => mergeStatePatch(current, { moneyActiveTabId: tabId }))}
          onOpenEditor=${openMoneyEditor}
          onDeleteEntity=${handleDeleteMoneyEntity}
          onToggleItemCompleted=${toggleMoneyItemCompleted}
        />
      `;
    }
    if (view === "plans") {
      return html`
        <${FeedScreen}
          theme=${theme}
          styles=${styles}
          state=${appState}
          actor=${actor}
          onOpenComposer=${openNewPost}
          onOpenPost=${openEditPost}
          onDeletePost=${handleDeletePost}
          onTogglePostFlag=${handleTogglePostFlag}
          onOpenComments=${handleOpenComments}
          onOpenImage=${setLightboxImage}
          onSetFilters=${(patch) => setAppState((current) => mergeStatePatch(current, {
            feedFilters: { ...current.feedFilters, ...patch },
          }))}
        />
      `;
    }
    return null;
  };

  if (booting) {
    return html`
      <${SafeAreaView} style=${styles.root}>
        <${StatusBar} style=${theme.id === "dark" ? "light" : "dark"} />
        <${LoadingScreen} theme=${theme} styles=${styles} text="Поднимаем mobile-версию..." />
      <//>
    `;
  }

  if (!session) {
    return html`
      <${SafeAreaView} style=${styles.root}>
        <${StatusBar} style=${theme.id === "dark" ? "light" : "dark"} />
        <${LoginScreen}
          theme=${theme}
          styles=${styles}
          loading=${loadingRemote}
          onSubmit=${handleLogin}
        />
        ${toast ? html`<${ToastView} theme=${theme} toast=${toast} />` : null}
      <//>
    `;
  }

  return html`
    <${SafeAreaView} style=${styles.root}>
      <${StatusBar} style=${theme.id === "dark" ? "light" : "dark"} />
      <${View} style=${styles.screen}>
        <${View} style=${styles.screenHeader}>
          <${Text} style=${styles.screenTitle}>${APP_NAME}<//>
          <${View} style=${styles.screenHeaderMeta}>
            ${loadingRemote || savingRemote ? html`
              <${ActivityIndicator} size="small" color=${theme.blue} />
            ` : null}
            <${Text} style=${styles.screenHeaderMetaText}>${actor}<//>
          <//>
        <//>
        <${View} style=${styles.screenBody}>
          ${renderScreen()}
        <//>
        <${BottomNav}
          theme=${theme}
          styles=${styles}
          activeView=${view}
          settingsOpen=${settingsOpen}
          unread=${Boolean(unreadPosts.length)}
          onPress=${handleSwitchView}
          onSettingsPress=${() => setSettingsOpen((current) => !current)}
        />
      <//>
      ${toast ? html`<${ToastView} theme=${theme} toast=${toast} />` : null}
      ${eventDraft ? html`
        <${EventEditorModal}
          theme=${theme}
          styles=${styles}
          actor=${actor}
          draft=${eventDraft}
          onChange=${setEventDraft}
          onClose=${closeEventDraft}
          onSave=${handleSaveEvent}
          onDelete=${eventDraft.id ? () => handleDeleteEvent(eventDraft.id) : null}
        />
      ` : null}
      ${postDraft ? html`
        <${PostEditorModal}
          theme=${theme}
          styles=${styles}
          draft=${postDraft}
          emojiOpen=${feedComposerEmojiOpen}
          onToggleEmoji=${() => setFeedComposerEmojiOpen((current) => !current)}
          onChange=${setPostDraft}
          onClose=${closePostDraft}
          onSave=${handleSavePost}
          onPickImages=${handlePickImages}
          onToggleImage=${handleTogglePostImage}
        />
      ` : null}
      ${commentsPost ? html`
        <${CommentsModal}
          theme=${theme}
          styles=${styles}
          post=${commentsPost}
          actor=${actor}
          draft=${commentDraft}
          onChangeDraft=${setCommentDraft}
          onClose=${() => {
            setCommentsPostId("");
            setCommentDraft({ text: "", parentId: "", commentId: "" });
          }}
          onSave=${handleSaveComment}
          onDelete=${handleDeleteComment}
        />
      ` : null}
      ${moneyEditor ? html`
        <${MoneyEditorModal}
          theme=${theme}
          styles=${styles}
          editor=${moneyEditor}
          onChange=${setMoneyEditor}
          onClose=${closeMoneyEditor}
          onSave=${handleSaveMoneyEditor}
          onDelete=${handleDeleteMoneyEntity}
        />
      ` : null}
      ${settingsOpen ? html`
        <${SettingsDrawer}
          theme=${theme}
          styles=${styles}
          actor=${actor}
          themeId=${themeId}
          onThemeChange=${handleChangeTheme}
          storeConfig=${storeConfig}
          onRefresh=${() => refreshRemote()}
          onLogout=${handleLogout}
          onClose=${() => setSettingsOpen(false)}
        />
      ` : null}
      ${lightboxImage ? html`
        <${LightboxModal}
          theme=${theme}
          styles=${styles}
          image=${lightboxImage}
          onClose=${() => setLightboxImage(null)}
        />
      ` : null}
    <//>
  `;
}

function LoadingScreen({ theme, styles, text }) {
  return html`
    <${View} style=${styles.centered}>
      <${View} style=${styles.brandCircle}>
        <${Ionicons} name="sparkles" size=${36} color=${theme.blue} />
      <//>
      <${Text} style=${styles.centeredTitle}>${APP_NAME}<//>
      <${Text} style=${styles.centeredText}>${text}<//>
      <${ActivityIndicator} size="small" color=${theme.blue} />
    <//>
  `;
}

function LoginScreen({ theme, styles, loading, onSubmit }) {
  const [role, setRole] = useState("Lesha");
  const [password, setPassword] = useState("");
  return html`
    <${ScrollView} contentContainerStyle=${styles.loginScroll}>
      <${View} style=${styles.loginCard}>
        <${View} style=${styles.brandCircleLarge}>
          <${Ionicons} name="heart" size=${42} color=${theme.blue} />
        <//>
        <${Text} style=${styles.loginTitle}>${APP_NAME}<//>
        <${Text} style=${styles.loginSubtitle}>Одна Supabase-база, та же логика, теперь в настоящей mobile-оболочке.<//>
        <${Text} style=${styles.fieldLabel}>Профиль<//>
        <${View} style=${styles.segmentRow}>
          ${["Lesha", "Lera"].map((item) => html`
            <${Pressable}
              key=${item}
              onPress=${() => setRole(item)}
              style=${[styles.segmentButton, role === item ? styles.segmentButtonActive : null]}
            >
              <${Text} style=${[styles.segmentButtonText, role === item ? styles.segmentButtonTextActive : null]}>${item}<//>
            <//>
          `)}
        <//>
        <${Text} style=${styles.fieldLabel}>Пароль<//>
        <${TextInput}
          value=${password}
          onChangeText=${setPassword}
          secureTextEntry=${true}
          placeholder="Введите пароль"
          placeholderTextColor=${theme.textSoft}
          style=${styles.input}
        />
        <${Pressable}
          onPress=${() => onSubmit(role, password)}
          disabled=${loading}
          style=${[styles.primaryButton, loading ? styles.buttonDisabled : null]}
        >
          ${loading
            ? html`<${ActivityIndicator} size="small" color="#ffffff" />`
            : html`<${Text} style=${styles.primaryButtonText}>Войти<//>`}
        <//>
      <//>
    <//>
  `;
}

function BottomNav({ theme, styles, activeView, settingsOpen, unread, onPress, onSettingsPress }) {
  return html`
    <${View} style=${styles.bottomNav}>
      ${VIEWS.map((item) => {
        const isActive = item.id === activeView;
        const iconName = isActive ? item.iconActive : item.icon;
        const isFeed = item.id === "plans";
        return html`
          <${Pressable}
            key=${item.id}
            onPress=${() => onPress(item.id)}
            style=${styles.bottomNavItem}
          >
            <${View} style=${styles.bottomNavIconWrap}>
              <${Ionicons} name=${iconName} size=${22} color=${isActive ? theme.blue : theme.tabInactive} />
              ${isFeed && unread ? html`<${View} style=${styles.bottomNavBadge} />` : null}
            <//>
            <${Text} style=${[styles.bottomNavText, isActive ? styles.bottomNavTextActive : null]}>${item.label}<//>
          <//>
        `;
      })}
      <${Pressable}
        key="settings"
        onPress=${onSettingsPress}
        style=${styles.bottomNavItem}
      >
        <${View} style=${styles.bottomNavIconWrap}>
          <${Ionicons} name=${settingsOpen ? "settings" : "settings-outline"} size=${22} color=${settingsOpen ? theme.blue : theme.tabInactive} />
        <//>
        <${Text} style=${[styles.bottomNavText, settingsOpen ? styles.bottomNavTextActive : null]}>Настройки<//>
      <//>
    <//>
  `;
}

function CalendarScreen({
  theme,
  styles,
  state,
  selectedDate,
  activeMonth,
  actor,
  onSelectDate,
  onShiftMonth,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onEditPost,
  onDeletePost,
  onOpenImage,
}) {
  const cells = monthMatrix(activeMonth);
  const agenda = collectEventsForDate(state, selectedDate);
  return html`
    <${ScrollView} contentContainerStyle=${styles.scrollContent}>
      <${View} key="calendar-grid" style=${styles.sectionCard}>
        <${View} style=${styles.calendarHeaderRow}>
          <${Pressable} onPress=${() => onShiftMonth(-1)} style=${styles.iconButton}>
            <${Ionicons} name="chevron-back" size=${22} color=${theme.text} />
          <//>
          <${Text} style=${styles.sectionTitle}>${formatMonthTitle(activeMonth)}<//>
          <${Pressable} onPress=${() => onShiftMonth(1)} style=${styles.iconButton}>
            <${Ionicons} name="chevron-forward" size=${22} color=${theme.text} />
          <//>
        <//>
        <${View} style=${styles.weekRow}>
          ${WEEK_DAYS.map((item) => html`<${Text} key=${item} style=${styles.weekLabel}>${item}<//>`)}
        <//>
        <${View} style=${styles.calendarGrid}>
          ${cells.map((cell, index) => {
            if (!cell) {
              return html`<${View} key=${`empty-${index}`} style=${styles.calendarCellEmpty} />`;
            }
            const isSelected = cell === selectedDate;
            const preview = previewEventsForDate(state, cell);
            return html`
              <${Pressable}
                key=${cell}
                onPress=${() => onSelectDate(cell)}
                style=${styles.calendarCellWrap}
              >
                <${View}
                  style=${[
                    styles.calendarCell,
                    isSelected ? styles.calendarCellSelected : null,
                    isRfNonWorkingDay(cell) ? styles.calendarCellRest : null,
                  ]}
                >
                  <${Text} style=${[styles.calendarCellDay, isSelected ? styles.calendarCellDaySelected : null]}>${cell.slice(8, 10)}<//>
                  ${preview.map((item) => html`
                    <${View}
                      key=${item.id}
                      style=${[
                        styles.previewPill,
                        item.type === "planner" ? styles.previewPillPlanner : styles.previewPillPost,
                      ]}
                    >
                      <${Text} style=${styles.previewPillText} numberOfLines=${1}>${item.label}<//>
                    <//>
                  `)}
                <//>
              <//>
            `;
          })}
        <//>
      <//>
      <${View} key="calendar-agenda" style=${styles.sectionCard}>
        <${View} style=${styles.rowBetween}>
          <${View}>
            <${Text} style=${styles.sectionCaption}>Выбран день<//>
            <${Text} style=${styles.sectionTitle}>${formatDate(selectedDate)}<//>
          <//>
          <${Pressable} onPress=${() => onCreateEvent(selectedDate)} style=${styles.primaryInlineButton}>
            <${Ionicons} name="add" size=${18} color="#ffffff" />
            <${Text} style=${styles.primaryInlineButtonText}>Событие<//>
          <//>
        <//>
        ${agenda.length ? agenda.map((item) => item.type === "planner"
          ? html`
              <${View} key=${item.id} style=${styles.agendaCard}>
                <${View} style=${styles.rowBetweenStart}>
                  <${View} style=${styles.flexBox}>
                    <${Text} style=${styles.agendaType}>Событие<//>
                    <${Text} style=${styles.agendaTitle}>${getPlannerEntryPrimaryText(item.entry)}<//>
                    <${Text} style=${styles.agendaMeta}>${formatMoney(getPlannerEntryTotal(item.entry))}<//>
                  <//>
                  <${View} style=${styles.inlineActions}>
                    <${SmallIconButton} theme=${theme} icon="create-outline" onPress=${() => onEditEvent(item.entry)} />
                    <${SmallIconButton} theme=${theme} icon="trash-outline" tone="danger" onPress=${() => onDeleteEvent(item.entry.id)} />
                  <//>
                <//>
                ${getPlannerEntryRows(item.entry).map((row) => html`
                  <${View} key=${row.id} style=${styles.rowPreview}>
                    <${Text} style=${styles.rowPreviewText}>${row.text}<//>
                    <${Text} style=${styles.rowPreviewAmount}>${formatMoney(parseMoneyInput(row.amount))}<//>
                  <//>
                `)}
                <${Text} style=${styles.metaLine}>${actorStamp(item.entry.updatedBy, item.entry.updatedAt)}<//>
              <//>
            `
          : html`
              <${View} key=${item.id} style=${styles.agendaCard}>
                <${View} style=${styles.rowBetweenStart}>
                  <${View} style=${styles.flexBox}>
                    <${Text} style=${styles.agendaType}>Лента<//>
                    <${Text} style=${styles.agendaTitle} numberOfLines=${2}>${item.post.text || "Публикация"}<//>
                    <${Text} style=${styles.agendaMeta}>${formatFeedTimeMsk(item.post.updatedAt || item.post.createdAt)}<//>
                  <//>
                  ${isPostOwnedByActor(item.post, actor) ? html`
                    <${View} style=${styles.inlineActions}>
                      <${SmallIconButton} theme=${theme} icon="create-outline" onPress=${() => onEditPost(item.post)} />
                      <${SmallIconButton} theme=${theme} icon="trash-outline" tone="danger" onPress=${() => onDeletePost(item.post.id)} />
                    <//>
                  ` : null}
                <//>
                ${item.post.images?.length ? html`
                  <${ScrollView} horizontal=${true} showsHorizontalScrollIndicator=${false} style=${styles.horizontalMedia}>
                    ${item.post.images.map((image, imageIndex) => html`
                      <${Pressable}
                        key=${getMediaKey(image, imageIndex, item.post.id)}
                        style=${styles.agendaThumb}
                        onPress=${() => onOpenImage(image)}
                      >
                        <${Image}
                          source=${{ uri: imageSrc(image) }}
                          style=${styles.agendaThumbImage}
                        />
                      <//>
                    `)}
                  <//>
                ` : null}
              <//>
            `)
          : html`<${Text} key="calendar-agenda-empty" style=${styles.emptyText}>На этот день пока пусто.<//>`}
      <//>
    <//>
  `;
}

function EventsScreen({ styles, state, selectedDate, onSelectDate, onCreateEvent, onEditEvent, onDeleteEvent }) {
  const matchingEntries = state.plannerEntries
    .filter((entry) => dateMatchesEntry(entry, selectedDate))
    .sort((left, right) => getPlannerEntryTotal(right) - getPlannerEntryTotal(left));

  return html`
    <${ScrollView} contentContainerStyle=${styles.scrollContent}>
      <${View} key="events-controls" style=${styles.sectionCard}>
        <${View} style=${styles.rowBetween}>
          <${View}>
            <${Text} style=${styles.sectionCaption}>Рабочая дата<//>
            <${TextInput}
              value=${selectedDate}
              onChangeText=${onSelectDate}
              placeholder="2026-05-16"
              style=${styles.input}
              placeholderTextColor=${styles.placeholderColor}
            />
          <//>
          <${Pressable} onPress=${() => onCreateEvent(selectedDate)} style=${styles.primaryInlineButton}>
            <${Ionicons} name="add" size=${18} color="#ffffff" />
            <${Text} style=${styles.primaryInlineButtonText}>Добавить<//>
          <//>
        <//>
        <${View} style=${styles.quickDateRow}>
          ${[
            { label: "Вчера", delta: -1 },
            { label: "Сегодня", delta: 0 },
            { label: "Завтра", delta: 1 },
          ].map((item) => html`
            <${Pressable}
              key=${item.label}
              onPress=${() => onSelectDate(item.delta === 0 ? todayISO() : shiftIsoDate(todayISO(), item.delta))}
              style=${styles.pillButton}
            >
              <${Text} style=${styles.pillButtonText}>${item.label}<//>
            <//>
          `)}
        <//>
      <//>
      ${matchingEntries.length ? matchingEntries.map((entry) => html`
        <${View} key=${entry.id} style=${styles.sectionCard}>
          <${View} style=${styles.rowBetweenStart}>
            <${View} style=${styles.flexBox}>
              <${Text} style=${styles.sectionTitle}>${getPlannerEntryPrimaryText(entry)}<//>
              <${Text} style=${styles.sectionCaption}>${formatMoney(getPlannerEntryTotal(entry))}<//>
            <//>
            <${View} style=${styles.inlineActions}>
              <${SmallIconButton} icon="create-outline" onPress=${() => onEditEvent(entry)} />
              <${SmallIconButton} icon="trash-outline" tone="danger" onPress=${() => onDeleteEvent(entry.id)} />
            <//>
          <//>
          ${getPlannerEntryRows(entry).map((row) => html`
            <${View} key=${row.id} style=${styles.rowPreview}>
              <${Text} style=${styles.rowPreviewText}>${row.text}<//>
              <${Text} style=${styles.rowPreviewAmount}>${formatMoney(parseMoneyInput(row.amount))}<//>
            <//>
          `)}
        <//>
      `) : html`<${View} key="events-empty" style=${styles.emptyCard}><${Text} style=${styles.emptyText}>На эту дату событий еще нет.<//><//>`}
    <//>
  `;
}

function FeedScreen({ styles, state, actor, onOpenComposer, onOpenPost, onDeletePost, onTogglePostFlag, onOpenComments, onOpenImage, onSetFilters }) {
  const filters = state.feedFilters || DEFAULT_STATE.feedFilters;
  const posts = sortedPosts(clone(state.posts), filters);
  return html`
    <${ScrollView} contentContainerStyle=${styles.scrollContent}>
      <${View} key="feed-controls" style=${styles.sectionCard}>
        <${View} style=${styles.rowBetween}>
          <${Text} style=${styles.sectionTitle}>Лента<//>
          <${Pressable} onPress=${onOpenComposer} style=${styles.primaryInlineButton}>
            <${Ionicons} name="add" size=${18} color="#ffffff" />
            <${Text} style=${styles.primaryInlineButtonText}>Пост<//>
          <//>
        <//>
        <${View} style=${styles.segmentRow}>
          ${[
            { id: "active", label: "Лента" },
            { id: "archived", label: "Архив" },
          ].map((item) => html`
            <${Pressable}
              key=${item.id}
              onPress=${() => onSetFilters({ mode: item.id })}
              style=${[styles.segmentButton, filters.mode === item.id ? styles.segmentButtonActive : null]}
            >
              <${Text} style=${[styles.segmentButtonText, filters.mode === item.id ? styles.segmentButtonTextActive : null]}>${item.label}<//>
            <//>
          `)}
        <//>
      <//>
      ${posts.length ? posts.map((post) => {
        const authorTheme = getAuthorTheme(post.author);
        const isNew = isPostUnreadForActor(post, actor, state.settings);
        return html`
          <${View} key=${post.id} style=${styles.postCard}>
            <${View} style=${styles.rowBetweenStart}>
              <${View} style=${styles.authorRow}>
                <${View} style=${[styles.avatar, { backgroundColor: authorTheme.bg }]}>
                  <${Text} style=${styles.avatarText}>${initials(post.author)}<//>
                <//>
                <${View} style=${styles.flexBox}>
                  <${Text} style=${styles.postAuthor}>${post.author}<//>
                  <${Text} style=${styles.postMeta}>${formatFeedTimeMsk(post.updatedAt || post.createdAt)}<//>
                <//>
              <//>
              ${isNew ? html`<${View} style=${styles.newChip}><${Text} style=${styles.newChipText}>Новое<//><//>` : null}
            <//>
            ${post.text ? html`<${Text} style=${styles.postText}>${post.text}<//>` : null}
            ${(post.pinned || post.archived) ? html`
              <${View} style=${styles.statusRow}>
                ${post.pinned ? html`<${View} key="pinned" style=${styles.statusChip}><${Text} style=${styles.statusChipText}>Закреплено<//><//>` : null}
                ${post.archived ? html`<${View} key="archived" style=${styles.statusChip}><${Text} style=${styles.statusChipText}>Архив<//><//>` : null}
              <//>
            ` : null}
            ${post.images?.length ? html`
              <${View} style=${styles.feedGrid}>
                ${post.images.map((image, imageIndex) => html`
                  <${Pressable}
                    key=${getMediaKey(image, imageIndex, post.id)}
                    onPress=${() => onOpenImage(image)}
                    style=${styles.feedGridItem}
                  >
                    <${Image} source=${{ uri: imageSrc(image) }} style=${styles.feedImage} />
                  <//>
                `)}
              <//>
            ` : null}
            <${View} style=${styles.postActions}>
              <${Pressable} onPress=${() => onOpenComments(post.id)} style=${styles.actionChip}>
                <${Ionicons} name="chatbubble-outline" size=${16} color=${styles.actionChipIconColor} />
                <${Text} style=${styles.actionChipText}>${post.comments?.length || 0}<//>
              <//>
              ${isPostOwnedByActor(post, actor) ? html`
                <${Pressable} key="post-edit" onPress=${() => onOpenPost(post)} style=${styles.actionChip}>
                  <${Ionicons} name="create-outline" size=${16} color=${styles.actionChipIconColor} />
                  <${Text} style=${styles.actionChipText}>Изменить<//>
                <//>
                <${Pressable} key="post-pin" onPress=${() => onTogglePostFlag(post, "pinned")} style=${styles.actionChip}>
                  <${Ionicons} name="bookmark-outline" size=${16} color=${styles.actionChipIconColor} />
                  <${Text} style=${styles.actionChipText}>${post.pinned ? "Открепить" : "Закрепить"}<//>
                <//>
                <${Pressable} key="post-archive" onPress=${() => onTogglePostFlag(post, "archived")} style=${styles.actionChip}>
                  <${Ionicons} name="archive-outline" size=${16} color=${styles.actionChipIconColor} />
                  <${Text} style=${styles.actionChipText}>${post.archived ? "Вернуть" : "Архив"}<//>
                <//>
                <${Pressable} key="post-delete" onPress=${() => onDeletePost(post.id)} style=${styles.actionChipDanger}>
                  <${Ionicons} name="trash-outline" size=${16} color=${styles.actionChipDangerColor} />
                  <${Text} style=${styles.actionChipDangerText}>Удалить<//>
                <//>
              ` : null}
            <//>
          <//>
        `;
      }) : html`<${View} key="feed-empty" style=${styles.emptyCard}><${Text} style=${styles.emptyText}>Пока нет публикаций в этом режиме.<//><//>`}
    <//>
  `;
}

function MoneyScreen({ styles, state, activeTab, expandedGroups, onToggleGroup, onSelectTab, onOpenEditor, onDeleteEntity, onToggleItemCompleted }) {
  return html`
    <${ScrollView} contentContainerStyle=${styles.scrollContent}>
      <${View} key="money-tabs" style=${styles.sectionCard}>
        <${View} style=${styles.rowBetween}>
          <${Text} style=${styles.sectionTitle}>Планы<//>
          <${Pressable} onPress=${() => onOpenEditor(createMoneyEditor("tab"))} style=${styles.primaryInlineButton}>
            <${Ionicons} name="add" size=${18} color="#ffffff" />
            <${Text} style=${styles.primaryInlineButtonText}>Вкладка<//>
          <//>
        <//>
        <${ScrollView} horizontal=${true} showsHorizontalScrollIndicator=${false}>
          <${View} style=${styles.tabScroller}>
            ${state.customTabs.map((tab) => html`
              <${Pressable}
                key=${tab.id}
                onPress=${() => onSelectTab(tab.id)}
                style=${[styles.tabPill, activeTab?.id === tab.id ? styles.tabPillActive : null]}
              >
                <${Text} style=${[styles.tabPillText, activeTab?.id === tab.id ? styles.tabPillTextActive : null]}>
                  ${tab.title}
                <//>
              <//>
            `)}
          <//>
        <//>
      <//>
      ${activeTab ? html`
        <${View} key=${`money-tab-body-${activeTab.id}`}>
          <${View} key=${`money-tab-summary-${activeTab.id}`} style=${styles.sectionCard}>
            <${View} style=${styles.rowBetweenStart}>
              <${View} style=${styles.flexBox}>
                <${Text} style=${styles.sectionTitle}>${activeTab.title}<//>
                <${Text} style=${styles.sectionCaption}>${formatMoney(getMoneyTabTotal(activeTab))} • ${(activeTab.groups || []).length} ${pluralizeRu((activeTab.groups || []).length, "раздел", "раздела", "разделов")}<//>
              <//>
              <${View} style=${styles.inlineActions}>
                <${SmallIconButton} icon="create-outline" onPress=${() => onOpenEditor(createMoneyEditor("tab", activeTab))} />
                <${SmallIconButton} icon="trash-outline" tone="danger" onPress=${() => onDeleteEntity("tab", { tabId: activeTab.id })} />
              <//>
            <//>
            <${Pressable}
              onPress=${() => onOpenEditor(createMoneyEditor("group", {}, { tabId: activeTab.id }))}
              style=${styles.secondaryButton}
            >
              <${Ionicons} name="add-circle-outline" size=${18} color=${styles.secondaryButtonTextColor} />
              <${Text} style=${styles.secondaryButtonText}>Добавить раздел<//>
            <//>
          <//>
          ${(activeTab.groups || []).length
            ? activeTab.groups.map((group) => {
                const expanded = expandedGroups[group.id] !== false;
                const items = sortMoneySubitems(clone(group.items || []));
                return html`
                  <${View} key=${group.id} style=${styles.sectionCard}>
                    <${View} style=${styles.rowBetweenStart}>
                      <${Pressable} onPress=${() => onToggleGroup(group.id)} style=${styles.flexGrowRow}>
                        <${Ionicons} name=${expanded ? "chevron-down" : "chevron-forward"} size=${18} color=${styles.inlineIconColor} />
                        <${View} style=${styles.flexBox}>
                          <${Text} style=${styles.sectionTitle}>${group.title}<//>
                          <${Text} style=${styles.sectionCaption}>${formatMoney(getMoneyGroupTotal(group))} • ${getMoneyGroupCount(group)} ${pluralizeRu(getMoneyGroupCount(group), "дело", "дела", "дел")}<//>
                        <//>
                      <//>
                      <${View} style=${styles.inlineActions}>
                        <${SmallIconButton} icon="add" onPress=${() => onOpenEditor(createMoneyEditor("item", {}, { tabId: activeTab.id, groupId: group.id }))} />
                        <${SmallIconButton} icon="create-outline" onPress=${() => onOpenEditor(createMoneyEditor("group", group, { tabId: activeTab.id }))} />
                        <${SmallIconButton} icon="trash-outline" tone="danger" onPress=${() => onDeleteEntity("group", { tabId: activeTab.id, groupId: group.id })} />
                      <//>
                    <//>
                    ${expanded ? html`
                      <${View} key=${`group-body-${group.id}`}>
                        ${items.length ? items.map((item) => html`
                          <${View} key=${item.id} style=${styles.moneyItemRow}>
                            <${Pressable} onPress=${() => onToggleItemCompleted(activeTab.id, group.id, item.id)} style=${styles.checkboxWrap}>
                              <${Ionicons}
                                name=${item.completed ? "checkmark-circle" : "ellipse-outline"}
                                size=${22}
                                color=${item.completed ? styles.checkboxActiveColor : styles.checkboxColor}
                              />
                            <//>
                            <${View} style=${styles.flexBox}>
                              <${Text} style=${[styles.moneyItemTitle, item.completed ? styles.moneyItemDone : null]}>${item.name}<//>
                              <${Text} style=${styles.moneyItemMeta}>${formatMoney(parseMoneyInput(item.cost))}<//>
                            <//>
                            <${View} style=${styles.inlineActions}>
                              <${SmallIconButton} icon="create-outline" onPress=${() => onOpenEditor(createMoneyEditor("item", item, { tabId: activeTab.id, groupId: group.id }))} />
                              <${SmallIconButton} icon="trash-outline" tone="danger" onPress=${() => onDeleteEntity("item", { tabId: activeTab.id, groupId: group.id, itemId: item.id })} />
                            <//>
                          <//>
                        `) : html`<${Text} key=${`group-empty-${group.id}`} style=${styles.emptyText}>В этом разделе пока пусто.<//>`}
                      <//>
                    ` : null}
                  <//>
                `;
              })
            : html`<${View} key=${`money-tab-empty-${activeTab.id}`} style=${styles.emptyCard}><${Text} style=${styles.emptyText}>Создай первый раздел, и дальше уже будет легче дышать.<//><//>`}
            <//>
      ` : html`<${View} key="money-no-tabs" style=${styles.emptyCard}><${Text} style=${styles.emptyText}>Пока нет вкладок. Начнем с первой.<//><//>`}
    <//>
  `;
}

function SettingsScreen({ styles, actor, themeId, onThemeChange, onRefresh, onLogout, storeConfig }) {
  const payroll = actor ? getNearestPayroll(actor) : null;
  return html`
    <${ScrollView} contentContainerStyle=${styles.scrollContent}>
      <${View} key="settings-theme" style=${styles.sectionCard}>
        <${Text} style=${styles.sectionTitle}>Тема<//>
        <${View} style=${styles.themeList}>
          ${THEMES.map((item) => html`
            <${Pressable}
              key=${item.id}
              onPress=${() => onThemeChange(item.id)}
              style=${[styles.themeCard, themeId === item.id ? styles.themeCardActive : null]}
            >
              <${Text} style=${[styles.themeCardText, themeId === item.id ? styles.themeCardTextActive : null]}>${item.label}<//>
            <//>
          `)}
        <//>
      <//>
      <${View} key="settings-account" style=${styles.sectionCard}>
        <${Text} style=${styles.sectionTitle}>Данные аккаунта<//>
        <${Text} style=${styles.detailLine}>Профиль: ${actor || "Не выбран"}<//>
        ${payroll ? html`
          <${View} key="settings-payroll" style=${styles.payrollCard}>
            <${Text} style=${styles.payrollTitle}>Ближайшая зарплата<//>
            <${Text} style=${styles.payrollAmount}>${payroll.label} • ${formatMoney(payroll.amount)}<//>
            <${Text} style=${styles.payrollMeta}>${formatDate(payroll.date)}<//>
          <//>
        ` : null}
      <//>
      <${View} key="settings-connection" style=${styles.sectionCard}>
        <${Text} style=${styles.sectionTitle}>Подключение<//>
        <${Text} style=${styles.detailLine}>URL: ${storeConfig.url}<//>
        <${Text} style=${styles.detailLine}>Bucket: ${storeConfig.bucket}<//>
        <${Pressable} onPress=${onRefresh} style=${styles.secondaryButton}>
          <${Ionicons} name="refresh" size=${18} color=${styles.secondaryButtonTextColor} />
          <${Text} style=${styles.secondaryButtonText}>Обновить данные<//>
        <//>
      <//>
      <${Pressable} key="settings-logout" onPress=${onLogout} style=${styles.dangerButton}>
        <${Ionicons} name="log-out-outline" size=${18} color="#ffffff" />
        <${Text} style=${styles.primaryButtonText}>Выйти<//>
      <//>
    <//>
  `;
}

function SettingsDrawer({ styles, actor, themeId, onThemeChange, onRefresh, onLogout, storeConfig, onClose }) {
  return html`
    <${Modal} visible=${true} transparent=${true} animationType="fade" onRequestClose=${onClose}>
      <${View} style=${styles.settingsDrawerBackdrop}>
        <${Pressable} style=${styles.settingsDrawerShade} onPress=${onClose} />
        <${View} style=${styles.settingsDrawerPanel}>
          <${View} style=${styles.settingsDrawerHeader}>
            <${View}>
              <${Text} style=${styles.sectionCaption}>Данные аккаунта<//>
              <${Text} style=${styles.sectionTitle}>Настройки<//>
            <//>
            <${SmallIconButton} theme=${null} icon="close" onPress=${onClose} />
          <//>
          <${SettingsScreen}
            styles=${styles}
            actor=${actor}
            themeId=${themeId}
            onThemeChange=${onThemeChange}
            onRefresh=${onRefresh}
            onLogout=${onLogout}
            storeConfig=${storeConfig}
          />
        <//>
      <//>
    <//>
  `;
}

function EventEditorModal({ theme, styles, draft, actor, onChange, onClose, onSave, onDelete }) {
  const total = draft.rows.reduce((sum, row) => sum + parseMoneyInput(row.amount), 0);
  const setRepeatMode = (mode) => {
    onChange((current) => ({
      ...current,
      repeatMonthly: mode === "month" ? !current.repeatMonthly : false,
      repeatWeekly: mode === "week" ? !current.repeatWeekly : false,
      repeatYearly: mode === "year" ? !current.repeatYearly : false,
    }));
  };
  return html`
    <${Modal} visible=${true} transparent=${true} animationType="fade" onRequestClose=${onClose}>
      <${KeyboardAvoidingView} behavior=${Platform.OS === "ios" ? "padding" : undefined} style=${styles.modalOverlay}>
        <${Pressable} style=${styles.modalOverlayShade} onPress=${onClose} />
        <${View} style=${styles.modalCard}>
          <${View} style=${styles.modalHeader}>
            <${View} style=${styles.flexBox}>
              <${Text} style=${styles.modalTitle}>${draft.id ? "Редактировать событие" : "Новое событие"}<//>
              <${Text} style=${styles.modalSubtitle}>${actor}<//>
            <//>
            <${View} style=${styles.totalChip}>
              <${Text} style=${styles.totalChipText}>Итого: ${formatMoney(total)}<//>
            <//>
          <//>
          <${ScrollView} style=${styles.modalBody} contentContainerStyle=${styles.modalBodyContent}>
            <${Text} style=${styles.fieldLabel}>Дата<//>
            <${TextInput}
              value=${draft.date}
              onChangeText=${(value) => onChange((current) => ({ ...current, date: value }))}
              placeholder="2026-05-25"
              placeholderTextColor=${styles.placeholderColor}
              style=${styles.input}
            />
            <${Text} style=${styles.fieldLabel}>Строки события<//>
            ${draft.rows.map((row, index) => html`
              <${View} key=${row.id} style=${styles.rowEditor}>
                <${TextInput}
                  value=${row.text}
                  onChangeText=${(value) => onChange((current) => ({
                    ...current,
                    rows: current.rows.map((item) => item.id === row.id ? { ...item, text: value } : item),
                  }))}
                  placeholder="Название"
                  placeholderTextColor=${styles.placeholderColor}
                  style=${styles.inputFlex}
                />
                <${View} style=${styles.amountWrap}>
                  <${TextInput}
                    value=${row.amount}
                    onChangeText=${(value) => onChange((current) => ({
                      ...current,
                      rows: current.rows.map((item) => item.id === row.id ? { ...item, amount: value } : item),
                    }))}
                    placeholder="Сумма"
                    keyboardType="decimal-pad"
                    placeholderTextColor=${styles.placeholderColor}
                    style=${styles.amountInput}
                  />
                  <${Text} style=${styles.amountSuffix}>₽<//>
                <//>
                ${index > 0 ? html`
                  <${Pressable}
                    key=${`event-row-delete-${row.id}`}
                    onPress=${() => onChange((current) => ({
                      ...current,
                      rows: current.rows.filter((item) => item.id !== row.id),
                    }))}
                    style=${styles.iconButtonDanger}
                  >
                    <${Ionicons} name="trash-outline" size=${18} color=${styles.dangerIconColor} />
                  <//>
                ` : html`<${View} key=${`event-row-empty-action-${row.id}`} style=${styles.iconButtonGhost} />`}
              <//>
            `)}
            <${Pressable}
              onPress=${() => onChange((current) => ({ ...current, rows: [...current.rows, createPlannerDraftRow()] }))}
              style=${styles.secondaryButton}
            >
              <${Ionicons} name="add-circle-outline" size=${18} color=${styles.secondaryButtonTextColor} />
              <${Text} style=${styles.secondaryButtonText}>Добавить строку<//>
            <//>
            <${View} style=${styles.modalSwitchList}>
              <${SwitchRow}
                styles=${styles}
                label="Каждый месяц"
                value=${draft.repeatMonthly}
                onChange=${() => setRepeatMode("month")}
              />
              <${SwitchRow}
                styles=${styles}
                label="Каждую неделю"
                value=${draft.repeatWeekly}
                onChange=${() => setRepeatMode("week")}
              />
              <${SwitchRow}
                styles=${styles}
                label="Каждый год"
                value=${draft.repeatYearly}
                onChange=${() => setRepeatMode("year")}
              />
            <//>
          <//>
          <${View} style=${styles.modalFooter}>
            <${View}>
              ${onDelete ? html`
                <${Pressable} key="event-delete" onPress=${onDelete} style=${styles.footerDangerButton}>
                  <${Text} style=${styles.footerDangerText}>Удалить<//>
                <//>
              ` : null}
            <//>
            <${View} style=${styles.footerRight}>
              <${Pressable} onPress=${onClose} style=${styles.footerSecondaryButton}>
                <${Text} style=${styles.footerSecondaryText}>Отмена<//>
              <//>
              <${Pressable} onPress=${onSave} style=${styles.footerPrimaryButton}>
                <${Text} style=${styles.footerPrimaryText}>Сохранить<//>
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>
  `;
}

function PostEditorModal({ styles, draft, emojiOpen, onToggleEmoji, onChange, onClose, onSave, onPickImages, onToggleImage }) {
  return html`
    <${Modal} visible=${true} transparent=${true} animationType="fade" onRequestClose=${onClose}>
      <${KeyboardAvoidingView} behavior=${Platform.OS === "ios" ? "padding" : undefined} style=${styles.modalOverlay}>
        <${Pressable} style=${styles.modalOverlayShade} onPress=${onClose} />
        <${View} style=${styles.modalCardLarge}>
          <${View} style=${styles.modalHeader}>
            <${View} style=${styles.flexBox}>
              <${Text} style=${styles.modalTitle}>${draft.id ? "Редактировать публикацию" : "Новая публикация"}<//>
              <${Text} style=${styles.modalSubtitle}>${draft.author}<//>
            <//>
          <//>
          <${ScrollView} style=${styles.modalBody} contentContainerStyle=${styles.modalBodyContent}>
            <${Text} style=${styles.fieldLabel}>Текст<//>
            <${TextInput}
              value=${draft.text}
              onChangeText=${(value) => onChange((current) => ({ ...current, text: value }))}
              multiline=${true}
              placeholder="Что хотим рассказать?"
              placeholderTextColor=${styles.placeholderColor}
              style=${styles.textArea}
            />
            <${View} style=${styles.rowEditor}>
              <${View} style=${styles.flexBox}>
                <${Text} style=${styles.fieldLabel}>Начало<//>
                <${TextInput}
                  value=${draft.startDate}
                  onChangeText=${(value) => onChange((current) => ({ ...current, startDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor=${styles.placeholderColor}
                  style=${styles.input}
                />
              <//>
              <${View} style=${styles.flexBox}>
                <${Text} style=${styles.fieldLabel}>Конец<//>
                <${TextInput}
                  value=${draft.endDate}
                  onChangeText=${(value) => onChange((current) => ({ ...current, endDate: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor=${styles.placeholderColor}
                  style=${styles.input}
                />
              <//>
            <//>
            <${View} style=${styles.switchRow}>
              <${Text} style=${styles.fieldLabel}>Закрепить<//>
              <${Switch}
                value=${draft.pinned}
                onValueChange=${(value) => onChange((current) => ({ ...current, pinned: value }))}
              />
            <//>
            <${View} style=${styles.switchRow}>
              <${Text} style=${styles.fieldLabel}>Архив<//>
              <${Switch}
                value=${draft.archived}
                onValueChange=${(value) => onChange((current) => ({ ...current, archived: value }))}
              />
            <//>
            <${View} style=${styles.rowBetween}>
              <${Text} style=${styles.fieldLabel}>Фото<//>
              <${View} style=${styles.inlineActions}>
                <${Pressable} onPress=${onPickImages} style=${styles.secondaryChip}>
                  <${Ionicons} name="attach-outline" size=${16} color=${styles.secondaryButtonTextColor} />
                  <${Text} style=${styles.secondaryChipText}>Добавить<//>
                <//>
                <${Pressable} onPress=${onToggleEmoji} style=${styles.secondaryChip}>
                  <${Ionicons} name="happy-outline" size=${16} color=${styles.secondaryButtonTextColor} />
                  <${Text} style=${styles.secondaryChipText}>Эмодзи<//>
                <//>
              <//>
            <//>
            ${emojiOpen ? html`
              <${View} style=${styles.emojiRow}>
                ${FEED_EMOJIS.map((emoji) => html`
                  <${Pressable}
                    key=${emoji}
                    onPress=${() => onChange((current) => ({ ...current, text: `${current.text || ""}${emoji}` }))}
                    style=${styles.emojiChip}
                  >
                    <${Text} style=${styles.emojiChipText}>${emoji}<//>
                  <//>
                `)}
              <//>
            ` : null}
            ${(draft.existingImages.length || draft.newAssets.length) ? html`
              <${View} style=${styles.feedGrid}>
                ${draft.existingImages.map((image, imageIndex) => {
                  const removed = draft.removedImages.some((item) => sameImageRef(item, image));
                  return html`
                    <${Pressable}
                      key=${getMediaKey(image, imageIndex, "existing-post-image")}
                      onPress=${() => onToggleImage(image, true)}
                      style=${[styles.feedGridItem, removed ? styles.mediaMuted : null]}
                    >
                      <${Image} source=${{ uri: imageSrc(image) }} style=${styles.feedImage} />
                      <${View} style=${styles.mediaLabel}><${Text} style=${styles.mediaLabelText}>${removed ? "Вернуть" : getImageLabel(image)}<//><//>
                    <//>
                  `;
                })}
                ${draft.newAssets.map((asset, assetIndex) => html`
                  <${Pressable}
                    key=${getMediaKey(asset, assetIndex, "new-post-image")}
                    onPress=${() => onToggleImage(asset, false)}
                    style=${styles.feedGridItem}
                  >
                    <${Image} source=${{ uri: asset.uri }} style=${styles.feedImage} />
                    <${View} style=${styles.mediaLabel}><${Text} style=${styles.mediaLabelText}>${getImageLabel(asset)}<//><//>
                  <//>
                `)}
              <//>
            ` : null}
          <//>
          <${View} style=${styles.modalFooter}>
            <${View} />
            <${View} style=${styles.footerRight}>
              <${Pressable} onPress=${onClose} style=${styles.footerSecondaryButton}>
                <${Text} style=${styles.footerSecondaryText}>Отмена<//>
              <//>
              <${Pressable} onPress=${onSave} style=${styles.footerPrimaryButton}>
                <${Text} style=${styles.footerPrimaryText}>Сохранить<//>
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>
  `;
}

function CommentsModal({ styles, theme, post, actor, draft, onChangeDraft, onClose, onSave, onDelete }) {
  const comments = post.comments || [];
  const commentIds = new Set(comments.map((comment) => comment.id));
  const commentsByParent = new Map();
  comments.forEach((comment) => {
    const parentKey = comment.parentId && commentIds.has(comment.parentId) ? comment.parentId : "";
    const list = commentsByParent.get(parentKey) || [];
    list.push(comment);
    commentsByParent.set(parentKey, list);
  });
  const renderCommentThread = (parentId = "", depth = 0) => (commentsByParent.get(parentId) || []).map((comment) => {
    const own = isPostOwnedByActor({ createdBy: comment.createdBy, author: comment.author }, actor);
    const children = renderCommentThread(comment.id, depth + 1);
    return html`
      <${View} key=${comment.id} style=${[styles.commentCard, depth ? styles.commentCardChild : null]}>
        <${View} style=${styles.authorRow}>
          <${View} style=${[styles.avatarSmall, { backgroundColor: getAuthorTheme(comment.author).bg }]}>
            <${Text} style=${styles.avatarTextSmall}>${initials(comment.author)}<//>
          <//>
          <${View} style=${styles.flexBox}>
            <${Text} style=${styles.postAuthor}>${comment.author}<//>
            <${Text} style=${styles.postMeta}>${formatFeedTimeMsk(comment.updatedAt || comment.createdAt)}<//>
          <//>
        <//>
        <${Text} style=${styles.commentText}>${comment.text}<//>
        <${View} style=${styles.postActions}>
          <${Pressable}
            key="reply"
            onPress=${() => onChangeDraft({ text: "", parentId: comment.id, commentId: "" })}
            style=${styles.actionChip}
          >
            <${Ionicons} name="return-up-forward-outline" size=${16} color=${styles.actionChipIconColor} />
            <${Text} style=${styles.actionChipText}>Ответить<//>
          <//>
          ${own ? html`
            <${Pressable}
              key="edit"
              onPress=${() => onChangeDraft({ text: comment.text, parentId: comment.parentId || "", commentId: comment.id })}
              style=${styles.actionChip}
            >
              <${Ionicons} name="create-outline" size=${16} color=${styles.actionChipIconColor} />
              <${Text} style=${styles.actionChipText}>Изменить<//>
            <//>
            <${Pressable}
              key="delete"
              onPress=${() => onDelete(post.id, comment.id)}
              style=${styles.actionChipDanger}
            >
              <${Ionicons} name="trash-outline" size=${16} color=${styles.actionChipDangerColor} />
              <${Text} style=${styles.actionChipDangerText}>Удалить<//>
            <//>
          ` : null}
        <//>
        ${children.length ? html`
          <${View} key=${`children-${comment.id}`} style=${styles.commentChildren}>
            ${children}
          <//>
        ` : null}
      <//>
    `;
  });
  return html`
    <${Modal} visible=${true} transparent=${true} animationType="slide" onRequestClose=${onClose}>
      <${View} style=${styles.modalOverlay}>
        <${Pressable} style=${styles.modalOverlayShade} onPress=${onClose} />
        <${View} style=${styles.commentsSheet}>
          <${View} style=${styles.modalHeader}>
            <${View} style=${styles.flexBox}>
              <${Text} style=${styles.modalTitle}>Комментарии<//>
              <${Text} style=${styles.modalSubtitle}>${post.author}<//>
            <//>
          <//>
          <${ScrollView} style=${styles.modalBody} contentContainerStyle=${styles.modalBodyContent}>
            ${post.text ? html`<${Text} style=${styles.postText}>${post.text}<//>` : null}
            ${comments.length ? renderCommentThread() : html`<${Text} key="comments-empty" style=${styles.emptyText}>Пока без комментариев.<//>`}
          <//>
          <${View} style=${styles.commentsComposer}>
            ${draft.parentId ? html`
              <${Text} style=${styles.replyLine}>Ответ отправится в ветку комментария<//>
            ` : null}
            <${TextInput}
              value=${draft.text}
              onChangeText=${(value) => onChangeDraft({ ...draft, text: value })}
              multiline=${true}
              placeholder="Комментарий"
              placeholderTextColor=${styles.placeholderColor}
              style=${styles.commentInput}
            />
            <${View} style=${styles.footerRight}>
              <${Pressable} onPress=${onClose} style=${styles.footerSecondaryButton}>
                <${Text} style=${styles.footerSecondaryText}>Закрыть<//>
              <//>
              <${Pressable} onPress=${onSave} style=${styles.footerPrimaryButton}>
                <${Text} style=${styles.footerPrimaryText}>Отправить<//>
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>
  `;
}

function MoneyEditorModal({ styles, editor, onChange, onClose, onSave, onDelete }) {
  const titleMap = {
    tab: editor.id ? "Редактировать вкладку" : "Новая вкладка",
    group: editor.id ? "Редактировать раздел" : "Новый раздел",
    item: editor.id ? "Редактировать дело" : "Новое дело",
  };
  return html`
    <${Modal} visible=${true} transparent=${true} animationType="fade" onRequestClose=${onClose}>
      <${KeyboardAvoidingView} behavior=${Platform.OS === "ios" ? "padding" : undefined} style=${styles.modalOverlay}>
        <${Pressable} style=${styles.modalOverlayShade} onPress=${onClose} />
        <${View} style=${styles.modalCard}>
          <${View} style=${styles.modalHeader}>
            <${Text} style=${styles.modalTitle}>${titleMap[editor.kind]}<//>
          <//>
          <${View} style=${styles.modalBodyContent}>
            ${editor.kind === "item" ? html`
              <${View} key="money-editor-item-fields">
                <${Text} style=${styles.fieldLabel}>Название<//>
                <${TextInput}
                  value=${editor.name}
                  onChangeText=${(value) => onChange((current) => ({ ...current, name: value }))}
                  placeholder="Например, ипотека"
                  placeholderTextColor=${styles.placeholderColor}
                  style=${styles.input}
                />
                <${Text} style=${styles.fieldLabel}>Сумма<//>
                <${View} style=${styles.amountWrapFull}>
                  <${TextInput}
                    value=${editor.cost}
                    onChangeText=${(value) => onChange((current) => ({ ...current, cost: value }))}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    placeholderTextColor=${styles.placeholderColor}
                    style=${styles.amountInputFull}
                  />
                  <${Text} style=${styles.amountSuffix}>₽<//>
                <//>
              <//>
            ` : html`
              <${View} key="money-editor-title-fields">
                <${Text} style=${styles.fieldLabel}>Название<//>
                <${TextInput}
                  value=${editor.title}
                  onChangeText=${(value) => onChange((current) => ({ ...current, title: value }))}
                  placeholder="Название"
                  placeholderTextColor=${styles.placeholderColor}
                  style=${styles.input}
                />
              <//>
            `}
          <//>
          <${View} style=${styles.modalFooter}>
            <${View}>
              ${editor.id ? html`
                <${Pressable}
                  key="money-editor-delete"
                  onPress=${() => {
                    if (editor.kind === "tab") onDelete("tab", { tabId: editor.id });
                    if (editor.kind === "group") onDelete("group", { tabId: editor.tabId, groupId: editor.id });
                    if (editor.kind === "item") onDelete("item", { tabId: editor.tabId, groupId: editor.groupId, itemId: editor.id });
                  }}
                  style=${styles.footerDangerButton}
                >
                  <${Text} style=${styles.footerDangerText}>Удалить<//>
                <//>
              ` : null}
            <//>
            <${View} style=${styles.footerRight}>
              <${Pressable} onPress=${onClose} style=${styles.footerSecondaryButton}>
                <${Text} style=${styles.footerSecondaryText}>Отмена<//>
              <//>
              <${Pressable} onPress=${onSave} style=${styles.footerPrimaryButton}>
                <${Text} style=${styles.footerPrimaryText}>Сохранить<//>
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>
  `;
}

function LightboxModal({ styles, image, onClose }) {
  return html`
    <${Modal} visible=${true} transparent=${true} animationType="fade" onRequestClose=${onClose}>
      <${Pressable} style=${styles.lightbox} onPress=${onClose}>
        <${Image} source=${{ uri: imageSrc(image) }} style=${styles.lightboxImage} resizeMode="contain" />
      <//>
    <//>
  `;
}

function SmallIconButton({ theme, icon, tone = "default", onPress }) {
  const colors = {
    default: theme?.blue || "#2f6df6",
    danger: theme?.red || "#e45864",
  };
  return html`
    <${Pressable} onPress=${onPress} style=${{ padding: 8 }}>
      <${Ionicons} name=${icon} size=${18} color=${colors[tone]} />
    <//>
  `;
}

function SwitchRow({ styles, label, value, onChange }) {
  return html`
    <${View} style=${styles.switchRow}>
      <${Text} style=${styles.switchLabel}>${label}<//>
      <${Switch} value=${value} onValueChange=${onChange} />
    <//>
  `;
}

function ToastView({ theme, toast }) {
  const toneMap = {
    info: { bg: theme.panelStrong, color: theme.text },
    success: { bg: theme.green, color: "#ffffff" },
    danger: { bg: theme.red, color: "#ffffff" },
  };
  const palette = toneMap[toast.tone] || toneMap.info;
  return html`
    <${View}
      style=${{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 98,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: palette.bg,
        shadowColor: "#000000",
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 7,
      }}
    >
      <${Text} style=${{ color: palette.color, fontWeight: "700", fontSize: 14 }}>${toast.text}<//>
    <//>
  `;
}

function createStyles(theme, insets) {
  return {
    root: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    screenHeader: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
      backgroundColor: theme.bgAlt,
    },
    screenTitle: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "800",
    },
    screenHeaderMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    screenHeaderMetaText: {
      color: theme.textSoft,
      fontSize: 14,
      fontWeight: "600",
    },
    screenBody: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 28,
      backgroundColor: theme.bg,
    },
    centeredTitle: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "800",
      marginTop: 18,
      marginBottom: 8,
    },
    centeredText: {
      color: theme.textSoft,
      fontSize: 15,
      textAlign: "center",
      marginBottom: 18,
    },
    brandCircle: {
      width: 74,
      height: 74,
      borderRadius: 32,
      backgroundColor: theme.blueSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    brandCircleLarge: {
      width: 84,
      height: 84,
      borderRadius: 36,
      backgroundColor: theme.blueSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      alignSelf: "center",
    },
    loginScroll: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: theme.bg,
    },
    loginCard: {
      backgroundColor: theme.panel,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.line,
      padding: 22,
      shadowColor: "#000000",
      shadowOpacity: theme.id === "dark" ? 0.2 : 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    loginTitle: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "800",
      textAlign: "center",
    },
    loginSubtitle: {
      color: theme.textSoft,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 18,
    },
    fieldLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 8,
      marginTop: 10,
    },
    input: {
      height: inputHeight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      color: theme.text,
      fontSize: 16,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    inputFlex: {
      flex: 1,
      height: inputHeight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      color: theme.text,
      fontSize: 16,
      paddingHorizontal: 14,
    },
    textArea: {
      minHeight: 120,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      color: theme.text,
      fontSize: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      textAlignVertical: "top",
    },
    amountWrap: {
      width: 114,
      height: inputHeight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
    },
    amountWrapFull: {
      height: inputHeight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    amountInput: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      paddingVertical: 0,
    },
    amountInputFull: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      paddingVertical: 0,
    },
    amountSuffix: {
      color: theme.textSoft,
      fontSize: 16,
      fontWeight: "700",
      marginLeft: 8,
    },
    primaryButton: {
      height: 50,
      borderRadius: 14,
      backgroundColor: theme.blue,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    primaryButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "800",
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: theme.panelMuted,
      borderWidth: 1,
      borderColor: theme.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 14,
      marginTop: 8,
    },
    secondaryButtonText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    secondaryButtonTextColor: theme.text,
    dangerButton: {
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: theme.red,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 16,
      marginTop: 4,
    },
    segmentRow: {
      flexDirection: "row",
      marginBottom: 12,
    },
    segmentButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
      paddingHorizontal: 10,
    },
    segmentButtonActive: {
      backgroundColor: theme.blueSoft,
      borderColor: theme.blue,
    },
    segmentButtonText: {
      color: theme.textSoft,
      fontSize: 14,
      fontWeight: "700",
    },
    segmentButtonTextActive: {
      color: theme.blue,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 118,
    },
    sectionCard: {
      backgroundColor: theme.panel,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.line,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000000",
      shadowOpacity: theme.id === "dark" ? 0.16 : 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "800",
    },
    sectionCaption: {
      color: theme.textSoft,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 4,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowBetweenStart: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    flexBox: {
      flex: 1,
    },
    flexGrowRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    inlineActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    inlineIconColor: theme.textSoft,
    primaryInlineButton: {
      minHeight: 42,
      borderRadius: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.blue,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryInlineButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "800",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: theme.panelMuted,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonDanger: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: theme.redSoft,
      borderWidth: 1,
      borderColor: theme.red,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButtonGhost: {
      width: 42,
      height: 42,
    },
    dangerIconColor: theme.red,
    weekRow: {
      flexDirection: "row",
      marginTop: 14,
      marginBottom: 10,
    },
    weekLabel: {
      width: "14.285%",
      color: theme.textSoft,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
    },
    calendarHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -3,
    },
    calendarCellWrap: {
      width: "14.285%",
      paddingHorizontal: 3,
      paddingVertical: 4,
    },
    calendarCellEmpty: {
      width: "14.285%",
      paddingHorizontal: 3,
      paddingVertical: 4,
    },
    calendarCell: {
      minHeight: 92,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      paddingHorizontal: 6,
      paddingVertical: 6,
      overflow: "hidden",
    },
    calendarCellSelected: {
      borderColor: theme.blue,
      backgroundColor: theme.blueSoft,
    },
    calendarCellRest: {
      borderTopWidth: 3,
      borderTopColor: theme.calendarRest,
    },
    calendarCellDay: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 6,
    },
    calendarCellDaySelected: {
      color: theme.blue,
    },
    previewPill: {
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
      marginBottom: 4,
    },
    previewPillPlanner: {
      backgroundColor: theme.blueSoft,
    },
    previewPillPost: {
      backgroundColor: theme.redSoft,
    },
    previewPillText: {
      color: theme.text,
      fontSize: 10,
      fontWeight: "700",
    },
    agendaCard: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.line,
    },
    agendaType: {
      color: theme.textSoft,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    agendaTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "800",
      lineHeight: 22,
    },
    agendaMeta: {
      color: theme.textSoft,
      fontSize: 13,
      marginTop: 4,
    },
    rowPreview: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
    },
    rowPreviewText: {
      color: theme.text,
      fontSize: 14,
      flex: 1,
      marginRight: 12,
    },
    rowPreviewAmount: {
      color: theme.textSoft,
      fontSize: 14,
      fontWeight: "700",
    },
    metaLine: {
      color: theme.textSoft,
      fontSize: 12,
      marginTop: 10,
    },
    emptyCard: {
      backgroundColor: theme.panel,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.line,
      padding: 20,
    },
    emptyText: {
      color: theme.textSoft,
      fontSize: 15,
      lineHeight: 22,
    },
    quickDateRow: {
      flexDirection: "row",
      marginTop: 6,
    },
    pillButton: {
      marginRight: 8,
      minHeight: 38,
      borderRadius: 999,
      paddingHorizontal: 14,
      backgroundColor: theme.panelMuted,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: "center",
      justifyContent: "center",
    },
    pillButtonText: {
      color: theme.text,
      fontWeight: "700",
      fontSize: 13,
    },
    postCard: {
      backgroundColor: theme.panel,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.line,
      padding: 16,
      marginBottom: 12,
    },
    authorRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    avatarText: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "800",
    },
    avatarSmall: {
      width: 36,
      height: 36,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    avatarTextSmall: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "800",
    },
    postAuthor: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "800",
    },
    postMeta: {
      color: theme.textSoft,
      fontSize: 12,
      marginTop: 2,
    },
    postText: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 23,
      marginTop: 12,
    },
    newChip: {
      borderRadius: 999,
      backgroundColor: theme.red,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    newChipText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "800",
    },
    statusRow: {
      flexDirection: "row",
      marginTop: 10,
      flexWrap: "wrap",
    },
    statusChip: {
      borderRadius: 999,
      backgroundColor: theme.panelMuted,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 8,
      marginBottom: 8,
    },
    statusChipText: {
      color: theme.textSoft,
      fontSize: 12,
      fontWeight: "800",
    },
    feedGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
      marginTop: 12,
    },
    feedGridItem: {
      width: "50%",
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    feedImage: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 16,
      backgroundColor: theme.panelMuted,
    },
    mediaLabel: {
      marginTop: 6,
    },
    mediaLabelText: {
      color: theme.textSoft,
      fontSize: 11,
      fontWeight: "700",
    },
    mediaMuted: {
      opacity: 0.55,
    },
    postActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 10,
      marginHorizontal: -4,
    },
    actionChip: {
      minHeight: 36,
      borderRadius: 999,
      backgroundColor: theme.panelMuted,
      borderWidth: 1,
      borderColor: theme.line,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      margin: 4,
    },
    actionChipText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 6,
    },
    actionChipIconColor: theme.textSoft,
    actionChipDanger: {
      minHeight: 36,
      borderRadius: 999,
      backgroundColor: theme.redSoft,
      borderWidth: 1,
      borderColor: theme.red,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      margin: 4,
    },
    actionChipDangerText: {
      color: theme.red,
      fontSize: 13,
      fontWeight: "700",
      marginLeft: 6,
    },
    actionChipDangerColor: theme.red,
    commentsSheet: {
      marginTop: "auto",
      backgroundColor: theme.panel,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: theme.line,
      maxHeight: "88%",
      overflow: "hidden",
    },
    commentCard: {
      paddingBottom: 14,
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
    },
    commentCardChild: {
      marginLeft: 18,
      paddingLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: theme.line,
    },
    commentChildren: {
      marginTop: 12,
    },
    commentText: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 10,
    },
    replyLine: {
      color: theme.textSoft,
      fontSize: 12,
      marginTop: 8,
      marginBottom: 2,
    },
    commentsComposer: {
      borderTopWidth: 1,
      borderTopColor: theme.line,
      padding: 16,
      backgroundColor: theme.panelStrong,
    },
    commentInput: {
      minHeight: 74,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelMuted,
      color: theme.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
      textAlignVertical: "top",
      marginBottom: 12,
    },
    tabScroller: {
      flexDirection: "row",
      paddingTop: 12,
    },
    tabPill: {
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    tabPillActive: {
      borderColor: theme.blue,
      backgroundColor: theme.blueSoft,
    },
    tabPillText: {
      color: theme.textSoft,
      fontSize: 14,
      fontWeight: "700",
    },
    tabPillTextActive: {
      color: theme.blue,
    },
    moneyItemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.line,
    },
    checkboxWrap: {
      marginRight: 12,
    },
    checkboxColor: theme.textSoft,
    checkboxActiveColor: theme.green,
    moneyItemTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    moneyItemDone: {
      textDecorationLine: "line-through",
      color: theme.textSoft,
    },
    moneyItemMeta: {
      color: theme.textSoft,
      fontSize: 13,
      marginTop: 3,
    },
    themeList: {
      marginTop: 12,
    },
    themeCard: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelStrong,
      justifyContent: "center",
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    themeCardActive: {
      borderColor: theme.blue,
      backgroundColor: theme.blueSoft,
    },
    themeCardText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    themeCardTextActive: {
      color: theme.blue,
    },
    detailLine: {
      color: theme.textSoft,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
    },
    payrollCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.blueSoft,
    },
    payrollTitle: {
      color: theme.textSoft,
      fontSize: 13,
      fontWeight: "700",
    },
    payrollAmount: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "800",
      marginTop: 6,
    },
    payrollMeta: {
      color: theme.textSoft,
      fontSize: 13,
      marginTop: 4,
    },
    settingsDrawerBackdrop: {
      flex: 1,
      backgroundColor: theme.overlay,
      flexDirection: "row",
    },
    settingsDrawerShade: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    settingsDrawerPanel: {
      width: "88%",
      maxWidth: 420,
      height: "100%",
      backgroundColor: theme.bg,
      borderRightWidth: 1,
      borderRightColor: theme.line,
      shadowColor: "#000000",
      shadowOpacity: theme.id === "dark" ? 0.32 : 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 8, height: 0 },
      elevation: 8,
    },
    settingsDrawerHeader: {
      paddingHorizontal: 16,
      paddingTop: Math.max(insets.top, 12) + 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
      backgroundColor: theme.bgAlt,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      padding: 14,
      backgroundColor: theme.overlay,
    },
    modalOverlayShade: {
      ...Platform.select({
        default: {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
      }),
    },
    modalCard: {
      maxHeight: "90%",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panel,
      overflow: "hidden",
    },
    modalCardLarge: {
      maxHeight: "92%",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panel,
      overflow: "hidden",
    },
    modalHeader: {
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
      backgroundColor: theme.panelStrong,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "800",
    },
    modalSubtitle: {
      color: theme.textSoft,
      fontSize: 13,
      marginTop: 4,
    },
    totalChip: {
      borderRadius: 999,
      backgroundColor: theme.blueSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginLeft: 12,
    },
    totalChipText: {
      color: theme.blue,
      fontSize: 14,
      fontWeight: "800",
    },
    modalBody: {
      flexGrow: 0,
    },
    modalBodyContent: {
      padding: 18,
      paddingBottom: 24,
    },
    rowEditor: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 10,
    },
    modalSwitchList: {
      marginTop: 10,
      paddingBottom: 8,
    },
    switchRow: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    switchLabel: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    modalFooter: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: Math.max(insets.bottom, 10) + 8,
      borderTopWidth: 1,
      borderTopColor: theme.line,
      backgroundColor: theme.panelStrong,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
    },
    footerSecondaryButton: {
      minHeight: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      marginLeft: 8,
    },
    footerSecondaryText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    footerPrimaryButton: {
      minHeight: 42,
      borderRadius: 12,
      backgroundColor: theme.blue,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      marginLeft: 8,
    },
    footerPrimaryText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "800",
    },
    footerDangerButton: {
      minHeight: 42,
      borderRadius: 12,
      backgroundColor: theme.redSoft,
      borderWidth: 1,
      borderColor: theme.red,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    footerDangerText: {
      color: theme.red,
      fontSize: 14,
      fontWeight: "800",
    },
    lightbox: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.94)",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
    },
    lightboxImage: {
      width: "100%",
      height: "82%",
    },
    bottomNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingBottom: Math.max(insets.bottom, 10),
      paddingTop: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: theme.line,
      backgroundColor: theme.panelStrong,
    },
    bottomNavItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 56,
    },
    bottomNavIconWrap: {
      position: "relative",
      width: 24,
      height: 24,
      marginBottom: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    bottomNavBadge: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.red,
      right: -2,
      top: -1,
      borderWidth: 2,
      borderColor: theme.panelStrong,
    },
    bottomNavText: {
      color: theme.tabInactive,
      fontSize: 11,
      fontWeight: "700",
    },
    bottomNavTextActive: {
      color: theme.blue,
    },
    horizontalMedia: {
      marginTop: 12,
    },
    agendaThumb: {
      width: 88,
      height: 88,
      borderRadius: 14,
      marginRight: 8,
      backgroundColor: theme.panelMuted,
      overflow: "hidden",
    },
    agendaThumbImage: {
      width: "100%",
      height: "100%",
    },
    secondaryChip: {
      minHeight: 34,
      borderRadius: 999,
      backgroundColor: theme.panelMuted,
      borderWidth: 1,
      borderColor: theme.line,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      marginLeft: 8,
    },
    secondaryChipText: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "700",
      marginLeft: 4,
    },
    emojiRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 8,
      marginBottom: 4,
    },
    emojiChip: {
      minWidth: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelMuted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
      marginBottom: 8,
    },
    emojiChipText: {
      fontSize: 20,
    },
    placeholderColor: theme.textSoft,
  };
}

export default App;
