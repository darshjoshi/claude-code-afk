const { spawn } = require("child_process");
const { EventEmitter } = require("events");
const path = require("path");
const fs = require("fs");
const os = require("os");

/**
 * Wraps the Claude Code CLI, providing programmatic control over sessions,
 * prompts, and commands. Designed as the backend for Stream Deck integration.
 */
class ClaudeCodeController extends EventEmitter {
  constructor(options = {}) {
    super();
    this.claudeBinary = options.claudeBinary || "claude";
    this.workingDir = options.workingDir || process.cwd();
    this.sessionId = options.sessionId || null;
    this.model = options.model || null;
    this.allowedTools = options.allowedTools || [];
    this.status = "idle"; // idle | running | waiting | error
    this._activeProcess = null;
    this._lastResult = null;
    this._lastError = null;
    this._history = [];
  }

  _buildArgs(prompt, options = {}) {
    const args = ["--print", "--output-format", "json"];

    if (this.sessionId && options.continue !== false) {
      args.push("--session-id", this.sessionId);
      args.push("--continue");
    }

    if (options.model || this.model) {
      args.push("--model", options.model || this.model);
    }

    const tools = options.allowedTools || this.allowedTools;
    if (tools.length > 0) {
      args.push("--allowedTools", tools.join(","));
    }

    if (options.maxTurns) {
      args.push("--max-turns", String(options.maxTurns));
    }

    if (options.systemPrompt) {
      args.push("--append-system-prompt", options.systemPrompt);
    }

    if (options.permissionMode) {
      args.push("--permission-mode", options.permissionMode);
    }

    args.push(prompt);
    return args;
  }

  /**
   * Send a prompt to Claude Code and get a structured response.
   */
  async send(prompt, options = {}) {
    if (this._activeProcess) {
      throw new Error("A command is already running. Abort it first.");
    }

    this._setStatus("running");
    this.emit("prompt:sent", { prompt });

    return new Promise((resolve, reject) => {
      const args = this._buildArgs(prompt, options);
      let stdout = "";
      let stderr = "";

      this._activeProcess = spawn(this.claudeBinary, args, {
        cwd: options.workingDir || this.workingDir,
        env: { ...process.env },
      });

      this._activeProcess.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      this._activeProcess.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      this._activeProcess.on("close", (code) => {
        this._activeProcess = null;

        if (code !== 0) {
          this._setStatus("error");
          this._lastError = stderr || `Exit code ${code}`;
          const error = new Error(this._lastError);
          this.emit("prompt:error", { prompt, error: this._lastError });
          reject(error);
          return;
        }

        let result;
        try {
          result = JSON.parse(stdout);
        } catch {
          result = { type: "response", result: stdout.trim() };
        }

        // Capture session ID for continuation
        if (result.session_id) {
          this.sessionId = result.session_id;
        }

        this._lastResult = result;
        this._history.push({ prompt, result, timestamp: Date.now() });
        this._setStatus("idle");
        this.emit("prompt:response", result);
        resolve(result);
      });

      this._activeProcess.on("error", (err) => {
        this._activeProcess = null;
        this._setStatus("error");
        this._lastError = err.message;
        this.emit("prompt:error", { prompt, error: err.message });
        reject(err);
      });
    });
  }

  /**
   * Abort the currently running command.
   */
  abort() {
    if (this._activeProcess) {
      this._activeProcess.kill("SIGTERM");
      this._activeProcess = null;
      this._setStatus("idle");
      this.emit("command:aborted");
      return true;
    }
    return false;
  }

  /**
   * Quick one-shot command without session continuity.
   */
  async oneShot(prompt, options = {}) {
    return this.send(prompt, { ...options, continue: false });
  }

  /**
   * Get Claude Code version info.
   */
  async getVersion() {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.claudeBinary, ["--version"], {
        cwd: this.workingDir,
      });
      let output = "";
      proc.stdout.on("data", (d) => (output += d));
      proc.on("close", () => resolve(output.trim()));
      proc.on("error", reject);
    });
  }

  /**
   * Get status information.
   */
  getStatus() {
    return {
      status: this.status,
      sessionId: this.sessionId,
      historyLength: this._history.length,
      lastError: this._lastError,
      isRunning: this._activeProcess !== null,
    };
  }

  /**
   * Reset the session (start fresh).
   */
  resetSession() {
    this.abort();
    this.sessionId = null;
    this._history = [];
    this._lastResult = null;
    this._lastError = null;
    this._setStatus("idle");
    this.emit("session:reset");
  }

  _setStatus(status) {
    const previous = this.status;
    this.status = status;
    if (previous !== status) {
      this.emit("status:change", { previous, current: status });
    }
  }
}

module.exports = ClaudeCodeController;
