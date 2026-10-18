// The helper's own list of safe actions. H0me checks its list first; this is the second check,
// on the Pi, so even someone in control of H0me's server could do nothing else.
// An action passes only if its device is in the "Devices" setting AND the action is in this table
// AND every detail it carries is listed here with a number in range.

/** domain → action → the details it may carry, each with [lowest, highest]. */
const SAFE = {
  light: {
    turn_on: { brightness_pct: [1, 100] },
    turn_off: {},
  },
  switch: {
    turn_on: {},
    turn_off: {},
  },
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
    const range = Object.hasOwn(allowedData, key) ? allowedData[key] : null;
    if (!range) return { refused: `detail ${key} not allowed` };
    if (!Number.isInteger(value) || value < range[0] || value > range[1]) return { refused: `${key} out of range` };
    data[key] = value;
  }
  return { domain, service: call.action, entityId, data };
}
