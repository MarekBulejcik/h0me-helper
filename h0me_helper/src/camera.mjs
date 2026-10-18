// The camera picture, only while someone has House's camera open. H0me says "camera on" every few
// seconds while they watch; the helper then fetches snapshots from Home Assistant (with the limited
// user's token, on the Pi) and sends them up the same one connection. Silence from H0me for
// STOP_AFTER stops it, so a lost connection can never leave the camera streaming.
// Only a camera in the "Devices" setting is ever fetched. Nothing is stored.
import { log, warn } from "./log.mjs";

/** About three pictures a second at most. */
const FRAME_EVERY = 350;
/** No "camera on" from H0me for this long: stop. */
const STOP_AFTER = 20_000;
/** Bigger pictures are skipped (Cloudflare's limit is 1 MiB a message). */
const MAX_BYTES = 900_000;

export class Camera {
  /**
   * @param {{ haUrl: string, haToken: string, entities: string[] }} options
   * @param {(frame: ArrayBuffer) => boolean} sendFrame returns false when H0me isn't connected
   */
  constructor(options, sendFrame) {
    this.options = options;
    this.sendFrame = sendFrame;
    // ws://homeassistant:8123/api/websocket → http://homeassistant:8123
    this.base = options.haUrl.replace(/^ws/, "http").replace(/\/api\/websocket\/?$/, "");
    this.until = 0;
    this.running = false;
  }

  /** H0me asks for (or keeps asking for) a camera's picture. */
  want(entityId) {
    if (typeof entityId !== "string" || !entityId.startsWith("camera.") || !this.options.entities.includes(entityId)) {
      warn(`Refused a camera request from H0me: ${String(entityId).slice(0, 60)} isn't a camera in this helper's list`);
      return;
    }
    this.entityId = entityId;
    this.until = Date.now() + STOP_AFTER;
    if (!this.running) void this.loop();
  }

  /** Nobody is watching any more (or the connection to H0me ended). */
  stop() {
    this.until = 0;
  }

  async loop() {
    this.running = true;
    log(`Camera on (${this.entityId})`);
    let failures = 0;
    while (Date.now() < this.until) {
      const started = Date.now();
      try {
        const res = await fetch(`${this.base}/api/camera_proxy/${this.entityId}`, {
          headers: { Authorization: `Bearer ${this.options.haToken}` },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Home Assistant answered ${res.status}`);
        const frame = await res.arrayBuffer();
        failures = 0;
        if (frame.byteLength <= MAX_BYTES && !this.sendFrame(frame)) this.stop();
      } catch (err) {
        // camera off (privacy mode), unplugged or busy: keep trying slowly while someone watches
        if (++failures === 3) warn(`Camera picture not available: ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
      const rest = FRAME_EVERY - (Date.now() - started);
      if (rest > 0) await new Promise((r) => setTimeout(r, rest));
    }
    this.running = false;
    log("Camera off");
  }
}
