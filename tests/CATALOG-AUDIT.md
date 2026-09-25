# Catalog audit — 2026-09-25

The live public Firebase catalog contained 210 entries (including variants and
the separate `software` collection). Read-only inspection; no downloaded APK or
EXE was executed. `public/catalog-metadata.js` records the product sources used
for functional classification. Source links identify products, not the safety,
signature, current functionality or authenticity of third-party downloads.

## Corrections

- All You Need Firmware Pack / SDFtool: optical-drive firmware and Windows
  flashing tools, based on the author's MakeMKV forum thread. Not Android APKs.
- Amlogic USB Burning Tool: Windows firmware tool for compatible Amlogic devices.
- Wireshark, adbLink, scrcpy and WSA: computer tools, not Fire TV apps.
- Video players, IPTV clients, media centers, stores, casting receivers, launchers,
  VPN indicators, camera clients and desktop programs have distinct categories.
- The AFTV redirect for Streaming Downloader (5784830) names
  `StreamingCommunity_win_2025_x64.exe`; Windows destination confirmed, binary
  provenance not established.
- Xrom redirect filenames identify xROm ITALIA, whose distributor presents a
  streaming app. Removed the unsupported custom-ROM/launcher description.
  No claim that the linked modified/Lite APKs are authentic.
- Shadow Rocket redirect names Shadowrocket 10.9.2; the Android product is a
  proxy client, distinct from the iOS namesake.

## Unresolved identity — do not guess

- Huhu (3879434): redirect reaches a pCloud share named `huhu.apk`. Several
  unrelated products share this name; no package identity or author established.
- Media Droid Play 1.1 Exo (7719788): redirect names
  `MediaDroidPlay-v1.1.1-exo.apk`; no authoritative product page established.

These remain visible at the end under “Da identificare”, with an explicit
warning. An original developer link or Android package name is needed.

## Importer regression

The previous anchor regex crossed `</a>` boundaries, associating tutorial or ad
URLs with the next download label. The DOM parser now requires each label's
containing anchor, decodes HTML entities, supports nested markup and refuses
orphan labels/invalid schemes. A live read-only scrape yielded 116 download
buttons, with Stremio pointing to dl.strem.io and Android TV Tools to its XDA
attachment. Historic stored download URLs are not all repaired by this UI
change; the next scheduled import repairs matching entries it owns. Dedicated
release checkers retain ownership of their existing download fields.

## Verification

`node --test tests/cron.test.js tests/catalog.test.js` (11 tests), inline JS
syntax checks, read-only live catalog coverage, and a read-only live parser
check. No production cron or Telegram send was manually invoked for testing.
