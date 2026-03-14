const { execFile } = require("child_process");
const { platform } = require("os");
const path = require("path");

/**
 * Platform-specific terminal window focusing.
 *
 * Searches for terminal windows containing the session ID or project path
 * and brings them to the front.
 *
 * macOS: Uses osascript (AppleScript) to search window titles.
 * Linux: Falls back to wmctrl or xdotool.
 */
class TerminalFocuser {
  constructor(options = {}) {
    this._platform = options.platform || platform();
  }

  /**
   * Attempt to focus a terminal window for the given session.
   * @param {object} opts
   * @param {string} [opts.sessionId] - Session ID to search in window titles
   * @param {string} [opts.projectPath] - Project path to search in window titles
   * @returns {Promise<boolean>} - Whether a window was found and focused
   */
  async focus({ sessionId, projectPath } = {}) {
    const searchTerms = [];
    if (sessionId) searchTerms.push(sessionId);
    if (projectPath) {
      searchTerms.push(projectPath);
      // Also try the folder basename (e.g. "claude-code-afk") since
      // editors like Cursor/VS Code use it in their window title
      const basename = path.basename(projectPath);
      if (basename && basename !== projectPath) searchTerms.push(basename);
    }
    // Also search for "claude" as a fallback
    searchTerms.push("claude");

    if (this._platform === "darwin") {
      return this._focusMacOS(searchTerms);
    } else if (this._platform === "linux") {
      return this._focusLinux(searchTerms);
    }

    return false;
  }

  async _focusMacOS(searchTerms) {
    // Build AppleScript that searches terminal app windows for matching titles
    const conditions = searchTerms
      .map((term) => `name of w contains "${term.replace(/"/g, '\\"')}"`)
      .join(" or ");

    const script = `
      tell application "System Events"
        set termApps to {"Cursor", "Code", "Terminal", "iTerm2", "Alacritty", "kitty", "Warp", "Hyper", "WezTerm"}
        repeat with appName in termApps
          if exists (application process appName) then
            tell application process appName
              repeat with w in windows
                if ${conditions} then
                  set frontmost to true
                  perform action "AXRaise" of w
                  return appName as text
                end if
              end repeat
            end tell
          end if
        end repeat
      end tell
      return "none"
    `;

    try {
      const result = await this._run("osascript", ["-e", script]);
      return result.trim() !== "none";
    } catch {
      return false;
    }
  }

  async _focusLinux(searchTerms) {
    // Try wmctrl first
    for (const term of searchTerms) {
      try {
        await this._run("wmctrl", ["-a", term]);
        return true;
      } catch {
        // wmctrl not available or no match, try next
      }
    }

    // Fall back to xdotool
    for (const term of searchTerms) {
      try {
        const windowId = await this._run("xdotool", [
          "search",
          "--name",
          term,
        ]);
        const id = windowId.trim().split("\n")[0];
        if (id) {
          await this._run("xdotool", ["windowactivate", id]);
          return true;
        }
      } catch {
        // xdotool not available or no match
      }
    }

    return false;
  }

  _run(cmd, args) {
    return new Promise((resolve, reject) => {
      execFile(cmd, args, { timeout: 5000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  }
}

module.exports = TerminalFocuser;
