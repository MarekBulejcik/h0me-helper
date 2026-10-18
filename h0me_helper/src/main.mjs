// H0me helper: passes the listed Home Assistant devices' states up to H0me.
// Home Assistant → (local) → this helper → (one connection out, encrypted) → H0me.
import { readFileSync } from "node:fs";
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

  const h0me = new H0me(options, {
    version,
    onConnected: () => h0me.send({ type: "snapshot", states: ha.snapshot().filter(listed) }),
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
