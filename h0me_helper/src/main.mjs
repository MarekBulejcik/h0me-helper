// H0me helper: passes the listed Home Assistant devices' states up to H0me, and does the actions
// H0me asks for, but only those on its own list (actions.mjs).
// Home Assistant → (local) → this helper → (one connection out, encrypted) → H0me.
import { readFileSync } from "node:fs";
import { checkCall } from "./actions.mjs";
import { Camera } from "./camera.mjs";
import { H0me } from "./h0me.mjs";
import { HomeAssistant } from "./home-assistant.mjs";
import { log, warn } from "./log.mjs";
import { readOptions } from "./options.mjs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const { options, problems } = readOptions();
if (!options) {
  for (const p of problems) warn(p);
  warn("Fix the Configuration tab and start the app again.");
  // wait a little so Home Assistant doesn't restart it in a fast loop
  setTimeout(() => process.exit(1), 30_000);
} else {
  log(`H0me helper ${version}. Devices: ${options.entities.join(", ")}`);

  // the helper's own check: only listed devices ever leave the house, whatever Home Assistant sends
  const listed = (state) => options.entities.includes(state.entity_id);
  // a camera's state carries a short-lived picture token: it never leaves the Pi
  const clean = (state) => {
    if (!state?.attributes || !("access_token" in state.attributes || "entity_picture" in state.attributes)) return state;
    const { access_token, entity_picture, ...attributes } = state.attributes;
    return { ...state, attributes };
  };

  // at most 30 actions a minute, whatever H0me asks
  let recent = [];
  const onCall = async (call) => {
    // "not_allowed" tells H0me the helper's own list said no (so the page can say so)
    const answer = (ok, reason) => h0me.send({ type: "result", id: call.id, ok, ...(reason ? { reason } : {}) });
    const t = Date.now();
    recent = recent.filter((at) => t - at < 60_000);
    if (recent.length >= 30) {
      warn("Refused an action from H0me: too many in a minute");
      return answer(false, "too_many");
    }
    recent.push(t);
    const checked = checkCall(call, options.entities);
    if (checked.refused) {
      warn(`Refused an action from H0me: ${checked.refused}`);
      return answer(false, "not_allowed");
    }
    const ok = await ha.call(checked);
    const details = Object.keys(checked.data).length ? ` ${JSON.stringify(checked.data)}` : "";
    log(`${checked.domain}.${checked.service} ${checked.entityId}${details}: ${ok ? "done" : "failed"}`);
    answer(ok);
  };

  // the camera's picture, only while someone watches in House (camera.mjs)
  const camera = new Camera(options, (frame) => h0me.sendBinary(frame));

  const h0me = new H0me(options, {
    version,
    onConnected: () => h0me.send({ type: "snapshot", states: ha.snapshot().filter(listed).map(clean) }),
    onCall,
    onCamera: (msg) => (msg.on === true ? camera.want(msg.entity_id) : camera.stop()),
    onClosed: () => camera.stop(),
  });
  const ha = new HomeAssistant(options, {
    onSnapshot: (states) => h0me.send({ type: "snapshot", states: states.filter(listed).map(clean) }),
    onState: (state) => listed(state) && h0me.send({ type: "state", state: clean(state) }),
  });

  ha.start();
  h0me.start();

  const stop = () => {
    log("Stopping");
    camera.stop();
    ha.stop();
    h0me.stop();
    setTimeout(() => process.exit(0), 500);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
