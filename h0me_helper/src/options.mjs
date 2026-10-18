// The settings typed into the app's Configuration tab in Home Assistant (saved as /data/options.json).
import { readFileSync } from "node:fs";

const OPTIONS_FILE = process.env.OPTIONS_FILE ?? "/data/options.json";
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const LOCAL = /^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//;

/** Reads and checks the settings. Returns { options } or { problems } (plain sentences for the log). */
export function readOptions() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(OPTIONS_FILE, "utf8"));
  } catch {
    return { problems: [`Couldn't read the settings (${OPTIONS_FILE}).`] };
  }
  const problems = [];
  const text = (v) => (typeof v === "string" ? v.trim() : "");

  const h0meUrl = text(raw.h0me_url);
  // only an encrypted connection to H0me (plain ws:// only to this computer, for testing)
  if (!h0meUrl.startsWith("wss://") && !LOCAL.test(h0meUrl)) problems.push("H0me address must start with wss://");

  const secret = text(raw.h0me_secret);
  if (secret.length < 32) problems.push("H0me secret is missing or too short (at least 32 characters; use the long random one).");

  const haUrl = text(raw.ha_url);
  if (!/^wss?:\/\//.test(haUrl)) problems.push("Home Assistant address must start with ws:// or wss://");

  const haToken = text(raw.ha_token);
  if (!haToken) problems.push("Home Assistant token is missing (the limited user's long-lived token).");

  const entities = Array.isArray(raw.entities) ? [...new Set(raw.entities.map(text))] : [];
  const wrong = entities.filter((e) => !ENTITY_ID.test(e));
  if (wrong.length) problems.push(`These devices don't look like entity ids: ${wrong.join(", ")}`);
  if (entities.length === 0) problems.push("The device list is empty.");
  if (entities.length > 100) problems.push("The device list is too long (100 at most).");

  if (problems.length) return { problems };
  return { options: { h0meUrl, secret, haUrl, haToken, entities } };
}
