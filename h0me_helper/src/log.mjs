// One line per event in the app's Log tab. Never pass a secret or a token in here.
const stamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");

export const log = (...parts) => console.log(stamp(), ...parts);
export const warn = (...parts) => console.warn(stamp(), "WARNING:", ...parts);
