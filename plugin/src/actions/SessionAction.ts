import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { PluginCore } from "../core/PluginCore.js";

let core: PluginCore;

export function setSessionCore(c: PluginCore): void {
  core = c;
}

@action({ UUID: "com.claude.code-control.session" })
export class SessionAction extends SingletonAction {
  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    const coords = (ev.payload as any).coordinates;
    const cols = 5;
    const keyIndex = coords ? (coords.row * cols + coords.column) : -1;
    core.registerInstance(ev.action as any, "sessionButton", ev as any, keyIndex);
  }

  override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
    core.unregisterInstance(ev.action as any, ev as any);
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    const layout = core.layoutManager.getCurrentLayout();
    const instance = core.getInstance(ev.action.id);
    if (!instance) return;
    const context = layout.keys[instance.keyIndex];
    if (context) {
      await core.executeAction(context.actionId, context);
    }
  }
}
