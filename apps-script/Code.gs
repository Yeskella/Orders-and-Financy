const AUTH_USERS = {
  Lesha: "vandal2020",
  Lera: "vandal2021",
};

function doGet() {
  return jsonOutput_({
    ok: true,
    message: "Apps Script storage is deprecated. Budget Flow now uses Supabase.",
  });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (body.action === "login") {
      return jsonOutput_(login_(body.role || "", body.password || ""));
    }

    return jsonOutput_({
      ok: false,
      message: "Apps Script storage is disabled.",
    });
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

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
