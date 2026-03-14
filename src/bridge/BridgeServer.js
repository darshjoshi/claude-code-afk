const http = require("http");
const { EventEmitter } = require("events");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("./WebSocketServer");

/**
 * HTTP + WebSocket bridge server. The Stream Deck plugin connects here
 * to send commands and receive real-time status updates.
 *
 * HTTP endpoints handle Claude Code hook callbacks.
 * WebSocket handles bidirectional Stream Deck communication.
 */
class BridgeServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8247;
    this.host = options.host || "127.0.0.1";
    this.server = null;
    this.wss = null;
    this._routes = new Map();
    this._state = {
      claudeStatus: "idle",
      lastEvent: null,
      buttons: {},
    };
  }

  /**
   * Register an HTTP route handler.
   */
  route(method, routePath, handler) {
    this._routes.set(`${method.toUpperCase()} ${routePath}`, handler);
  }

  /**
   * Start the bridge server.
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) =>
        this._handleHttp(req, res)
      );

      this.wss = new WebSocketServer(this.server);

      this.wss.on("message", (ws, message) => {
        this._handleWsMessage(ws, message);
      });

      this.wss.on("connection", (ws) => {
        // Send current state on connect
        this.wss.send(ws, {
          type: "state:sync",
          state: this._state,
        });
        this.emit("client:connected");
      });

      this.server.listen(this.port, this.host, () => {
        this.emit("server:started", {
          port: this.port,
          host: this.host,
        });
        resolve();
      });

      this.server.on("error", reject);
    });
  }

  /**
   * Stop the server.
   */
  stop() {
    return new Promise((resolve) => {
      if (this.wss) this.wss.close();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Broadcast a state update to all connected Stream Decks.
   */
  broadcast(type, data) {
    if (this.wss) {
      this.wss.broadcast({ type, ...data });
    }
  }

  /**
   * Update shared state and notify all clients.
   */
  updateState(patch) {
    Object.assign(this._state, patch);
    this.broadcast("state:update", { patch });
  }

  /**
   * Update a specific button's visual state.
   */
  updateButton(buttonId, state) {
    this._state.buttons[buttonId] = {
      ...this._state.buttons[buttonId],
      ...state,
    };
    this.broadcast("button:update", { buttonId, state });
  }

  _handleHttp(req, res) {
    const key = `${req.method} ${req.url}`;
    const handler = this._routes.get(key);

    // CORS for local dev
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (handler) {
      this._parseBody(req, (body) => {
        handler(req, res, body);
      });
      return;
    }

    // Simulator UI
    if (req.url === "/simulator" && req.method === "GET") {
      const simPath = path.resolve(__dirname, "../../simulator/index.html");
      try {
        const html = fs.readFileSync(simPath, "utf8");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      } catch {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "simulator not found" }));
      }
      return;
    }

    // Default: status endpoint
    if (req.url === "/status" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(this._state));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  }

  _handleWsMessage(ws, message) {
    try {
      const msg = JSON.parse(message);
      this.emit("command", msg);

      // Acknowledge receipt
      this.wss.send(ws, { type: "ack", id: msg.id });
    } catch {
      this.wss.send(ws, { type: "error", error: "invalid message" });
    }
  }

  _parseBody(req, callback) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        callback(body ? JSON.parse(body) : null);
      } catch {
        callback(null);
      }
    });
  }
}

module.exports = BridgeServer;
