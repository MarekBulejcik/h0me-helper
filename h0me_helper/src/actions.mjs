// The helper's own list of safe actions. H0me checks its list first; this is the second check,
// on the Pi, so even someone in control of H0me's server could do nothing else.
// An action passes only if its device is in the "Devices" setting AND the action is in this table
// AND every detail it carries is listed here and in range.

const int = (min, max) => (v) => Number.isInteger(v) && v >= min && v <= max;
const num = (min, max) => (v) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const oneOf = (...values) => (v) => typeof v === "string" && values.includes(v);

/** domain → action → the details it may carry, each with its check. */
const SAFE = {
  // brightness, and one of H0me's offered colours: a colour name, or a white's warmth in kelvin
  light: {
    turn_on: {
      brightness_pct: int(1, 100),
      color_name: oneOf("red", "orange", "yellow", "lime", "cyan", "blue", "purple", "deeppink"),
      color_temp_kelvin: int(2000, 6500),
    },
    turn_off: {},
  },
  switch: { turn_on: {}, turn_off: {} },
  humidifier: { turn_on: {}, turn_off: {} },
  scene: { turn_on: {} },
  climate: { turn_on: {}, turn_off: {}, set_temperature: { temperature: num(16, 30) } },
  // scripts only get a scene name (the room's "Set Scene" script)
  script: { turn_on: { scene_name: oneOf("Off", "Normal", "Mood", "Sleep", "Night Path") } },
};

/**
 * Checks a call from H0me. Returns { domain, service, entityId, data } to pass to Home Assistant,
 * or { refused: "reason" }.
 */
export function checkCall(call, entities) {
  const entityId = call?.entity_id;
  if (typeof entityId !== "string" || !entities.includes(entityId)) return { refused: "device not in this helper's list" };
  const domain = entityId.split(".")[0];
  const allowedData = Object.hasOwn(SAFE, domain) && Object.hasOwn(SAFE[domain], call.action) ? SAFE[domain][call.action] : null;
  if (!allowedData) return { refused: `action ${domain}.${call.action} not allowed` };

  const data = {};
  const given = call.data && typeof call.data === "object" ? call.data : {};
  for (const [key, value] of Object.entries(given)) {
    const check = Object.hasOwn(allowedData, key) ? allowedData[key] : null;
    if (!check) return { refused: `detail ${key} not allowed` };
    if (!check(value)) return { refused: `${key} not allowed: ${JSON.stringify(value).slice(0, 30)}` };
    data[key] = value;
  }
  // a script's details are its variables
  return { domain, service: call.action, entityId, data: domain === "script" ? { variables: data } : data };
}
