import streamDeck from "@elgato/streamdeck";
import { PluginCore } from "./core/PluginCore.js";
import { StatusAction, setStatusCore } from "./actions/StatusAction.js";
import { PromptAction, setPromptCore } from "./actions/PromptAction.js";
import { ControlAction, setControlCore } from "./actions/ControlAction.js";
import { SessionAction, setSessionCore } from "./actions/SessionAction.js";
import { EncoderAction, setEncoderCore } from "./actions/EncoderAction.js";
import { ContextGaugeAction, setContextGaugeCore } from "./actions/ContextGaugeAction.js";
import { PedalAction, setPedalCore } from "./actions/PedalAction.js";

// Create the plugin core singleton
const core = new PluginCore({
  port: 8247,
  host: "127.0.0.1",
});

// Inject core into all action classes
setStatusCore(core);
setPromptCore(core);
setControlCore(core);
setSessionCore(core);
setEncoderCore(core);
setContextGaugeCore(core);
setPedalCore(core);

// Configure logging
streamDeck.logger.setLevel("INFO" as any);

// Register all action types
streamDeck.actions.registerAction(new StatusAction());
streamDeck.actions.registerAction(new PromptAction());
streamDeck.actions.registerAction(new ControlAction());
streamDeck.actions.registerAction(new SessionAction());
streamDeck.actions.registerAction(new EncoderAction());
streamDeck.actions.registerAction(new ContextGaugeAction());
streamDeck.actions.registerAction(new PedalAction());

// Connect to Stream Deck, then start the hook server
streamDeck.connect().then(async () => {
  try {
    await core.start();
    streamDeck.logger.info("Claude Code Control plugin started successfully");
  } catch (err: any) {
    streamDeck.logger.error(`Failed to start hook server: ${err.message}`);
  }
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  await core.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await core.stop();
  process.exit(0);
});
