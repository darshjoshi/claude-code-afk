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

    this.ws.on("open", () => {
      this.emit("connected");
      // Request full re-render from bridge
      this.send({ action: "refreshButtons" });
    });

    this.ws.on("close", () => {
      this.emit("disconnected");
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", () => {
      // Error will be followed by close event
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
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
      this.ws.close();
      this.ws = null;
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
