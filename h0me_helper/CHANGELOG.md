# Changelog

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
