# H0me helper

Connects this Home Assistant to H0me with **one connection out**. Nothing on the internet can
connect in: no tunnel, no open ports, no domain.

## What it does
- Signs in to Home Assistant locally as a **limited (non-admin) user**, with that user's token.
- Watches only the devices in its **Devices** list and sends their states to H0me.
- Keeps one encrypted connection to H0me open, showing the shared secret. H0me notices at once
  when it's gone ("Home offline since …").
- This version **takes no commands** from H0me. Later versions will, but only for the devices and
  actions on this helper's own list.

## Settings (Configuration tab)
| Setting | What to put in |
|---|---|
| H0me address | Leave as it is. |
| H0me secret | The long random secret. The very same one you typed into Cloudflare. |
| Home Assistant address | Leave as it is. |
| Home Assistant token | A long-lived token of the user "H0me helper" (not an admin). |
| Devices | The entity ids H0me may see, e.g. `light.main_lights`. |

The tokens stay on the Pi. The Log tab never shows them.
