import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);

const STORAGE_KEY = "budget-flow-planner-react-v1";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHR1TZP8doS1WXuZlsQ5-d2DybpfAPBbYtzOblXp_VDMO2aIIOBiEofUacjLeF2TFFNg/exec";
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const THEMES = ["light", "paper", "dark"];
const VIEWS = ["planner", "plans", "dogs", "calendar", "ai-analysis"];
const DEEPSEEK_API_KEY = ""; // TODO: Add from env or settings
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const defaultState = {
  settings: {
    appsScriptUrl: APPS_SCRIPT_URL,
    syncToken: "",
    lastSyncedAt: "",
    theme: "light",
  },
  view: getRouteView(),
  calendarMonth: getCurrentMonth(),
  feedFilters: {
    search: "",
    month: "",
  },
  feedActiveTab: "active",  // NEW: Track active vs archive tab
  planner: {
    date: "",
    text: "",
    repeatMonthly: false,   // NEW: Repeat monthly option
    updatedAt: "",
  },
  dogs: {
    date: "",
    text: "",
    updatedAt: "",
    isLoading: false,       // NEW: Loading state for skeleton
    isSaving: false,        // NEW: Saving state to block actions
  },
  posts: [],
  aiAnalysis: {             // NEW: AI Analysis section state
    uploadedFile: null,
    originalData: [],
    categorizedData: [],
    customCategories: [],
    comments: {},
    analysisPrompt: "",
    analysisResult: "",
    isLoading: false,
    error: "",
  },
};

function App() {
  const [state, setState] = useState(() => loadState());
  const [loading, setLoading] = useState(true);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [plannerEditing, setPlannerEditing] = useState(false);
  const [dogsEditing, setDogsEditing] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);           // NEW: Post modal state
  const [postFullscreenImage, setPostFullscreenImage] = useState(null); // NEW: Fullscreen image viewer
  const [postFullscreenIndex, setPostFullscreenIndex] = useState(0);    // NEW: Current image index
  const [plannerDraft, setPlannerDraft] = useState(() => ({
    date: defaultState.planner.date,
    text: defaultState.planner.text,
    repeatMonthly: defaultState.planner.repeatMonthly,  // NEW
  }));
  const [dogsDraft, setDogsDraft] = useState(() => ({
    date: defaultState.dogs.date,
    text: defaultState.dogs.text,
  }));
  const [postDraft, setPostDraft] = useState({
    text: "",
    dateFrom: "",
    dateTo: "",
    imageUrl: "",
    file: null,
    pinned: false,                                      // NEW
    images: [],                                         // NEW: Multiple images support
  });
  const toastTimer = useRef(0);
  const themeMenuRef = useRef(null);
  const postModalRef = useRef(null);                    // NEW: Modal ref for click-outside detection
  const postFullscreenRef = useRef(null);              // NEW: Fullscreen image ref

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme || "light";
  }, [state.settings.theme]);

  useEffect(() => {
    document.body.dataset.view = state.view || "planner";
  }, [state.view]);

  useEffect(() => {
    const routeView = getRouteView();
    if (window.location.hash !== `#/${routeView}`) {
      window.location.hash = `/${routeView}`;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let isMounted = true;
    pullRemoteState(state.settings.appsScriptUrl, state.settings.syncToken)
      .then((remote) => {
        if (!isMounted || !remote) {
          return;
        }
        setState((current) => mergeState(remote, current.settings.appsScriptUrl, current.settings.syncToken, getRouteView()));
      })
      .catch((error) => {
        console.error(error);
        showToast("Не получилось загрузить данные из Apps Script.");
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard navigation for fullscreen image
  useEffect(() => {
    if (!postFullscreenImage) return;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const currentPost = state.posts.find((p) =>
          p.images && p.images.some((img) => getImageSrc(img, state.settings) === getImageSrc(postFullscreenImage, state.settings))
        );
        if (currentPost && currentPost.images) {
          if (event.key === "ArrowRight" && postFullscreenIndex < currentPost.images.length - 1) {
            setPostFullscreenImage(currentPost.images[postFullscreenIndex + 1]);
            setPostFullscreenIndex(postFullscreenIndex + 1);
          } else if (event.key === "ArrowLeft" && postFullscreenIndex > 0) {
            setPostFullscreenImage(currentPost.images[postFullscreenIndex - 1]);
            setPostFullscreenIndex(postFullscreenIndex - 1);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [postFullscreenImage, postFullscreenIndex, state.posts]);

  useEffect(() => {
    setPlannerDraft({
      date: state.planner.date || "",
      text: state.planner.text || "",
      repeatMonthly: state.planner.repeatMonthly || false,
    });
  }, [state.planner.date, state.planner.text, state.planner.repeatMonthly]);

  useEffect(() => {
    setDogsDraft({
      date: state.dogs.date || "",
      text: state.dogs.text || "",
    });
  }, [state.dogs.date, state.dogs.text]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setThemeMenuOpen(false);
      }
      // Close post modal on click outside
      if (postModalRef.current && !postModalRef.current.contains(event.target) && postModalOpen) {
        setPostModalOpen(false);
      }
      // Close fullscreen image on click outside
      if (postFullscreenRef.current && !postFullscreenRef.current.contains(event.target) && postFullscreenImage) {
        setPostFullscreenImage(null);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setThemeMenuOpen(false);
        setPlannerEditing(false);
        setDogsEditing(false);
        setPostModalOpen(false);
        setPostFullscreenImage(null);
      }
    }
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [postModalOpen, postFullscreenImage]);

  useEffect(() => {
    function handleHashChange() {
      const nextView = getRouteView();
      setState((current) => current.view === nextView ? current : { ...current, view: nextView });
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const filteredPosts = useMemo(() => {
    return [...state.posts]
      // Filter by archive status based on active tab
      .filter((post) => {
        if (state.feedActiveTab === "archived") {
          return post.archived === true;
        } else {
          return post.archived !== true;
        }
      })
      // Filter by search
      .filter((post) => {
        const search = state.feedFilters.search.trim().toLowerCase();
        if (!search) {
          return true;
        }
        return `${post.text} ${post.dateFrom} ${post.dateTo}`.toLowerCase().includes(search);
      })
      // Filter by month
      .filter((post) => {
        if (!state.feedFilters.month) {
          return true;
        }
        return expandDateRange(post.dateFrom, post.dateTo).some((date) => date.startsWith(state.feedFilters.month));
      })
      // Sort: pinned first (newest), then unpinned (newest)
      .sort((left, right) => {
        // Pinned posts come first
        if (left.pinned !== right.pinned) {
          return (left.pinned ? 0 : 1) - (right.pinned ? 0 : 1);
        }
        // Then sort by creation date (newest first)
        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [state.posts, state.feedFilters, state.feedActiveTab]);

  const metrics = useMemo(() => {
    return {
      plannerTitle: state.planner.date ? formatDate(state.planner.date) : "--",
      plannerSubtitle: state.planner.text
        ? `Обновлено ${formatDateTime(state.planner.updatedAt || new Date().toISOString())}`
        : "Нет сохраненной записи",
      postsCount: String(state.posts.length),
      postsSubtitle: state.posts.length === 1 ? "1 публикация" : `${state.posts.length} публикаций`,
      dogsTitle: state.dogs.date ? formatDate(state.dogs.date) : "--",
      dogsSubtitle: state.dogs.text
        ? `Обновлено ${formatDateTime(state.dogs.updatedAt || new Date().toISOString())}`
        : "Нет сохраненной записи",
      syncMode: "Drive",
      syncSubtitle: state.settings.lastSyncedAt
        ? `Автосохранение ${formatDateTime(state.settings.lastSyncedAt)}`
        : "Автосинхронизация включена",
    };
  }, [state]);

  const calendarCells = useMemo(() => buildCalendarCells(state.calendarMonth, state), [state.calendarMonth, state]);

  function showToast(message) {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => {
      setToast("");
    }, 2600);
  }

  async function commitState(updater, successMessage) {
    const nextState = typeof updater === "function" ? updater(state) : updater;
    setState(nextState);
    try {
      const saved = await saveRemoteState(nextState);
      setState((current) => ({
        ...current,
        settings: {
          ...current.settings,
          lastSyncedAt: saved,
        },
      }));
    } catch (error) {
      console.error(error);
      showToast("Не получилось синхронизировать данные с Apps Script.");
      return;
    }
    if (successMessage) {
      showToast(successMessage);
    }
  }

  async function handlePlannerSave() {
    const updatedAt = new Date().toISOString();
    setPlannerEditing(false);
    await commitState(
      {
        ...state,
        planner: {
          date: plannerDraft.date,
          text: plannerDraft.text.trim(),
          repeatMonthly: plannerDraft.repeatMonthly,
          updatedAt,
        },
      },
      "Планировщик трат сохранен."
    );
  }

  async function handleDogsSave() {
    const updatedAt = new Date().toISOString();
    setDogsEditing(false);

    // Set saving state to block user actions
    setState((current) => ({
      ...current,
      dogs: { ...current.dogs, isSaving: true },
    }));

    try {
      await commitState(
        {
          ...state,
          dogs: {
            date: dogsDraft.date,
            text: dogsDraft.text.trim(),
            updatedAt,
            isLoading: false,
            isSaving: false,
          },
        },
        "Раздел «Собаки» сохранен."
      );
    } finally {
      setState((current) => ({
        ...current,
        dogs: { ...current.dogs, isSaving: false },
      }));
    }
  }

  async function handlePostSubmit(event) {
    event.preventDefault();
    const text = postDraft.text.trim();
    const dateFrom = postDraft.dateFrom || todayIso();
    const dateTo = postDraft.dateTo && postDraft.dateTo >= dateFrom ? postDraft.dateTo : dateFrom;
    const images = [...(postDraft.images || [])];

    // Handle single image URL or file upload
    if (postDraft.imageUrl.trim()) {
      if (!images.some(img => img === postDraft.imageUrl.trim())) {
        images.push(postDraft.imageUrl.trim());
      }
    }

    if (postDraft.file) {
      if (postDraft.file instanceof File) {
        // File upload will be processed
        try {
          const uploadedUrl = await uploadImageFile(postDraft.file, state.settings);
          if (!images.includes(uploadedUrl)) {
            images.push(uploadedUrl);
          }
        } catch (error) {
          console.error("Image upload failed:", error);
          showToast("Не получилось загрузить фото.");
          return;
        }
      }
    }

    if (!text && images.length === 0) {
      showToast("Добавь текст или фото для публикации.");
      return;
    }

    const nextPost = {
      id: `post-${crypto.randomUUID()}`,
      text,
      author: "Лёша",                // Default author
      pinned: postDraft.pinned || false,
      archived: false,               // New posts are not archived
      images,                        // NEW: Support multiple images
      dateFrom,
      dateTo,
      createdAt: new Date().toISOString(),
    };

    // Clear modal and draft
    setPostModalOpen(false);
    setPostDraft({
      text: "",
      dateFrom: "",
      dateTo: "",
      imageUrl: "",
      file: null,
      pinned: false,
      images: [],
    });

    await commitState(
      {
        ...state,
        posts: [nextPost, ...state.posts],
      },
      "Публикация добавлена."
    );
  }

  async function handleDeletePost(postId) {
    await commitState(
      {
        ...state,
        posts: state.posts.filter((post) => post.id !== postId),
      },
      "Публикация удалена."
    );
  }

  async function handlePinPost(postId) {
    const updatedPosts = state.posts.map((post) =>
      post.id === postId ? { ...post, pinned: !post.pinned } : post
    );
    await commitState(
      {
        ...state,
        posts: updatedPosts,
      },
      !state.posts.find(p => p.id === postId).pinned ? "Публикация закреплена." : "Публикация откреплена."
    );
  }

  async function handleArchivePost(postId) {
    const updatedPosts = state.posts.map((post) =>
      post.id === postId ? { ...post, archived: !post.archived } : post
    );
    await commitState(
      {
        ...state,
        posts: updatedPosts,
      },
      !state.posts.find(p => p.id === postId).archived ? "Публикация в архиве." : "Публикация восстановлена."
    );
  }

  function handleThemeChange(theme) {
    setThemeMenuOpen(false);
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        theme,
      },
    }));
    showToast(`Тема переключена: ${capitalize(theme)}.`);
  }

  function navigateTo(view) {
    const nextView = normalizeView(view);
    if (window.location.hash !== `#/${nextView}`) {
      window.location.hash = `/${nextView}`;
    }
    setState((current) => ({ ...current, view: nextView }));
  }

  function renderPlannerSection() {
    const emptyText = "Пока пусто. Нажми «Редактировать», чтобы добавить заметку.";
    return html`
      <section className="section-stack">
        <article className="surface">
          <div className="surface__header">
            <div>
              <p className="eyebrow">Planner</p>
              <h2>Планировщик трат</h2>
            </div>
            <div className="editor-bar">
              <label className="field field--compact">
                <span>Дата</span>
                <input
                  type="date"
                  value=${plannerEditing ? plannerDraft.date : (state.planner.date || "")}
                  onInput=${(event) => setPlannerDraft((draft) => ({ ...draft, date: event.target.value }))}
                  disabled=${!plannerEditing}
                />
              </label>
              <button
                className=${plannerEditing ? "primary-button" : "ghost-button"}
                type="button"
                onClick=${() => plannerEditing ? handlePlannerSave() : setPlannerEditing(true)}
              >
                ${plannerEditing ? "Сохранить" : "Редактировать"}
              </button>
            </div>
          </div>
          <div className="note-meta">
            <span className="subtle-pill">${state.planner.date ? formatDate(state.planner.date) : "Дата не выбрана"}</span>
            ${state.planner.repeatMonthly ? html`<span className="subtle-pill">Повторяется ежемесячно</span>` : null}
          </div>
          <div className=${`inline-note ${!state.planner.text && !plannerEditing ? "is-empty" : ""} ${plannerEditing ? "is-editing" : ""}`}>
            ${plannerEditing
              ? html`
                  <label className="field">
                    <span>Текст</span>
                    <textarea
                      className="inline-note__editor"
                      value=${plannerDraft.text}
                      onInput=${(event) => setPlannerDraft((draft) => ({ ...draft, text: event.target.value }))}
                      placeholder="Здесь можно вести заметки по тратам, отдельным дням и быстрые рабочие записи."
                    />
                  </label>
                  <label className="field field--checkbox">
                    <input
                      type="checkbox"
                      checked=${plannerDraft.repeatMonthly}
                      onInput=${(event) => setPlannerDraft((draft) => ({ ...draft, repeatMonthly: event.target.checked }))}
                    />
                    <span>Повторять ежемесячно</span>
                  </label>
                `
              : (state.planner.text || emptyText)}
          </div>
        </article>
      </section>
    `;
  }

  function renderPlansSection() {
    return html`
      <section className="section-stack">
        <article className="surface">
          <div className="surface__header">
            <div>
              <p className="eyebrow">Plans</p>
              <h2>Лента</h2>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick=${() => setPostModalOpen(true)}
            >
              ➕ Создать пост
            </button>
          </div>

          <!-- Feed tabs: Active / Archive -->
          <div className="feed-tabs">
            <button
              className=${`feed-tab ${state.feedActiveTab === "active" ? "is-active" : ""}`}
              onClick=${() => setState((current) => ({ ...current, feedActiveTab: "active" }))}
            >
              Активные
            </button>
            <button
              className=${`feed-tab ${state.feedActiveTab === "archived" ? "is-active" : ""}`}
              onClick=${() => setState((current) => ({ ...current, feedActiveTab: "archived" }))}
            >
              Архив
            </button>
          </div>

          <!-- Search and filters -->
          <div className="inline-controls">
            <label className="field field--compact">
              <span>Поиск</span>
              <input
                type="search"
                value=${state.feedFilters.search}
                onInput=${(event) => setState((current) => ({
                  ...current,
                  feedFilters: { ...current.feedFilters, search: event.target.value },
                }))}
                placeholder="По тексту"
              />
            </label>
            <label className="field field--compact">
              <span>Месяц</span>
              <input
                type="month"
                value=${state.feedFilters.month}
                onInput=${(event) => setState((current) => ({
                  ...current,
                  feedFilters: { ...current.feedFilters, month: event.target.value },
                }))}
              />
            </label>
          </div>

          <!-- Feed posts list -->
          <div className="feed-list">
            ${filteredPosts.length
              ? filteredPosts.map((post) => html`
                  <article key=${post.id} className=${`feed-card ${post.pinned ? "is-pinned" : ""}`}>
                    <div className="feed-card__top">
                      <div className="feed-card__meta">
                        <span className="feed-card__author">${post.author || "Лёша"}</span>
                        <span className="subtle-pill">${formatDateRange(post.dateFrom, post.dateTo)}</span>
                      </div>
                      <div className="feed-card__actions">
                        <button
                          className="icon-button-small"
                          title="Закрепить"
                          onClick=${() => handlePinPost(post.id)}
                        >
                          ${post.pinned ? "📌" : "📍"}
                        </button>
                        <button
                          className="icon-button-small"
                          title="В архив"
                          onClick=${() => handleArchivePost(post.id)}
                        >
                          📦
                        </button>
                        <button
                          className="icon-button-small danger"
                          title="Удалить"
                          onClick=${() => handleDeletePost(post.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    ${post.text ? html`<div className="feed-card__text">${post.text}</div>` : null}
                    ${post.images && post.images.length > 0 ? html`
                      <div className="feed-card__images" style="grid-template-columns: repeat(${Math.min(post.images.length, 3)}, 1fr);">
                        ${post.images.map((image, index) => html`
                          <img
                            key=${index}
                            className="feed-card__image"
                            src=${getImageSrc(image, state.settings)}
                            alt="Публикация"
                            onClick=${() => {
                              setPostFullscreenImage(image);
                              setPostFullscreenIndex(index);
                            }}
                            style="cursor: pointer;"
                          />
                        `)}
                      </div>
                    ` : null}
                  </article>
                `)
              : html`
                  <div className="empty-state">
                    <h3>${state.feedActiveTab === "active" ? "Лента пока пустая" : "Архив пока пуст"}</h3>
                    <p>${state.feedActiveTab === "active" ? "Добавь первую публикацию с текстом, датами и фото при желании." : "Когда-нибудь архивные записи появятся здесь."}</p>
                  </div>
                `}
          </div>
        </article>
      </section>

      <!-- Post creation modal -->
      ${postModalOpen ? html`
        <div className="modal-overlay" ref=${postModalRef}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Новый пост</h2>
              <button
                className="modal-close"
                type="button"
                onClick=${() => setPostModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="modal-form" onSubmit=${handlePostSubmit}>
              <!-- Photo upload -->
              <div className="modal-section">
                <h3>Фото</h3>
                <div className="photo-upload">
                  <label className="photo-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onInput=${(event) => {
                        const files = Array.from(event.target.files || []);
                        files.forEach(file => {
                          // TODO: Queue file for upload
                          setPostDraft((draft) => ({
                            ...draft,
                            file: file,  // For now, handle last file
                          }));
                        });
                      }}
                      style="display: none;"
                    />
                    📸 Добавить фото
                  </label>
                  ${postDraft.imageUrl || postDraft.file ? html`
                    <div className="photo-preview">
                      ${postDraft.file ? html`<span>${postDraft.file.name}</span>` : null}
                      ${postDraft.imageUrl ? html`<span>${postDraft.imageUrl}</span>` : null}
                    </div>
                  ` : null}
                </div>

                <label className="field">
                  <span>Или ссылка на фото</span>
                  <input
                    type="url"
                    value=${postDraft.imageUrl}
                    onInput=${(event) => setPostDraft((draft) => ({ ...draft, imageUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <!-- Text -->
              <div className="modal-section">
                <label className="field">
                  <span>Текст</span>
                  <textarea
                    rows="5"
                    value=${postDraft.text}
                    onInput=${(event) => setPostDraft((draft) => ({ ...draft, text: event.target.value }))}
                    placeholder="Напишите что-нибудь"
                  />
                </label>
              </div>

              <!-- Emoji button -->
              <div className="modal-section">
                <button
                  className="ghost-button"
                  type="button"
                  onClick=${() => {
                    // Simple emoji insertion via prompt
                    const emoji = prompt("Введите смайлик (например: 😊 🎉 ❤️):");
                    if (emoji && emoji.trim()) {
                      setPostDraft((draft) => ({ ...draft, text: draft.text + " " + emoji }));
                    }
                  }}
                >
                  😊 Добавить смайлик
                </button>
              </div>

              <!-- Date range -->
              <div className="modal-section">
                <div className="split-fields">
                  <label className="field">
                    <span>Начало</span>
                    <input
                      type="date"
                      value=${postDraft.dateFrom}
                      onInput=${(event) => setPostDraft((draft) => ({ ...draft, dateFrom: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Окончание</span>
                    <input
                      type="date"
                      value=${postDraft.dateTo}
                      onInput=${(event) => setPostDraft((draft) => ({ ...draft, dateTo: event.target.value }))}
                    />
                  </label>
                </div>
              </div>

              <!-- Pin checkbox -->
              <div className="modal-section">
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    checked=${postDraft.pinned}
                    onInput=${(event) => setPostDraft((draft) => ({ ...draft, pinned: event.target.checked }))}
                  />
                  <span>Закрепить</span>
                </label>
              </div>

              <!-- Publish button -->
              <div className="modal-footer">
                <button className="primary-button" type="submit">Опубликовать</button>
              </div>
            </form>
          </div>
        </div>
      ` : null}

      <!-- Fullscreen image viewer -->
      ${postFullscreenImage ? html`
        <div
          className="image-fullscreen-overlay"
          ref=${postFullscreenRef}
          onClick=${() => setPostFullscreenImage(null)}
        >
          <button
            className="fullscreen-close"
            onClick=${() => setPostFullscreenImage(null)}
          >
            ✕
          </button>
          <img
            src=${getImageSrc(postFullscreenImage, state.settings)}
            alt="Fullscreen"
            className="fullscreen-image"
            onClick=${(e) => e.stopPropagation()}
          />
        </div>
      ` : null}
    `;
  }

  function renderDogsSection() {
    const emptyText = "Пока пусто. Здесь можно вести отдельные заметки по этому разделу.";
    const isDisabled = state.dogs.isSaving;

    return html`
      <section className="section-stack">
        <article className="surface">
          <div className="surface__header">
            <div>
              <p className="eyebrow">Dogs</p>
              <h2>Собаки</h2>
            </div>
            <div className="editor-bar">
              <label className="field field--compact">
                <span>Дата</span>
                <input
                  type="date"
                  value=${dogsEditing ? dogsDraft.date : (state.dogs.date || "")}
                  onInput=${(event) => !isDisabled && setDogsDraft((draft) => ({ ...draft, date: event.target.value }))}
                  disabled=${!dogsEditing || isDisabled}
                />
              </label>
              <button
                className=${dogsEditing ? "primary-button" : "ghost-button"}
                type="button"
                onClick=${() => dogsEditing ? handleDogsSave() : setDogsEditing(true)}
                disabled=${isDisabled}
              >
                ${isDisabled ? "⏳ Сохранение..." : (dogsEditing ? "Сохранить" : "Редактировать")}
              </button>
            </div>
          </div>
          <div className="note-meta">
            <span className="subtle-pill">${state.dogs.date ? formatDate(state.dogs.date) : "Дата не выбрана"}</span>
            ${state.dogs.isLoading ? html`<span className="subtle-pill">Загружаю...</span>` : null}
          </div>

          <!-- Loading skeleton -->
          ${state.dogs.isLoading ? html`
            <div className="section-loading">
              <div className="skeleton-block" style="height: 300px;"></div>
            </div>
          ` : null}

          <!-- Content or save overlay -->
          ${isDisabled ? html`<div className="save-overlay"></div>` : null}

          <div className=${`inline-note ${!state.dogs.text && !dogsEditing ? "is-empty" : ""} ${dogsEditing ? "is-editing" : ""} ${isDisabled ? "is-saving" : ""}`}>
            ${dogsEditing
              ? html`
                  <label className="field">
                    <span>Текст</span>
                    <textarea
                      className="inline-note__editor"
                      value=${dogsDraft.text}
                      onInput=${(event) => !isDisabled && setDogsDraft((draft) => ({ ...draft, text: event.target.value }))}
                      disabled=${isDisabled}
                      placeholder="Отдельный редактор для раздела «Собаки»."
                    />
                  </label>
                `
              : (state.dogs.text || emptyText)}
          </div>
        </article>
      </section>
    `;
  }

  function renderCalendarSection() {
    return html`
      <section className="section-stack">
        <article className="surface">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Calendar</p>
              <h2>Проверка плана по датам</h2>
            </div>
            <div className="inline-controls">
              <label className="field field--compact">
                <span>Показывать месяц</span>
                <input
                  type="month"
                  value=${state.calendarMonth}
                  onInput=${(event) => setState((current) => ({
                    ...current,
                    calendarMonth: event.target.value || getCurrentMonth(),
                  }))}
                />
              </label>
            </div>
          </div>
          <div className="calendar-shell">
            <div className="calendar-grid calendar-grid--weekdays">
              ${WEEKDAYS.map((weekday) => html`<div key=${weekday} className="weekday-cell">${weekday}</div>`)}
            </div>
            <div className="calendar-grid">
              ${calendarCells.map((cell) => html`
                <article key=${cell.key} className=${`calendar-cell ${cell.muted ? "is-muted" : ""} ${cell.today ? "is-today" : ""}`}>
                  <span className="calendar-date">${cell.day}</span>
                  <div className="calendar-events">
                    ${cell.events.slice(0, 4).map((event) => html`
                      <div key=${event.key} className=${`calendar-event calendar-event--${event.tone}`}>${event.label}</div>
                    `)}
                    ${cell.events.length > 4 ? html`<div className="calendar-more">+${cell.events.length - 4} еще</div>` : null}
                  </div>
                </article>
              `)}
            </div>
          </div>
        </article>
      </section>
    `;
  }

  function renderAIAnalysisSection() {
    return html`
      <section className="section-stack">
        <article className="surface">
          <div className="surface__header">
            <div>
              <p className="eyebrow">AI Analysis</p>
              <h2>ИИ-анализ</h2>
            </div>
          </div>

          ${!state.aiAnalysis.originalData || state.aiAnalysis.originalData.length === 0 ? html`
            <!-- Upload CSV section -->
            <div className="ai-upload-section">
              <h3>Загрузить CSV файл</h3>
              <label className="ai-upload-area">
                <input
                  type="file"
                  accept=".csv"
                  onInput=${async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      setState((current) => ({
                        ...current,
                        aiAnalysis: { ...current.aiAnalysis, isLoading: true, error: "" },
                      }));
                      const text = await file.text();
                      const rows = text.split("\n").filter(r => r.trim());
                      const headers = rows[0].split(",");
                      const data = rows.slice(1).map((row, index) => ({
                        id: `row-${index}`,
                        originalData: row.split(",").reduce((acc, val, i) => {
                          acc[headers[i]?.trim() || `col${i}`] = val.trim();
                          return acc;
                        }, {}),
                        suggestedCategory: "",
                        finalCategory: "",
                        comment: "",
                      }));
                      setState((current) => ({
                        ...current,
                        aiAnalysis: { ...current.aiAnalysis, originalData: data, uploadedFile: file.name },
                      }));
                      showToast("CSV файл загружен успешно. Отправляю на анализ ИИ...");
                      // TODO: Call AI API here
                    } catch (error) {
                      setState((current) => ({
                        ...current,
                        aiAnalysis: { ...current.aiAnalysis, error: "Ошибка загрузки файла", isLoading: false },
                      }));
                      showToast("Не получилось загрузить файл.");
                    }
                  }}
                  style="display: none;"
                />
                📄 Выберите CSV файл или перетащите сюда
              </label>
            </div>
          ` : html`
            <!-- Analysis results section -->
            <div className="ai-analysis-results">
              <h3>Категоризация</h3>

              ${state.aiAnalysis.isLoading ? html`
                <div className="ai-loading-skeleton">
                  <div className="skeleton-block"></div>
                  <div className="skeleton-block"></div>
                  <div className="skeleton-block"></div>
                </div>
              ` : html`
                <div className="ai-categories">
                  ${Array.from(new Set(state.aiAnalysis.originalData.map(item => item.suggestedCategory || "Без категории"))).map(category => html`
                    <div className="ai-category-block" key=${category}>
                      <h4>${category}</h4>
                      <div className="ai-category-items">
                        ${state.aiAnalysis.originalData
                          .filter(item => (item.suggestedCategory || "Без категории") === category)
                          .map(item => html`
                            <div className="ai-item" key=${item.id}>
                              <div className="ai-item-content">
                                ${Object.entries(item.originalData).map(([key, value]) => html`
                                  <div key=${key} className="ai-item-field">
                                    <strong>${key}:</strong> ${value}
                                  </div>
                                `)}
                              </div>
                              <textarea
                                placeholder="Добавить комментарий"
                                value=${item.comment || ""}
                                onInput=${(event) => {
                                  setState((current) => ({
                                    ...current,
                                    aiAnalysis: {
                                      ...current.aiAnalysis,
                                      comments: { ...current.aiAnalysis.comments, [item.id]: event.target.value },
                                    },
                                  }));
                                }}
                              />
                            </div>
                          `)}
                      </div>
                    </div>
                  `)}
                </div>

                <!-- Send to AI for analysis -->
                <div className="ai-analysis-section">
                  <h3>Запрос анализа</h3>
                  <textarea
                    className="ai-prompt-input"
                    value=${state.aiAnalysis.analysisPrompt}
                    onInput=${(event) => setState((current) => ({
                      ...current,
                      aiAnalysis: { ...current.aiAnalysis, analysisPrompt: event.target.value },
                    }))}
                    placeholder="Опишите, как вы хотели бы проанализировать эти данные"
                    rows="4"
                  />
                  <button
                    className="primary-button"
                    type="button"
                    onClick=${async () => {
                      // TODO: Call AI API with analysis prompt
                      showToast("Отправка запроса на анализ...");
                    }}
                  >
                    Отправить на анализ
                  </button>
                </div>

                ${state.aiAnalysis.analysisResult ? html`
                  <div className="ai-result-section">
                    <h3>Результат анализа</h3>
                    <div className="ai-result-text">${state.aiAnalysis.analysisResult}</div>
                  </div>
                ` : null}
              `}
            </div>
          `}
        </article>
      </section>
    `;
  }

  function renderCurrentPage() {
    if (state.view === "plans") {
      return html`<section id="plansPage">${renderPlansSection()}</section>`;
    }
    if (state.view === "dogs") {
      return html`<section id="dogsPage">${renderDogsSection()}</section>`;
    }
    if (state.view === "calendar") {
      return html`<section id="calendarPage">${renderCalendarSection()}</section>`;
    }
    if (state.view === "ai-analysis") {
      return html`<section id="aiAnalysisPage">${renderAIAnalysisSection()}</section>`;
    }
    return html`<section id="plannerPage">${renderPlannerSection()}</section>`;
  }

  return html`
    <div className="app-shell">
      <header>
        <div className="topbar">
          <div className="brand">
            <span className="brand__dot"></span>
            <div>
              <p className="eyebrow">Budget planning workspace</p>
              <h1>Budget Flow Planner</h1>
            </div>
          </div>
          <div className="topbar__actions">
            <div className="theme-menu" ref=${themeMenuRef}>
              <button
                className="icon-button"
                type="button"
                aria-haspopup="true"
                aria-expanded=${themeMenuOpen ? "true" : "false"}
                onClick=${() => setThemeMenuOpen((open) => !open)}
              >
                ◐
              </button>
              ${themeMenuOpen ? html`
                <div className="theme-menu__list">
                  ${THEMES.map((theme) => html`
                    <button
                      key=${theme}
                      className=${`theme-option ${state.settings.theme === theme ? "is-active" : ""}`}
                      type="button"
                      onClick=${() => handleThemeChange(theme)}
                    >
                      ${capitalize(theme)}
                    </button>
                  `)}
                </div>
              ` : null}
            </div>
          </div>
        </div>

        <nav className="section-nav">
          ${[
            ["planner", "Планировщик трат"],
            ["plans", "Лента"],
            ["dogs", "Собаки"],
            ["calendar", "Календарь"],
            ["ai-analysis", "ИИ-анализ"],
          ].map(([value, label]) => html`
            <a
              key=${value}
              href=${`#/${value}`}
              className=${`section-nav__button ${state.view === value ? "is-active" : ""}`}
              onClick=${(event) => {
                event.preventDefault();
                navigateTo(value);
              }}
            >
              ${label}
            </a>
          `)}
        </nav>

        <section className="metrics-grid">
          <article className="metric-card metric-card--planner">
            <span>Планировщик трат</span>
            <strong>${metrics.plannerTitle}</strong>
            <small>${metrics.plannerSubtitle}</small>
          </article>
          <article className="metric-card metric-card--plans">
            <span>Лента</span>
            <strong>${metrics.postsCount}</strong>
            <small>${metrics.postsSubtitle}</small>
          </article>
          <article className="metric-card metric-card--dogs">
            <span>Собаки</span>
            <strong>${metrics.dogsTitle}</strong>
            <small>${metrics.dogsSubtitle}</small>
          </article>
          <article className="metric-card metric-card--sync">
            <span>Синхронизация</span>
            <strong>${metrics.syncMode}</strong>
            <small>${metrics.syncSubtitle}</small>
          </article>
        </section>
      </header>

      ${loading ? html`<div className="loading-state">Загружаю данные из Apps Script...</div>` : null}

      <main className="section-stack">
        ${renderCurrentPage()}
      </main>

      <div className=${`toast ${toast ? "is-visible" : ""}`}>${toast}</div>
    </div>
  `;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(defaultState);
    }
    return mergeState(JSON.parse(raw), APPS_SCRIPT_URL, "", getRouteView());
  } catch (error) {
    console.error(error);
    return structuredClone(defaultState);
  }
}

function mergeState(raw, appsScriptUrl, syncToken, forcedView) {
  const next = structuredClone(defaultState);
  next.settings = {
    ...next.settings,
    ...(raw.settings || {}),
    appsScriptUrl: appsScriptUrl || raw.settings?.appsScriptUrl || APPS_SCRIPT_URL,
    syncToken: syncToken || raw.settings?.syncToken || "",
  };
  next.view = normalizeView(forcedView || raw.view || next.view);
  next.calendarMonth = raw.calendarMonth || next.calendarMonth;
  next.feedFilters = {
    search: raw.feedFilters?.search || raw.search || "",
    month: raw.feedFilters?.month || raw.monthFilter || "",
  };
  next.feedActiveTab = raw.feedActiveTab || "active";  // NEW
  next.planner = {
    ...next.planner,
    ...(raw.planner || {}),
    repeatMonthly: raw.planner?.repeatMonthly || false,  // NEW
  };
  next.dogs = {
    ...next.dogs,
    ...(raw.dogs || {}),
    isLoading: false,       // Reset loading states
    isSaving: false,
  };

  // Migrate old posts to new structure
  next.posts = Array.isArray(raw.posts) ? raw.posts.map(post => {
    // Backward compatibility: convert old single image to images array
    const images = [];
    if (post.image) {
      images.push(typeof post.image === 'string' ? post.image : post.image);
    }
    return {
      ...post,
      author: post.author || "Лёша",              // Default author
      pinned: post.pinned || false,                // Default not pinned
      archived: post.archived || false,            // Default not archived
      images: images.length > 0 ? images : [],    // Use new images array
      // Keep old image field for backward compat if needed
    };
  }) : [];
  next.aiAnalysis = { ...defaultState.aiAnalysis, ...(raw.aiAnalysis || {}) };  // NEW
  return next;
}

async function pullRemoteState(appsScriptUrl, syncToken) {
  const url = new URL(appsScriptUrl);
  url.searchParams.set("action", "getState");
  if (syncToken) {
    url.searchParams.set("token", syncToken);
  }
  const response = await fetch(url.toString(), { method: "GET" });
  const data = await response.json();
  if (!response.ok || !data.ok || !data.payload) {
    throw new Error(data.message || "No payload");
  }
  return data.payload;
}

async function saveRemoteState(state) {
  const syncedAt = new Date().toISOString();
  const payloadState = {
    ...state,
    settings: {
      ...state.settings,
      lastSyncedAt: syncedAt,
    },
  };
  const response = await fetch(state.settings.appsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "saveState",
      token: state.settings.syncToken,
      payload: exportState(payloadState),
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Save failed");
  }
  return syncedAt;
}

async function uploadImageFile(file, settings) {
  const dataUrl = await readFileAsDataUrl(file);
  const [meta, imageBase64] = String(dataUrl).split(",");
  const mimeMatch = meta.match(/^data:(.+);base64$/);
  const mimeType = mimeMatch ? mimeMatch[1] : (file.type || "application/octet-stream");

  const response = await fetch(settings.appsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "uploadImage",
      token: settings.syncToken,
      fileName: file.name,
      mimeType,
      imageBase64,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok || !data.payload) {
    throw new Error(data.message || "Image upload failed");
  }
  return data.payload;
}

function exportState(state) {
  return {
    settings: {
      theme: state.settings.theme,
      lastSyncedAt: state.settings.lastSyncedAt,
    },
    view: state.view,
    calendarMonth: state.calendarMonth,
    feedFilters: state.feedFilters,
    feedActiveTab: state.feedActiveTab,  // NEW
    planner: state.planner,
    dogs: { date: state.dogs.date, text: state.dogs.text, updatedAt: state.dogs.updatedAt },  // Don't export loading states
    posts: state.posts,
    aiAnalysis: {
      ...state.aiAnalysis,
      isLoading: false,  // Reset loading state when exporting
      error: "",        // Don't persist error state
    },
  };
}

function buildCalendarCells(month, state) {
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const lastDay = new Date(year, monthIndex, 0);
  const firstWeekday = normalizeWeekday(firstDay.getDay());
  const daysInMonth = lastDay.getDate();
  const leadingDays = firstWeekday;
  const trailingDays = (7 - ((leadingDays + daysInMonth) % 7 || 7)) % 7;
  const cells = [];

  for (let index = leadingDays; index > 0; index -= 1) {
    cells.push(createCalendarCell(new Date(year, monthIndex - 1, 1 - index), true, state));
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(createCalendarCell(new Date(year, monthIndex - 1, day), false, state));
  }
  for (let day = 1; day <= trailingDays; day += 1) {
    cells.push(createCalendarCell(new Date(year, monthIndex - 1, daysInMonth + day), true, state));
  }

  return cells;
}

function createCalendarCell(date, muted, state) {
  const iso = toIsoDate(date);
  const events = [];

  // Add planner event - only if date matches, or if repeat monthly and same month/day
  if (state.planner.text) {
    if (state.planner.repeatMonthly) {
      // Check if same month/day as planner date
      const [planYear, planMonth, planDay] = state.planner.date.split("-").map(Number);
      const [dateYear, dateMonth, dateDay] = iso.split("-").map(Number);
      if (dateMonth === planMonth && dateDay === planDay) {
        events.push({
          key: `planner-${iso}`,
          tone: "planner",
          label: `Планировщик: ${snippet(state.planner.text)}`,
        });
      }
    } else if (state.planner.date === iso) {
      // Only show on specific date if not repeating
      events.push({
        key: `planner-${iso}`,
        tone: "planner",
        label: `Планировщик: ${snippet(state.planner.text)}`,
      });
    }
  }

  if (state.dogs.text && state.dogs.date === iso) {
    events.push({
      key: `dogs-${iso}`,
      tone: "dogs",
      label: `Собаки: ${snippet(state.dogs.text)}`,
    });
  }

  state.posts.forEach((post) => {
    if (expandDateRange(post.dateFrom, post.dateTo).includes(iso)) {
      events.push({
        key: `${post.id}-${iso}`,
        tone: "plans",
        label: snippet(post.text || "Публикация"),
      });
    }
  });

  return {
    key: iso,
    day: date.getDate(),
    muted,
    today: iso === todayIso(),
    events,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function expandDateRange(fromDate, toDate) {
  if (!fromDate) {
    return [];
  }
  const from = new Date(fromDate);
  const to = new Date(toDate || fromDate);
  const range = [];
  const cursor = new Date(from);
  let safety = 0;
  while (cursor <= to && safety < 45) {
    range.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }
  return range;
}

function formatDate(date) {
  if (!date) {
    return "--";
  }
  const [year, monthIndex, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(year, monthIndex - 1, day));
}

function formatDateTime(isoDate) {
  if (!isoDate) {
    return "--";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function formatDateRange(fromDate, toDate) {
  if (!fromDate) {
    return "Без даты";
  }
  if (!toDate || toDate === fromDate) {
    return formatDate(fromDate);
  }
  return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
}

function snippet(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return "Без текста";
  }
  return clean.length > 32 ? `${clean.slice(0, 32)}...` : clean;
}

function todayIso() {
  return toIsoDate(new Date());
}

function getCurrentMonth() {
  return todayIso().slice(0, 7);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeWeekday(day) {
  return day === 0 ? 6 : day - 1;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getImageSrc(image, settings) {
  if (!image) {
    return "";
  }
  if (typeof image === "string") {
    return image;
  }
  if (image.type === "drive" && image.fileId) {
    const url = new URL(settings.appsScriptUrl);
    url.searchParams.set("action", "getImage");
    url.searchParams.set("fileId", image.fileId);
    if (settings.syncToken) {
      url.searchParams.set("token", settings.syncToken);
    }
    return url.toString();
  }
  return image.imageUrl || "";
}

function getRouteView() {
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  return normalizeView(raw || "planner");
}

function normalizeView(value) {
  return VIEWS.includes(value) ? value : "planner";
}

createRoot(document.getElementById("app")).render(html`<${App} />`);
