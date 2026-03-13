import streamDeck from "@elgato/streamdeck";
import { BridgeClient } from "./bridge-client.js";
import { BridgeKeyAction } from "./actions/bridge-key.js";

const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:8247";

const bridgeClient = new BridgeClient(DEFAULT_BRIDGE_URL);
const bridgeKeyAction = new BridgeKeyAction();
bridgeKeyAction.setBridgeClient(bridgeClient);

// Route bridge messages to the action handler
bridgeClient.on("message", (msg) => {
  bridgeKeyAction.handleBridgeMessage(msg);
});

bridgeClient.on("connected", () => {
  bridgeKeyAction.markConnected();
});

bridgeClient.on("disconnected", () => {
  bridgeKeyAction.showOffline();
});

// Allow bridge URL override via global settings
streamDeck.settings.onDidReceiveGlobalSettings((ev) => {
  const settings = ev.settings as Record<string, unknown> | undefined;
  const url = settings?.bridgeUrl as string | undefined;
  if (url && url.startsWith("ws")) {
    bridgeClient.setUrl(url);
  }
});

// Register and connect
streamDeck.actions.registerAction(bridgeKeyAction);
streamDeck.connect();
bridgeClient.connect();
