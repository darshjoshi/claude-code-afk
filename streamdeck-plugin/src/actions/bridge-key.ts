import {
  action,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
  type KeyDownEvent,
} from "@elgato/streamdeck";
import { BridgeClient, type BridgeMessage } from "../bridge-client.js";
import { svgToDataUri, offlineSvg, contextGaugeSvg } from "../svg-utils.js";

interface ImageSetter {
  setImage(image: string): Promise<void>;
}

const CONTEXT_GAUGE_KEY = 7;
const NEO_COLUMNS = 4;

@action({ UUID: "com.claude-code.afk.bridge-key" })
export class BridgeKeyAction extends SingletonAction {
  private keyMap = new Map<number, ImageSetter>();
  private bridgeClient: BridgeClient | null = null;
  private bridgeConnected = false;
  private lastGaugeSvg: string | null = null;

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

  override onWillAppear(ev: WillAppearEvent): void {
    const keyIndex = this.getKeyIndex(
      ev.action as unknown as { coordinates?: { row: number; column: number } }
    );
    if (keyIndex < 0) return;

    this.keyMap.set(keyIndex, ev.action as unknown as ImageSetter);

    if (!this.bridgeConnected) {
      (ev.action as unknown as ImageSetter).setImage(
        svgToDataUri(offlineSvg())
      );
    } else if (keyIndex === CONTEXT_GAUGE_KEY && this.lastGaugeSvg) {
      (ev.action as unknown as ImageSetter).setImage(
        svgToDataUri(this.lastGaugeSvg)
      );
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
        // refreshButtons (sent by BridgeClient on open) causes the bridge to
        // send button:render messages with keyIndex for every key.
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
  }
}
