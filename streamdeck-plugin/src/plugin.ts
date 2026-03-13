import * as fs from "fs";
import * as path from "path";

// Write crash logs to a file we can inspect
const logFile = path.join(
  process.env.HOME || "/tmp",
  "claude-code-afk-plugin.log"
);

function log(msg: string): void {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(logFile, line);
}

process.on("uncaughtException", (err) => {
  log(`UNCAUGHT: ${err.message}\n${err.stack}`);
});
process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED: ${String(reason)}`);
});

log("=== Plugin starting ===");
log(`argv: ${process.argv.join(" ")}`);
log(`cwd: ${process.cwd()}`);

import streamDeck from "@elgato/streamdeck";
import { BridgeClient } from "./bridge-client.js";
import { BridgeKeyAction } from "./actions/bridge-key.js";

const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:8247";

log("Imports loaded");

const bridgeClient = new BridgeClient(DEFAULT_BRIDGE_URL);
const bridgeKeyAction = new BridgeKeyAction();
bridgeKeyAction.setBridgeClient(bridgeClient);

bridgeClient.on("message", (msg) => {
  bridgeKeyAction.handleBridgeMessage(msg);
});

bridgeClient.on("connected", () => {
  log("Bridge connected");
  bridgeKeyAction.markConnected();
});

bridgeClient.on("disconnected", () => {
  log("Bridge disconnected");
  bridgeKeyAction.showOffline();
});

streamDeck.settings.onDidReceiveGlobalSettings((ev) => {
  const settings = ev.settings as Record<string, unknown> | undefined;
  const url = settings?.bridgeUrl as string | undefined;
  if (url && url.startsWith("ws")) {
    bridgeClient.setUrl(url);
  }
});

log("Registering action...");
streamDeck.actions.registerAction(bridgeKeyAction);

log("Calling streamDeck.connect()...");
streamDeck.connect().then(() => {
  log("Stream Deck connected! Starting bridge client...");
  bridgeClient.connect();
}).catch((err: Error) => {
  log(`streamDeck.connect() FAILED: ${err.message}`);
});

log("Plugin init complete (waiting for SD connect)");
