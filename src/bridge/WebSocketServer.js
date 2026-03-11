const crypto = require("crypto");
const { EventEmitter } = require("events");

/**
 * Minimal WebSocket server implementation using only Node.js builtins.
 * No external dependencies required.
 */
class WebSocketServer extends EventEmitter {
  constructor(httpServer) {
    super();
    this.clients = new Set();

    httpServer.on("upgrade", (req, socket, head) => {
      this._handleUpgrade(req, socket, head);
    });
  }

  _handleUpgrade(req, socket, head) {
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-5AB5DC11650A")
      .digest("base64");

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
        "\r\n"
    );

    const ws = { socket, alive: true };
    this.clients.add(ws);

    socket.on("data", (buffer) => {
      const message = this._decodeFrame(buffer);
      if (message !== null) {
        this.emit("message", ws, message);
      }
    });

    socket.on("close", () => {
      this.clients.delete(ws);
      this.emit("disconnect", ws);
    });

    socket.on("error", () => {
      this.clients.delete(ws);
    });

    this.emit("connection", ws);
  }

  send(ws, data) {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    const frame = this._encodeFrame(payload);
    if (ws.socket.writable) {
      ws.socket.write(frame);
    }
  }

  broadcast(data) {
    for (const ws of this.clients) {
      this.send(ws, data);
    }
  }

  close() {
    for (const ws of this.clients) {
      ws.socket.end();
    }
    this.clients.clear();
  }

  _decodeFrame(buffer) {
    if (buffer.length < 2) return null;

    const opcode = buffer[0] & 0x0f;
    // Connection close
    if (opcode === 0x08) return null;
    // Ping - respond with pong
    if (opcode === 0x09) return null;

    const masked = (buffer[1] & 0x80) !== 0;
    let payloadLength = buffer[1] & 0x7f;
    let offset = 2;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      // For simplicity, read lower 32 bits
      payloadLength = buffer.readUInt32BE(6);
      offset = 10;
    }

    let mask = null;
    if (masked) {
      mask = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    const data = buffer.slice(offset, offset + payloadLength);
    if (mask) {
      for (let i = 0; i < data.length; i++) {
        data[i] ^= mask[i % 4];
      }
    }

    return data.toString("utf8");
  }

  _encodeFrame(message) {
    const payload = Buffer.from(message, "utf8");
    const length = payload.length;

    let header;
    if (length < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + text
      header[1] = length;
    } else if (length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeUInt32BE(0, 2);
      header.writeUInt32BE(length, 6);
    }

    return Buffer.concat([header, payload]);
  }
}

module.exports = { WebSocketServer };
