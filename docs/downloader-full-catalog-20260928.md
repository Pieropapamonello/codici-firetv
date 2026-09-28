# DownloaderCodes: full current app catalog audit

The old importer read 39 home-page cards. RetroArch and other category-only apps were never discovered; this was not a frontend search failure.

On 2026-09-28 we read 145 URLs from the post, page and category sitemaps, then followed same-origin links through categories, aliases and author pagination. The closed discovery set contains 170 fetched pages, no failed page fetches and no remaining eligible links. Advertising widgets, affiliate redirects, system endpoints and downloadable binary assets are not catalog pages. Blog text and historical APK releases are not copied.

The site exposes 104 distinct current app/code records. All have an outcome in `scripts/dc-reviewed-20260928.json`:

- 39 already represented; 4 exact matches receive missing numeric codes.
- 65 new entries: 48 reachable download endpoints, 3 download pages and 14 source-page fallbacks.
- The 14 fallbacks include 13 destinations that could not be reached and Hot Player, whose current short code destination differs from its published URL. An inaccessible endpoint is not necessarily dead: blocking or network errors can produce the same result.
- Fallbacks remain searchable with a visible notice and an “Apri pagina” action. Hot Player's unconfirmed code is recorded as `reportedCode`, not offered as a verified copyable code.
- All 104 numeric codes were resolved via AFTV. Opera's unescaped HTML `&nothanks` was normalized; the VPN Safety Dot trailing slash is URL-equivalent.
- 58 additional product icons are cached locally, including the PIA VPN alias. AdGuard VPN and NOVA Video Player now have separate identities from AdGuard and Nova.

RetroArch: code **4361890**, destination `https://buildbot.libretro.com/stable/1.22.2/android/RetroArch.apk`, category “Giochi ed emulazione”.

Validation checks HTTP headers only. No APKs were downloaded or executed; neither authenticity, signatures, licensing nor device compatibility is certified. Descriptions are original concise Italian summaries; each imported record retains its source link. User removals remain respected.

The reviewed database update is additive, uses the shared writer lease, checks existing data against a local backup and verifies its result. It does not set release timestamps or send Telegram notifications. This is a point-in-time import, not a new periodic DownloaderCodes synchronization.

Reproduction tools: `inspect-downloader-page.mjs`, `crawl-downloader-batch.ps1`, `plan-full-downloader.mjs`, `check-source-codes.ps1`, `check-import-links.ps1`, and `apply-source-import.ps1`. The seed, additional discovered URLs, complete records, code checks, destination checks and coverage audit are committed alongside the plan.
