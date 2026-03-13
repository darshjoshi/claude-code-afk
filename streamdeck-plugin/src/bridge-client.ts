import { EventEmitter } from "events";
import WebSocket from "ws";

export interface BridgeMessage {
  type: string;
  [key: string]: unknown;
}

export class BridgeClient extends EventEmitter {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  constructor(url: string) {
    super();
    this.url = url;
  }

  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.intentionalClose = false;

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    const currentWs = this.ws;

    currentWs.on("open", () => {
      // Only emit if this is still the active WebSocket
      if (this.ws === currentWs) {
        this.emit("connected");
      }
    });

    currentWs.on("close", () => {
      // Only emit if this is still the active WebSocket
      // Prevents stale close from a replaced connection triggering showOffline
      if (this.ws === currentWs) {
        this.ws = null;
        if (!this.intentionalClose) {
          this.emit("disconnected");
          this.scheduleReconnect();
        }
      }
    });

    currentWs.on("error", () => {
      // Error will be followed by close event
    });

    currentWs.on("message", (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString()) as BridgeMessage;
        this.emit("message", msg);
      } catch {
        // Ignore malformed messages
      }
    });
  }

  send(obj: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  setUrl(url: string): void {
    this.url = url;
    this.disconnect();
    this.connect();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const old = this.ws;
      this.ws = null; // Detach before close so the close handler is a no-op
      old.close();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }
}
