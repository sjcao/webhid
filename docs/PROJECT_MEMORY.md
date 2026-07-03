# Project Memory

## Current Goal

This project is a browser-based WebHID mouse configuration tool. The current direction is a full rebuild of the old Vue app into a modern React app, while preserving the mouse HID protocol behavior from the local protocol documents.

The UI can reference the layout density and terminology style of the external demo site previously provided by the user, but this project must not display that site's branding text.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Radix/shadcn-style local UI primitives
- TanStack Router
- Zustand stores
- React Hook Form + Zod
- Vitest for protocol/store tests
- Playwright for browser smoke tests
- npm package manager

## Important UX Rules

- Default workspace style follows a dense mouse-driver control panel.
- Top-right workspace controls should only keep theme and language buttons.
- Do not add placeholder features that the protocol cannot actually write.
- If a feature is not supported by the protocol docs, remove it from primary navigation.
- Do not show the external reference site's branding text anywhere in app UI.
- The app is currently mouse-only. Do not add keyboard/headset/cloud/firmware pages unless protocol and scope change.

## Pending UI Acceptance Notes

These notes come from the user's marked screenshot and must be handled in a later implementation pass. Do not treat the current UI as visually complete yet.

- Left sidebar device card is incomplete. The device selector area should more closely match the reference demo's structure, spacing, icon treatment, status/battery row, and expand affordance.
- Left sidebar onboard profile selector is incomplete. It should behave and look like a real profile selector, not just a flat button.
- Mouse button mapping canvas is incomplete. Button label cards and dotted orange target circles need better alignment with the mouse asset, including left button, forward button, DPI button, middle button, right button, and back button positions.
- Button mapping cards should look closer to the reference demo: compact top label, stronger selected state, correct white card sizing, and consistent shadow/radius.
- The shortcut command page is not close enough to the reference demo. Rework it around the reference's shortcut/macro workflow instead of the current generic form layout.
- Parameter settings is currently too thin. Confirm what protocol-backed parameters can be exposed; if only device info is protocol-backed, the page should be designed as a polished info/status page rather than a placeholder settings page.
- Configuration management should feel complete for the supported onboard profiles: show four profiles, current state, switching, and clear affordances.
- Other settings should only include protocol-backed reset actions, but needs a more finished layout and confirmation flow.
- Preserve the rule that unsupported controls should not be shown. Improve visual completeness without inventing non-protocol features.

## Protocol Source Of Truth

Protocol docs live in:

- `docs/网页驱动通信协议_20250905.docx`
- `docs/网页驱动通信协议_20250424.docx`

Use the newer `20250905` document first. The current implemented protocol surface is:

- `0x90` DPI read/write
- `0x91` button mapping read/write
- `0x92` onboard profile read/write
- `0x93` reset settings
- `0xF0` version read
- `0xF1` work mode read

Current packet shape:

- Report ID is `0x09`
- Full packet length is 17 bytes
- `sendReport` payload omits the report ID, so command builders return 16 bytes
- Packet CRC and data CRC are implemented in `src/protocol/mouse/crc.ts`

## Supported Features

Implemented and intended to stay visible:

- Device pairing and WebHID connection
- Demo/preview mode
- Onboard profile switching
- DPI setting with fixed protocol stages
- Mouse button mapping
- Function library for protocol-supported key types
- Macro recording, saving, and binding
- Combo shortcut recording and binding
- Device info from version/work-mode/device records
- Reset button settings
- Reset all settings
- Chinese/English switching
- Light/dark theme switching

## Explicitly Removed Or Hidden

These were removed because the current local protocol does not provide reliable write commands for them:

- Performance settings page
- Polling rate controls
- Gaming firmware mode controls
- Battery endurance calculation controls
- Sensor sampling controls
- Custom DPI stage creation
- X/Y independent DPI write UI
- DPI stage deletion
- LED lighting main page

If future protocol docs add commands for these, implement protocol builders and tests first, then expose UI.

## Current DPI Behavior

The current DPI page uses fixed stages from the newer protocol document:

- 800
- 1600
- 3200
- 4000
- 6000
- 8000

Do not reintroduce `400` unless the target protocol version is intentionally rolled back to the older document.

## Button Mapping Notes

The newer protocol has a `Default` type at `0x00`, which shifts the rest of the button mapping types:

- `0x00` Default
- `0x01` Mouse
- `0x02` Profile change
- `0x03` DPI action
- `0x04` Wheel
- `0x05` Multimedia
- `0x06` Alphanumeric
- `0x07` Function key
- `0x08` Numpad
- `0x09` Control/character key
- `0x0A` Burst fire
- `0x0B` Combo key
- `0x0C` Macro

The default button mapping command uses a short payload:

- `[buttonId, KeyFunctionType.Default]`

Most other mappings use:

- `[buttonId, functionType, index, ...values]`

## Macro Notes

Macro binding writes multiple `0x91` button mapping frames using `KeyFunctionType.Macro`.

Current macro behavior:

- Records keyboard down/up actions.
- Stores macros in `localStorage` under `mouse-hid.macros.v1`.
- Migrates old `actionsList` once if present.
- Writes an explicit macro completion frame after actions.

Repeat modes:

- `0xF0` hold loop
- `0xF1` until assigned key
- `0xF2` until any key
- `0xF4` loop times, with loop count sent as the repeat value

## Important Files

- `src/protocol/mouse/commands.ts` builds HID commands.
- `src/protocol/mouse/parser.ts` parses input reports.
- `src/protocol/mouse/types.ts` defines protocol enums and payload types.
- `src/protocol/mouse/keymap.ts` maps UI options to protocol key values.
- `src/services/hid/browser-hid-service.ts` is the only place that should call `navigator.hid`.
- `src/stores/device-store.ts` manages connection and preview mode.
- `src/stores/mouse-store.ts` sends mouse protocol commands and stores device state.
- `src/stores/macro-store.ts` stores local macro definitions.
- `src/features/mouse/workspace-page.tsx` owns the workspace shell.
- `src/features/mouse/buttons-panel.tsx` owns button mapping UI.
- `src/features/mouse/dpi-panel.tsx` owns DPI UI.
- `src/features/mouse/macro-panel.tsx` owns macro and combo shortcut UI.
- `src/features/mouse/device-info-panel.tsx` owns protocol-supported device info.
- `src/features/mouse/reset-panel.tsx` owns reset actions.

## Verification Commands

Run these after protocol or UI changes:

```bash
npm.cmd run build
npm.cmd run test
npm.cmd run e2e
```

Expected current status:

- Build passes.
- Vitest passes protocol and macro-store tests.
- Playwright opens demo mode and checks DPI, button mapping, and shortcut pages.

## Local Preview

The app base path is `/webhid/`.

Local preview URL commonly used during development:

```text
http://127.0.0.1:5173/webhid/
```

If the dev server is not running, start it with:

```bash
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```
