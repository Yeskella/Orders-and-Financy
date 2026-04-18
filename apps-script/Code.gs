const STATE_FILE_NAME = "budget-flow-planner-state.json";
const STATE_FOLDER_ID = "1yMthxjbEwRjoLt8WmJmKx1AmpK2P9Y6e";
const IMAGE_FOLDER_NAME = "Image";
const AUTH_USERS = {
  Lesha: "vandal2020",
  Lera: "vandal2021",
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "health";
  const token = (e && e.parameter && e.parameter.token) || "";

  if (!isAuthorized_(token)) {
    return jsonOutput_({ ok: false, message: "Unauthorized" });
  }

  if (action === "getState") {
    return jsonOutput_({
      ok: true,
      payload: loadState_(),
      message: "State loaded",
    });
  }

  if (action === "getImage") {
    const fileId = (e && e.parameter && e.parameter.fileId) || "";
    if (!fileId) {
      return jsonOutput_({ ok: false, message: "Missing fileId" });
    }
    return getImageBlob_(fileId);
  }

  return jsonOutput_({
    ok: true,
    message: "Budget Flow Apps Script is alive",
    payload: {
      fileName: STATE_FILE_NAME,
      folderId: STATE_FOLDER_ID,
      imageFolderName: IMAGE_FOLDER_NAME,
      email: Session.getActiveUser().getEmail(),
    },
  });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (body.action === "login") {
      return jsonOutput_(login_(body.role || "", body.password || ""));
    }

    if (!isAuthorized_(body.token || "")) {
      return jsonOutput_({ ok: false, message: "Unauthorized" });
    }

    if (body.action === "saveState") {
      saveState_(body.payload || {});
      return jsonOutput_({ ok: true, message: "State saved" });
    }

    if (body.action === "uploadImage") {
      const uploaded = uploadImage_(body || {});
      return jsonOutput_({
        ok: true,
        message: "Image uploaded",
        payload: uploaded,
      });
    }

    return jsonOutput_({ ok: false, message: "Unknown action" });
  } catch (error) {
    return jsonOutput_({
      ok: false,
      message: error.message || "Unexpected Apps Script error",
    });
  }
}

function login_(role, password) {
  const expectedPassword = AUTH_USERS[role];
  if (!expectedPassword || expectedPassword !== password) {
    return {
      ok: false,
      message: "Invalid role or password",
    };
  }

  return {
    ok: true,
    message: "Authorized",
    payload: {
      role: role,
    },
  };
}

function loadState_() {
  const file = getOrCreateStateFile_();
  const text = file.getBlob().getDataAsString() || "{}";
  return mergeState_(JSON.parse(text));
}

function saveState_(payload) {
  const file = getOrCreateStateFile_();
  file.setContent(JSON.stringify(mergeState_(payload || {}), null, 2));
}

function getOrCreateStateFile_() {
  const folder = DriveApp.getFolderById(STATE_FOLDER_ID);
  const files = folder.getFilesByName(STATE_FILE_NAME);
  if (files.hasNext()) {
    return files.next();
  }
  return folder.createFile(
    STATE_FILE_NAME,
    JSON.stringify(getDefaultState_(), null, 2),
    MimeType.PLAIN_TEXT
  );
}

function uploadImage_(body) {
  const imageBase64 = body.imageBase64 || "";
  const mimeType = body.mimeType || "application/octet-stream";
  const fileName = sanitizeFileName_(body.fileName || ("image-" + new Date().getTime()));

  if (!imageBase64) {
    throw new Error("Missing imageBase64");
  }

  const imageFolder = getOrCreateImageFolder_();
  const bytes = Utilities.base64Decode(imageBase64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = imageFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    type: "drive",
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    imageUrl: buildImageUrl_(file.getId()),
  };
}

function getOrCreateImageFolder_() {
  const rootFolder = DriveApp.getFolderById(STATE_FOLDER_ID);
  const folders = rootFolder.getFoldersByName(IMAGE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return rootFolder.createFolder(IMAGE_FOLDER_NAME);
}

function getImageBlob_(fileId) {
  const file = DriveApp.getFileById(fileId);
  return file.getBlob();
}

function buildImageUrl_(fileId) {
  const scriptUrl = ScriptApp.getService().getUrl();
  const scriptToken = PropertiesService.getScriptProperties().getProperty("SYNC_TOKEN") || "";
  return scriptUrl
    + "?action=getImage&fileId=" + encodeURIComponent(fileId)
    + (scriptToken ? "&token=" + encodeURIComponent(scriptToken) : "");
}

function sanitizeFileName_(fileName) {
  return String(fileName).replace(/[^\w.\-]+/g, "_");
}

function getDefaultMoneyTab_() {
  return {
    id: "money-default",
    title: "Планы (деньги)",
    groups: [],
    createdAt: "",
    createdBy: "",
    updatedAt: "",
    updatedBy: "",
  };
}

function getDefaultState_() {
  return {
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
}

function mergeState_(payload) {
  const defaults = getDefaultState_();
  const plannerEntries = Array.isArray(payload.plannerEntries)
    ? payload.plannerEntries
    : convertLegacyNote_(payload.planner, "planner");
  const dogsEntries = Array.isArray(payload.dogsEntries)
    ? payload.dogsEntries
    : convertLegacyNote_(payload.dogs, "dogs");
  const customTabs = Array.isArray(payload.customTabs)
    ? payload.customTabs.map(function (tab) { return normalizeCustomTab_(tab); })
    : [];

  return {
    settings: {
      theme: (payload.settings && payload.settings.theme) || defaults.settings.theme,
      lastSyncedAt: (payload.settings && payload.settings.lastSyncedAt) || defaults.settings.lastSyncedAt,
      lastUpdatedBy: (payload.settings && payload.settings.lastUpdatedBy) || defaults.settings.lastUpdatedBy,
    },
    view: payload.view || defaults.view,
    calendarMonth: payload.calendarMonth || defaults.calendarMonth,
    plannerSelectedDate: payload.plannerSelectedDate || defaults.plannerSelectedDate,
    dogsSelectedDate: payload.dogsSelectedDate || defaults.dogsSelectedDate,
    moneyActiveTabId: payload.moneyActiveTabId || (customTabs[0] && customTabs[0].id) || defaults.moneyActiveTabId,
    feedFilters: {
      search: (payload.feedFilters && payload.feedFilters.search) || "",
      mode: (payload.feedFilters && payload.feedFilters.mode)
        || (payload.feedFilters && payload.feedFilters.showArchived ? "archived" : defaults.feedFilters.mode),
    },
    plannerEntries: plannerEntries.map(function (entry) { return normalizeEntry_(entry, "planner"); }),
    dogsEntries: dogsEntries.map(function (entry) { return normalizeEntry_(entry, "dogs"); }),
    posts: Array.isArray(payload.posts)
      ? payload.posts.map(function (post) { return normalizePost_(post); })
      : [],
    customTabs: customTabs,
  };
}

function normalizeEntry_(entry, prefix) {
  return {
    id: entry.id || (prefix + "-" + Utilities.getUuid()),
    date: entry.date || "",
    text: entry.text || "",
    repeatMonthly: Boolean(entry.repeatMonthly),
    createdAt: entry.createdAt || entry.updatedAt || "",
    createdBy: entry.createdBy || "",
    updatedAt: entry.updatedAt || "",
    updatedBy: entry.updatedBy || "",
  };
}

function normalizePost_(post) {
  return {
    id: post.id || ("post-" + Utilities.getUuid()),
    author: post.author || post.createdBy || "Lesha",
    text: post.text || "",
    images: Array.isArray(post.images) ? post.images : [],
    pinned: Boolean(post.pinned),
    archived: Boolean(post.archived),
    createdAt: post.createdAt || "",
    createdBy: post.createdBy || post.author || "",
    updatedAt: post.updatedAt || post.createdAt || "",
    updatedBy: post.updatedBy || post.createdBy || post.author || "",
    startDate: post.startDate || "",
    endDate: post.endDate || post.startDate || "",
    comments: Array.isArray(post.comments)
      ? post.comments.map(function (comment) { return normalizeComment_(comment); })
      : [],
  };
}

function normalizeComment_(comment) {
  return {
    id: comment.id || ("comment-" + Utilities.getUuid()),
    author: comment.author || comment.createdBy || "Lesha",
    text: comment.text || "",
    createdAt: comment.createdAt || "",
    createdBy: comment.createdBy || comment.author || "",
    updatedAt: comment.updatedAt || comment.createdAt || "",
    updatedBy: comment.updatedBy || comment.createdBy || comment.author || "",
  };
}

function normalizeCustomTab_(tab) {
  return {
    id: tab.id || ("money-" + Utilities.getUuid()),
    title: tab.title || "Планы (деньги)",
    groups: Array.isArray(tab.groups)
      ? tab.groups.map(function (group) { return normalizeMoneyGroup_(group); })
      : (Array.isArray(tab.rows) && tab.rows.length
        ? [{
          id: "group-" + Utilities.getUuid(),
          title: "Общее",
          items: tab.rows.map(function (row) { return normalizeMoneyRow_(row); }),
          createdAt: tab.createdAt || tab.updatedAt || "",
          createdBy: tab.createdBy || "",
          updatedAt: tab.updatedAt || "",
          updatedBy: tab.updatedBy || "",
        }]
        : []),
    createdAt: tab.createdAt || tab.updatedAt || "",
    createdBy: tab.createdBy || "",
    updatedAt: tab.updatedAt || "",
    updatedBy: tab.updatedBy || "",
  };
}

function normalizeMoneyGroup_(group) {
  return {
    id: group.id || ("group-" + Utilities.getUuid()),
    title: group.title || group.name || "",
    items: Array.isArray(group.items)
      ? group.items.map(function (row) { return normalizeMoneyRow_(row); })
      : [],
    createdAt: group.createdAt || group.updatedAt || "",
    createdBy: group.createdBy || "",
    updatedAt: group.updatedAt || "",
    updatedBy: group.updatedBy || "",
  };
}

function normalizeMoneyRow_(row) {
  return {
    id: row.id || ("row-" + Utilities.getUuid()),
    name: row.name || row.title || "",
    cost: typeof row.cost !== "undefined" ? row.cost : "",
    completed: Boolean(row.completed),
    createdAt: row.createdAt || row.updatedAt || "",
    createdBy: row.createdBy || "",
    updatedAt: row.updatedAt || "",
    updatedBy: row.updatedBy || "",
  };
}

function convertLegacyNote_(legacyNote, prefix) {
  if (!legacyNote || !legacyNote.text) {
    return [];
  }
  return [{
    id: prefix + "-legacy",
    date: legacyNote.date || "",
    text: legacyNote.text || "",
    repeatMonthly: false,
    createdAt: legacyNote.updatedAt || "",
    createdBy: "",
    updatedAt: legacyNote.updatedAt || "",
    updatedBy: "",
  }];
}

function isAuthorized_(token) {
  const scriptToken = PropertiesService.getScriptProperties().getProperty("SYNC_TOKEN") || "";
  if (!scriptToken) {
    return true;
  }
  return token === scriptToken;
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
