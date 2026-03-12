import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { PluginCore } from "../core/PluginCore.js";

let core: PluginCore;

export function setSessionCore(c: PluginCore): void {
  core = c;
}

@action({ UUID: "com.claude.code-control.session" })
export class SessionAction extends SingletonAction {
  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    core.registerInstance(ev.action as any, "sessionButton", ev as any);
  }

  override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
    core.unregisterInstance(ev.action as any, ev as any);
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    const layout = core.layoutManager.getCurrentLayout();
    const slotIndex = (ev.payload.settings.slotIndex as number) ?? 0;
    const context = layout.keys[slotIndex];
    if (context) {
      await core.executeAction(context.actionId, context);
    }
  }
}
