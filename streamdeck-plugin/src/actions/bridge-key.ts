import * as fs from "fs";
import * as path from "path";
import {
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
  type KeyDownEvent,
} from "@elgato/streamdeck";
import { BridgeClient, type BridgeMessage } from "../bridge-client.js";
import { svgToDataUri, offlineSvg, contextGaugeSvg } from "../svg-utils.js";

const logFile = path.join(process.env.HOME || "/tmp", "claude-code-afk-plugin.log");
function log(msg: string): void {
  fs.appendFileSync(logFile, `${new Date().toISOString()} [action] ${msg}\n`);
}

interface ImageSetter {
  setImage(image: string): Promise<void>;
}

const CONTEXT_GAUGE_KEY = 7;
const NEO_COLUMNS = 4;

export class BridgeKeyAction extends SingletonAction {
  override readonly manifestId = "com.claude-code.afk.bridge-key";

  private keyMap = new Map<number, ImageSetter>();
  private bridgeClient: BridgeClient | null = null;
  private bridgeConnected = false;
  private lastGaugeSvg: string | null = null;
  private refreshPending = false;

  setBridgeClient(client: BridgeClient): void {
    this.bridgeClient = client;
  }

  private getKeyIndex(
    action: { coordinates?: { row: number; column: number } | undefined }
  ): number {
    const coords = action.coordinates;
    if (coords) {
      return coords.row * NEO_COLUMNS + coords.column;
    }
    return -1;
  }

  /**
   * Send a single refreshButtons request, debounced so that multiple
   * onWillAppear calls in the same tick only trigger one refresh.
   */
  private requestRefresh(): void {
    if (this.refreshPending || !this.bridgeClient || !this.bridgeConnected) return;
    this.refreshPending = true;
    setTimeout(() => {
      this.refreshPending = false;
      if (this.bridgeClient && this.bridgeConnected) {
        log(`requestRefresh: sending refreshButtons (mapSize=${this.keyMap.size})`);
        this.bridgeClient.send({ action: "refreshButtons" });
      }
    }, 100);
  }

  override onWillAppear(ev: WillAppearEvent): void {
    const keyIndex = this.getKeyIndex(
      ev.action as unknown as { coordinates?: { row: number; column: number } }
    );
    if (keyIndex < 0) return;

    this.keyMap.set(keyIndex, ev.action as unknown as ImageSetter);
    log(`onWillAppear: keyIndex=${keyIndex} mapSize=${this.keyMap.size} connected=${this.bridgeConnected}`);

    if (!this.bridgeConnected) {
      (ev.action as unknown as ImageSetter).setImage(svgToDataUri(offlineSvg()));
    } else if (keyIndex === CONTEXT_GAUGE_KEY && this.lastGaugeSvg) {
      // Restore cached gauge immediately
      (ev.action as unknown as ImageSetter).setImage(svgToDataUri(this.lastGaugeSvg));
    }

    // Request a re-render — bridge messages may have arrived before onWillAppear
    if (this.bridgeConnected) {
      this.requestRefresh();
    }
  }

  override onWillDisappear(ev: WillDisappearEvent): void {
    const keyIndex = this.getKeyIndex(
      ev.action as unknown as { coordinates?: { row: number; column: number } }
    );
    if (keyIndex >= 0) {
      this.keyMap.delete(keyIndex);
    }
  }

  override onKeyDown(ev: KeyDownEvent): void {
    const keyIndex = this.getKeyIndex(ev.action);
    if (keyIndex < 0 || !this.bridgeClient) return;

    this.bridgeClient.send({ action: "keyDown", keyIndex });
  }

  handleBridgeMessage(msg: BridgeMessage): void {
    switch (msg.type) {
      case "button:render": {
        const keyIndex = msg.keyIndex as number | undefined;
        const svg = msg.svg as string | undefined;
        if (keyIndex === undefined || !svg) return;

        const ctx = this.keyMap.get(keyIndex);
        if (ctx) {
          ctx.setImage(svgToDataUri(svg));
        }
        break;
      }

      case "infobar:update": {
        const percent = (msg.percent as number) ?? 0;
        const gaugeColor = (msg.color as string) ?? "#00cc66";
        const formatted = (msg.formatted as string) ?? "";
        const maxFormatted = (msg.maxFormatted as string) ?? "";

        const gaugeSvg = contextGaugeSvg(
          percent,
          gaugeColor,
          formatted,
          maxFormatted
        );
        this.lastGaugeSvg = gaugeSvg;

        const ctx = this.keyMap.get(CONTEXT_GAUGE_KEY);
        if (ctx) {
          ctx.setImage(svgToDataUri(gaugeSvg));
        }
        break;
      }

      case "state:sync":
        break;

      default:
        break;
    }
  }

  showOffline(): void {
    this.bridgeConnected = false;
    const svg = svgToDataUri(offlineSvg());
    for (const ctx of this.keyMap.values()) {
      ctx.setImage(svg);
    }
  }

  markConnected(): void {
    this.bridgeConnected = true;
    // Request refresh — keys may already be registered from onWillAppear
    this.requestRefresh();
  }
}
