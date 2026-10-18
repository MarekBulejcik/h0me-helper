// H0me helper: passes the listed Home Assistant devices' states up to H0me, and does the actions
// H0me asks for, but only those on its own list (actions.mjs).
// Home Assistant → (local) → this helper → (one connection out, encrypted) → H0me.
import { readFileSync } from "node:fs";
import { checkCall } from "./actions.mjs";
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

  const h0me = new H0me(options, {
    version,
    onConnected: () => h0me.send({ type: "snapshot", states: ha.snapshot().filter(listed) }),
    onCall,
  });
  const ha = new HomeAssistant(options, {
    onSnapshot: (states) => h0me.send({ type: "snapshot", states: states.filter(listed) }),
    onState: (state) => listed(state) && h0me.send({ type: "state", state }),
  });

  ha.start();
  h0me.start();

  const stop = () => {
    log("Stopping");
    ha.stop();
    h0me.stop();
    setTimeout(() => process.exit(0), 500);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
