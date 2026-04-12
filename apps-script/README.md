# Google Apps Script setup

1. Create a new Apps Script project.
2. Add `Code.gs` from this folder.
3. Open `Project Settings` -> `Script properties` and optionally create `SYNC_TOKEN`.
4. Deploy as `Web app`.
5. Recommended deployment mode:
   - Execute as: `User accessing the web app`
   - Who has access: `Anyone with Google account`
6. Copy the `exec` URL into the planner settings.

This backend stores one JSON file named `budget-flow-planner-state.json` inside the target Google Drive folder configured in `STATE_FOLDER_ID` and can return it back to the UI.
