const STATE_FILE_NAME = "budget-flow-planner-state.json";
const STATE_FOLDER_ID = "1yMthxjbEwRjoLt8WmJmKx1AmpK2P9Y6e";

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
      email: Session.getActiveUser().getEmail(),
    },
  });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
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

  const folder = DriveApp.getFolderById(STATE_FOLDER_ID);
  const bytes = Utilities.base64Decode(imageBase64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);

  return {
    type: "drive",
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    imageUrl: buildImageUrl_(file.getId()),
  };
}

function getImageBlob_(fileId) {
  const file = DriveApp.getFileById(fileId);
  return file.getBlob();
}

function buildImageUrl_(fileId) {
  const scriptUrl = ScriptApp.getService().getUrl();
  return scriptUrl + "?action=getImage&fileId=" + encodeURIComponent(fileId);
}

function sanitizeFileName_(fileName) {
  return String(fileName).replace(/[^\w.\-]+/g, "_");
}

function getDefaultState_() {
  return {
    settings: {
      theme: "light",
      lastSyncedAt: "",
    },
    view: "planner",
    calendarMonth: "",
    feedFilters: {
      search: "",
      month: "",
    },
    planner: {
      date: "",
      text: "",
      updatedAt: "",
    },
    dogs: {
      date: "",
      text: "",
      updatedAt: "",
    },
    posts: [],
  };
}

function mergeState_(payload) {
  const defaults = getDefaultState_();
  return {
    settings: {
      theme: (payload.settings && payload.settings.theme) || defaults.settings.theme,
      lastSyncedAt: (payload.settings && payload.settings.lastSyncedAt) || defaults.settings.lastSyncedAt,
    },
    view: payload.view || defaults.view,
    calendarMonth: payload.calendarMonth || defaults.calendarMonth,
    feedFilters: {
      search: (payload.feedFilters && payload.feedFilters.search) || "",
      month: (payload.feedFilters && payload.feedFilters.month) || "",
    },
    planner: {
      date: (payload.planner && payload.planner.date) || "",
      text: (payload.planner && payload.planner.text) || "",
      updatedAt: (payload.planner && payload.planner.updatedAt) || "",
    },
    dogs: {
      date: (payload.dogs && payload.dogs.date) || "",
      text: (payload.dogs && payload.dogs.text) || "",
      updatedAt: (payload.dogs && payload.dogs.updatedAt) || "",
    },
    posts: Array.isArray(payload.posts) ? payload.posts : [],
  };
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
