import http from "http";

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse, body: any) => void;

/**
 * Minimal HTTP server extracted from BridgeServer.
 * Handles hook callbacks from Claude Code — no WebSocket needed
 * since the plugin runs inside the Stream Deck process.
 */
export class HookServer {
  private _port: number;
  private _host: string;
  private _server: http.Server | null = null;
  private _routes = new Map<string, RouteHandler>();

  constructor(options: { port?: number; host?: string } = {}) {
    this._port = options.port || 8247;
    this._host = options.host || "127.0.0.1";
  }

  get port(): number {
    return this._port;
  }

  get host(): string {
    return this._host;
  }

  /**
   * Register an HTTP route handler.
   */
  route(method: string, path: string, handler: RouteHandler): void {
    this._routes.set(`${method.toUpperCase()} ${path}`, handler);
  }

  /**
   * Start the HTTP server.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._server = http.createServer((req, res) => this._handleRequest(req, res));

      this._server.listen(this._port, this._host, () => {
        resolve();
      });

      this._server.on("error", reject);
    });
  }

  /**
   * Stop the HTTP server.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this._server) {
        this._server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private _handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const key = `${req.method} ${req.url}`;
    const handler = this._routes.get(key);

    // CORS
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

    // Default status endpoint
    if (req.url === "/status" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", plugin: "com.claude.code-control" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  }

  private _parseBody(req: http.IncomingMessage, callback: (body: any) => void): void {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        callback(body ? JSON.parse(body) : null);
      } catch {
        callback(null);
      }
    });
  }
}
