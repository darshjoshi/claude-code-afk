const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const BridgeServer = require("../src/bridge/BridgeServer");

let portCounter = 18250;
function nextPort() {
  return portCounter++;
}

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    });
    req.on("error", reject);
  });
}

function httpPost(port, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let result = "";
        res.on("data", (chunk) => (result += chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode, body: JSON.parse(result) });
        });
      }
    );
    req.on("error", reject);
    req.end(data);
  });
}

describe("BridgeServer", () => {
  const servers = [];

  afterEach(async () => {
    for (const s of servers) {
      await s.stop();
    }
    servers.length = 0;
  });

  function createServer(opts = {}) {
    const port = opts.port || nextPort();
    const server = new BridgeServer({ port });
    servers.push(server);
    return { server, port };
  }

  it("starts and serves status endpoint", async () => {
    const { server, port } = createServer();
    await server.start();
    const res = await httpGet(port, "/status");
    assert.equal(res.status, 200);
    assert.equal(res.body.claudeStatus, "idle");
  });

  it("returns 404 for unknown routes", async () => {
    const { server, port } = createServer();
    await server.start();
    const res = await httpGet(port, "/nonexistent");
    assert.equal(res.status, 404);
  });

  it("handles registered routes", async () => {
    const { server, port } = createServer();
    server.route("POST", "/test", (req, res, body) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: body.message }));
    });
    await server.start();
    const res = await httpPost(port, "/test", { message: "hello" });
    assert.equal(res.body.received, "hello");
  });

  it("updateState patches shared state", async () => {
    const { server, port } = createServer();
    await server.start();
    server.updateState({ claudeStatus: "running" });
    const res = await httpGet(port, "/status");
    assert.equal(res.body.claudeStatus, "running");
  });

  it("updateButton updates button state", async () => {
    const { server, port } = createServer();
    await server.start();
    server.updateButton("status", { label: "ACTIVE", color: "#00ff00" });
    const res = await httpGet(port, "/status");
    assert.equal(res.body.buttons.status.label, "ACTIVE");
  });

  it("emits server:started event", async () => {
    const { server, port } = createServer();
    const events = [];
    server.on("server:started", (e) => events.push(e));
    await server.start();
    assert.equal(events.length, 1);
    assert.equal(events[0].port, port);
  });
});
