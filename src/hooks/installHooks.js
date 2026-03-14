const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Generates Claude Code hook configuration that points to our bridge server.
 * Can install to ~/.claude/settings.json or a project's .claude/settings.json.
 */

const DEFAULT_PORT = 8247;
const DEFAULT_HOST = "127.0.0.1";

function generateHookConfig(options = {}) {
  const baseUrl = `http://${options.host || DEFAULT_HOST}:${options.port || DEFAULT_PORT}`;

  return {
    hooks: {
      Notification: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/notification`,
            },
          ],
        },
      ],
      Stop: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/stop`,
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/pre-tool-use`,
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/post-tool-use`,
            },
          ],
        },
      ],
      UserPromptSubmit: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/prompt-submit`,
            },
          ],
        },
      ],
      SessionStart: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/session-start`,
            },
          ],
        },
      ],
      SessionEnd: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/session-end`,
            },
          ],
        },
      ],
      PermissionRequest: [
        {
          matcher: "",
          hooks: [
            {
              type: "http",
              url: `${baseUrl}/hooks/permission-request`,
            },
          ],
        },
      ],
    },
  };
}

function getSettingsPath(scope) {
  if (scope === "global") {
    return path.join(os.homedir(), ".claude", "settings.json");
  }
  // project scope
  return path.join(process.cwd(), ".claude", "settings.json");
}

function installHooks(options = {}) {
  const scope = options.scope || "global";
  const settingsPath = options.settingsPath || getSettingsPath(scope);
  const hookConfig = generateHookConfig(options);

  // Read existing settings
  let settings = {};
  try {
    const existing = fs.readFileSync(settingsPath, "utf8");
    settings = JSON.parse(existing);
  } catch {
    // File doesn't exist or isn't valid JSON — start fresh
  }

  // Merge hooks (our hooks are additive, won't clobber existing)
  if (!settings.hooks) {
    settings.hooks = {};
  }

  for (const [event, configs] of Object.entries(hookConfig.hooks)) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = [];
    }

    // Remove any existing streamdeck hooks (by URL pattern)
    settings.hooks[event] = settings.hooks[event].filter(
      (entry) =>
        !entry.hooks?.some((h) => h.url?.includes(`/hooks/`))
    );

    // Add our hooks
    settings.hooks[event].push(...configs);
  }

  // Ensure directory exists
  const dir = path.dirname(settingsPath);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

  return { settingsPath, events: Object.keys(hookConfig.hooks) };
}

function uninstallHooks(options = {}) {
  const scope = options.scope || "global";
  const settingsPath = options.settingsPath || getSettingsPath(scope);

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch {
    return { removed: false, reason: "settings file not found" };
  }

  if (!settings.hooks) {
    return { removed: false, reason: "no hooks configured" };
  }

  const baseUrl = `http://${options.host || DEFAULT_HOST}:${options.port || DEFAULT_PORT}`;

  let removedCount = 0;
  for (const event of Object.keys(settings.hooks)) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(
      (entry) =>
        !entry.hooks?.some((h) => h.url?.startsWith(baseUrl))
    );
    removedCount += before - settings.hooks[event].length;

    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  return { removed: true, count: removedCount };
}

function installStatuslineScript(options = {}) {
  const baseUrl = `http://${options.host || DEFAULT_HOST}:${options.port || DEFAULT_PORT}`;
  const scriptPath = path.join(os.homedir(), ".claude", "statusline.sh");

  const script = `#!/bin/bash
# Stream Deck bridge statusline forwarder
# Pipes JSON from stdin (Claude Code statusline) directly to the bridge
curl -s -X POST "${baseUrl}/hooks/statusline" \\
  -H "Content-Type: application/json" \\
  --data-binary @- \\
  > /dev/null 2>&1
`;

  const dir = path.dirname(scriptPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(scriptPath, script, { mode: 0o755 });

  return { scriptPath };
}

module.exports = { generateHookConfig, installHooks, uninstallHooks, installStatuslineScript };
