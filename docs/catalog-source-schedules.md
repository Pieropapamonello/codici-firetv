# Catalog source checks

All four jobs run through the existing Firebase-backed cron runner and shared
writer lease, once per daily UTC slot. Scheduler ticks every five minutes;
failed jobs retry after 30 minutes. Sleeping Render instances catch up on wake.

| Job | UTC | Europe/Rome, summer / winter |
| --- | --- | --- |
| DownloaderCodes (page and post sitemaps) | 09:00 | 11:00 / 10:00 |
| WebAssistanceITA code list | 10:00 | 12:00 / 11:00 |
| kpfire Linktree supported app sections | 11:00 | 13:00 / 12:00 |
| DubLift latest stable GitHub release, armv7 and arm64 | 12:00 | 14:00 / 13:00 |

External source jobs add known, classified products not already covered by the
catalog. Exact downloads/codes are deduplicated across apps and software.
Administrator-ignored names are excluded. Unknown identities and conflicting
destinations for existing products are saved privately under `source_review`;
they do not replace known files automatically. Existing manually reviewed
imports are protected. Entries owned by these sync jobs can change on later runs.
Codes are source-published references, not a certification of APK identity or
safety. A matching declared artifact can enrich a missing code.

`source_sync/<source>` records page counts, failures, additions and review counts.
Partial sitemap fetch failures are not marked successful and trigger retries.
Empty feeds/parsing failures are errors, never a reason to delete catalog data.

External imports/code changes do not broadcast “new APK” notifications.
DubLift broadcasts only when an existing architecture's release artifact changes;
initial fingerprint baselines of unchanged URLs are silent. Missing stable APKs
fail without partial updates. There are no new unauthenticated mutation endpoints.
