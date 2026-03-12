import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import type { PluginCore } from "../core/PluginCore.js";

let core: PluginCore;

export function setPromptCore(c: PluginCore): void {
  core = c;
}

@action({ UUID: "com.claude.code-control.prompt" })
export class PromptAction extends SingletonAction {
  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "reviewCode";
    const coords = (ev.payload as any).coordinates;
    const cols = 5;
    const keyIndex = coords ? (coords.row * cols + coords.column) : -1;
    core.registerInstance(ev.action as any, actionId, ev as any, keyIndex);
  }

  override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
    core.unregisterInstance(ev.action as any, ev as any);
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "reviewCode";
    await core.executeAction(actionId);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "reviewCode";
    core.handleSettingsUpdate(actionId, ev.payload.settings);
  }
}
