// The outside side: ONE connection out to H0me, shown the shared secret. Nothing ever connects in.
import { log, warn } from "./log.mjs";

const PING_EVERY = 20_000;
const DEAD_AFTER = 60_000;

export class H0me {
  /**
   * @param {{ h0meUrl: string, secret: string }} options
   * @param {{ version: string, onConnected: () => void, onCall: (call: object) => void, onCamera: (msg: object) => void, onClosed: () => void }} handlers
   */
  constructor(options, handlers) {
    this.options = options;
    this.handlers = handlers;
    this.retry = 2000;
    this.failures = 0;
    this.stopped = false;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  start() {
    if (this.stopped) return;
    const ws = new WebSocket(this.options.h0meUrl, { headers: { Authorization: `Bearer ${this.options.secret}` } });
    this.ws = ws;
    let lastPong = Date.now();
    let openedAt = 0;
    let timer = null;

    ws.onopen = () => {
      openedAt = Date.now();
      this.failures = 0;
      log(`Connected to H0me (${new URL(this.options.h0meUrl).host})`);
      ws.send(JSON.stringify({ type: "hello", version: this.handlers.version }));
      this.handlers.onConnected();
      timer = setInterval(() => {
        // H0me (Cloudflare) answers "pong" at once; silence means the line is dead
        if (Date.now() - lastPong > DEAD_AFTER) return ws.close();
        ws.send("ping");
      }, PING_EVERY);
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") {
        lastPong = Date.now();
        return;
      }
      // all H0me can ask for: an action (checked by main.mjs against this helper's own list), or a
      // listed camera's picture while someone watches (camera.mjs)
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg?.type === "call" && typeof msg.id === "string") this.handlers.onCall(msg);
      else if (msg?.type === "camera") this.handlers.onCamera(msg);
    };

    ws.onclose = (event) => {
      clearInterval(timer);
      this.handlers.onClosed();
      if (this.stopped) return;
      // stayed up a while: start the waiting over
      if (openedAt && Date.now() - openedAt > 60_000) this.retry = 2000;
      if (!openedAt) {
        this.failures++;
        // a wrong secret looks the same as a network problem from here, so say both after a few tries
        if (this.failures === 3) warn("Can't connect to H0me. Check the internet connection, and that the secret here matches H0me's.");
      } else {
        log(`H0me connection closed (${event.code}${event.reason ? `: ${event.reason}` : ""})`);
      }
      setTimeout(() => this.start(), this.retry);
      this.retry = Math.min(this.retry * 2, 60_000);
    };
    ws.onerror = () => {}; // onclose follows and handles it
  }

  send(message) {
    if (this.connected) this.ws.send(JSON.stringify(message));
  }

  /** A camera picture (binary). Returns false when not connected. */
  sendBinary(data) {
    if (!this.connected) return false;
    this.ws.send(data);
    return true;
  }

  stop() {
    this.stopped = true;
    this.ws?.close(1000, "Helper stopping");
  }
}
