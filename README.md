# H0me helper

A Home Assistant app (add-on) that connects a Home Assistant to H0me, a private hub, with one
outgoing connection. Home Assistant itself is never exposed to the internet.

- `h0me_helper/`: the app. Plain Node.js, **no dependencies** (nothing downloaded from npm).
  - `src/main.mjs` starts both sides, passes states up and runs checked actions;
  - `src/actions.mjs` is the helper's own list of safe actions (the second check, on the Pi);
  - `src/home-assistant.mjs` is the local side (Home Assistant's WebSocket API, limited user);
  - `src/h0me.mjs` is the outgoing connection to H0me (shared secret, pings, reconnects);
  - `src/options.mjs` reads and checks the settings.
- `repository.yaml`: makes this repository an app store for Home Assistant.

Install: Home Assistant → Settings → Apps → App store → ⋮ → Repositories → add
`https://github.com/MarekBulejcik/h0me-helper` → "H0me helper" → Install.

No secrets live in this repository. The secret and the token are typed into the app's
Configuration tab in Home Assistant.
