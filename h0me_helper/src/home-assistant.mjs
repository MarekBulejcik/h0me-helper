// The local side: Home Assistant's WebSocket API, signed in as the limited (non-admin) user.
// It only ever subscribes to the listed devices, and keeps their current states.
import { log, warn } from "./log.mjs";

const PING_EVERY = 30_000;
const DEAD_AFTER = 75_000;

/** Home Assistant sends times as seconds; H0me wants the usual text form. */
const iso = (seconds) => (typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : undefined);

export class HomeAssistant {
  /**
   * @param {{ haUrl: string, haToken: string, entities: string[] }} options
   * @param {{ onSnapshot: (states: object[]) => void, onState: (state: object) => void }} handlers
   */
  constructor(options, handlers) {
    this.options = options;
    this.handlers = handlers;
    /** entity_id → { entity_id, state, attributes, last_changed } */
    this.states = new Map();
    this.nextId = 1;
    this.retry = 2000;
    this.stopped = false;
  }

  /** The listed devices' current states, in H0me's format. */
  snapshot() {
    return [...this.states.values()];
  }

  start() {
    if (this.stopped) return;
    const ws = new WebSocket(this.options.haUrl);
    this.ws = ws;
    let lastHeard = Date.now();
    let subscription = null;
    let timer = null;

    ws.onmessage = (event) => {
      lastHeard = Date.now();
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: this.options.haToken }));
      } else if (msg.type === "auth_ok") {
        log(`Signed in to Home Assistant ${msg.ha_version ?? ""}`.trim());
        this.retry = 2000;
        this.states.clear(); // the subscription's first message brings the whole picture again
        subscription = this.nextId++;
        // only the listed devices: Home Assistant sends nothing about the others
        ws.send(JSON.stringify({ id: subscription, type: "subscribe_entities", entity_ids: this.options.entities }));
        timer = setInterval(() => {
          if (Date.now() - lastHeard > DEAD_AFTER) return ws.close();
          ws.send(JSON.stringify({ id: this.nextId++, type: "ping" }));
        }, PING_EVERY);
      } else if (msg.type === "auth_invalid") {
        warn("Home Assistant refused the token. Check the token in the Configuration tab (a long-lived token of the limited user).");
        this.retry = 60_000;
        ws.close();
      } else if (msg.type === "result" && msg.id === subscription && !msg.success) {
        warn("Home Assistant refused the device subscription:", msg.error?.message ?? "unknown reason");
      } else if (msg.type === "event" && msg.id === subscription) {
        this.apply(msg.event);
      }
    };

    ws.onclose = () => {
      clearInterval(timer);
      if (this.stopped) return;
      log(`Lost Home Assistant; trying again in ${Math.round(this.retry / 1000)} s`);
      setTimeout(() => this.start(), this.retry);
      this.retry = Math.min(this.retry * 2, 60_000);
    };
    ws.onerror = () => {}; // onclose follows and handles it
  }

  /**
   * Applies Home Assistant's short-form changes: "a" = full states (the first message has all of
   * them), "c" = changes (+ added or changed, - removed details), "r" = removed devices.
   */
  apply(event) {
    const listed = (id) => this.options.entities.includes(id);
    const changed = [];
    for (const [id, s] of Object.entries(event.a ?? {})) {
      if (!listed(id)) continue;
      this.states.set(id, { entity_id: id, state: s.s, attributes: s.a ?? {}, last_changed: iso(s.lc) });
      changed.push(id);
    }
    for (const [id, diff] of Object.entries(event.c ?? {})) {
      const current = this.states.get(id);
      if (!listed(id) || !current) continue;
      const plus = diff["+"] ?? {};
      if (plus.s !== undefined) current.state = plus.s;
      if (plus.a) Object.assign(current.attributes, plus.a);
      if (plus.lc !== undefined) current.last_changed = iso(plus.lc);
      for (const key of diff["-"]?.a ?? []) delete current.attributes[key];
      changed.push(id);
    }
    for (const id of event.r ?? []) this.states.delete(id);

    // the first message (or the first after reconnecting) is the whole picture
    if (event.a && !event.c) this.handlers.onSnapshot(this.snapshot());
    else for (const id of changed) if (this.states.has(id)) this.handlers.onState(this.states.get(id));
  }

  stop() {
    this.stopped = true;
    this.ws?.close();
  }
}
