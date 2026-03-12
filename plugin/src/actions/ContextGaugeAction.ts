import { action, DialDownEvent, DialRotateEvent, SingletonAction, TouchTapEvent, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { PluginCore } from "../core/PluginCore.js";

let core: PluginCore;

export function setContextGaugeCore(c: PluginCore): void {
  core = c;
}

@action({ UUID: "com.claude.code-control.context-gauge" })
export class ContextGaugeAction extends SingletonAction {
  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    core.registerInstance(ev.action as any, "contextGauge", ev as any);

    const state = core.infobarManager.getState();
    try {
      await (ev.action as any).setFeedback({
        "gauge-bar": {
          value: state.percent || 0,
          bar_fill_c: `0:${state.color || "#00cc66"},1:${state.color || "#00cc66"}`,
        },
        "gauge-percent": `${state.percent || 0}%`,
        "gauge-tokens": `${formatTokens(state.tokensUsed || 0)} / ${formatTokens(state.maxTokens || 200000)}`,
      });
    } catch {
      // Instance setup may fail transiently
    }
  }

  override async onWillDisappear(ev: WillDisappearEvent): Promise<void> {
    core.unregisterInstance(ev.action as any, ev as any);
  }

  override async onDialDown(ev: DialDownEvent): Promise<void> {
    const state = core.infobarManager.getState();
    try {
      await (ev.action as any).setFeedback({
        "gauge-bar": {
          value: state.percent || 0,
          bar_fill_c: `0:${state.color || "#00cc66"},1:${state.color || "#00cc66"}`,
        },
        "gauge-percent": `${state.percent || 0}%`,
        "gauge-tokens": `${formatTokens(state.tokensUsed || 0)} / ${formatTokens(state.maxTokens || 200000)}`,
      });
    } catch {
      // Ignore
    }
  }

  override async onDialRotate(_ev: DialRotateEvent): Promise<void> {
    // No action on rotate for gauge
  }

  override async onTouchTap(_ev: TouchTapEvent): Promise<void> {
    // Future: toggle detail view
  }
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}
