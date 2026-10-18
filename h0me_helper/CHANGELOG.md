# Changelog

## 0.6.0
- Security and the room's own settings: on / off for the room's switches (security mode, auto
  security, presence, manual override, phone sleep override), the control mode (Auto, Sleep), the
  empty-room delay (1–30 min), the camera's picture mode and the AC / humidifier timers (30 min,
  1, 2 or 4 h). Each still only for devices in "Devices".
- The default device list has all of them.

## 0.5.0
- Any light colour: a hue (0–360) and saturation (0–100), both checked here too.

## 0.4.0
- Light colours: one of H0me's offered colour names (red, orange, yellow, lime, cyan, blue,
  purple, deeppink) or a white between 2000 and 6500 K. Nothing else.
- The default device list adds the room's security mode (shown only, never switched).

## 0.3.0
- More safe actions for the Home app: outlets and the humidifier (on, off), scenes (turn on),
  the AC (on, off, temperature 16–30 °C) and the room’s "Set Scene" script (only the scene names
  Off, Normal, Mood, Sleep, Night Path).
- The default device list now has the whole room (for new installs; an existing setup keeps its own).

## 0.2.0
- Actions: H0me can ask to switch a listed device. The helper checks every request against its
  own list first (`src/actions.mjs`): the device must be in "Devices", the action in its table
  (lights: on, off, brightness 1–100 %; switches: on, off), and at most 30 actions a minute.
  Anything else is refused and written to the log.

## 0.1.0
- First version (H0me plan 5, step 1): one connection out to H0me, the listed devices' states
  passed up, online / offline. Takes no commands from H0me yet.
