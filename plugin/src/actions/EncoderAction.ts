import { action, DialDownEvent, DialRotateEvent, SingletonAction, TouchTapEvent, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";
import type { PluginCore } from "../core/PluginCore.js";

let core: PluginCore;

export function setEncoderCore(c: PluginCore): void {
  core = c;
}

@action({ UUID: "com.claude.code-control.encoder" })
export class EncoderAction extends SingletonAction {
  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "scrollContext";
    core.registerInstance(ev.action as any, actionId, ev as any);
  }

  override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
    core.unregisterInstance(ev.action as any, ev as any);
  }

  override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "scrollContext";
    core.handleDialRotate(actionId, ev.payload.ticks);
  }

  override async onDialDown(ev: DialDownEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "scrollContext";
    core.handleDialPress(actionId);
  }

  override async onTouchTap(ev: TouchTapEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "scrollContext";
    core.handleDialPress(actionId);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent): Promise<void> {
    const actionId = (ev.payload.settings.actionId as string) || "scrollContext";
    core.handleSettingsUpdate(actionId, ev.payload.settings);
  }
}
