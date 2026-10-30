# Global Military Monitor — Mobile

iOS and Android companion app for the Global Military Monitor desktop dashboard, built with
Expo (React Native + TypeScript) and Expo Router.

![Map, Feed, Alerts, Intel and event detail screens](docs/screenshots.png)

## Features

- **Map** — dark world map (Leaflet + Esri tiles) with conflict zones, geolocated events colour-coded by
  severity (alerts pulse), and known military deployments. Tap an event for details.
- **Feed** — live news from GDELT and RSS (Defense News, BBC World, NYT World, Al Jazeera), filtered to
  military topics, with search and category filters.
- **Alerts** — high and critical severity events, with a badge count on the tab.
- **Intel** — live status of every data source (last check, next check, polling interval), active
  conflict zones and tracked assets.
- Each source refreshes independently, as soon as that source can have new content (see below). Pull to
  refresh forces an immediate check, and the last data is cached for instant start-up and offline viewing.

## Data sources

| Source | Type | Endpoint | Checked every | Why |
|---|---|---|---|---|
| GDELT Project | News event API (JSON) | `api.gdeltproject.org/api/v2/doc/doc` | 1 min | No cache headers; publishes in 15-min batches; hard limit 1 request / 5 s |
| Defense News | RSS | `defensenews.com/feed/` | 5 min | Server sends `Cache-Control: max-age=300` |
| BBC World | RSS | `feeds.bbci.co.uk/news/world/rss.xml` | 30 s | Server sends `max-age=4`; floored at 30 s |
| NYT World | RSS | `rss.nytimes.com/services/xml/rss/nyt/World.xml` | 5 min | Server sends `max-age=300` |
| Al Jazeera | RSS | `aljazeera.com/xml/rss/all.xml` | 5 min | Server sends `max-age=300` |
| Conflict zones | Built-in reference data | `src/lib/seed.ts` | — | Static (12 zones, from the desktop app) |
| Military deployments | Built-in OSINT reference data | `src/lib/seed.ts` | — | Static (14 assets, from the desktop app) |

How refresh scheduling works (`src/lib/schedule.ts`):

- After each response, the next check is set from the source's own `Cache-Control: max-age` (minus
  `Age`) or `Expires` header, i.e. the moment its content can next change, clamped between 30 s
  (1 min for GDELT) and 15 min. The intervals above are what the sources currently send; if a source
  changes its headers, the app follows automatically.
- Requests carry `If-None-Match` / `If-Modified-Since`, so an unchanged feed answers with an empty 304.
- On HTTP 429 the app honours `Retry-After`; on any error it backs off exponentially (×2 each failure, up
  to 15 min) and keeps showing that source's last good events.
- Polling pauses in the background; on return, any source that came due is checked immediately.
- Pull to refresh checks every source at once, but never sooner than 5 s after its previous request.

## Running it

Requires Node 20+.

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with **Expo Go** ([iOS](https://apps.apple.com/app/expo-go/id982107779) /
[Android](https://play.google.com/store/apps/details?id=host.exp.exponent)), or press `i` / `a` to open an
iOS simulator / Android emulator.

## Building installable apps

Use [EAS Build](https://docs.expo.dev/build/introduction/) (no Xcode/Android Studio needed):

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android   # .apk/.aab
npx eas-cli@latest build --platform ios       # needs an Apple Developer account
```

## Checks

```bash
npm run typecheck
npx expo lint
npm test          # unit tests for classification and refresh scheduling
```

## Code layout

```
src/
├── app/                  # Expo Router screens
│   ├── _layout.tsx       # root stack + data provider
│   ├── (tabs)/           # Map, Feed, Alerts, Intel tabs
│   └── event/[id].tsx    # event detail (modal)
├── components/           # EventCard, EventList, WorldMap (WebView on native, iframe on web)
├── lib/
│   ├── classify.ts       # keyword categorisation, severity and geolocation (ported from the desktop feeds)
│   ├── sources.ts        # list of live sources and their polling limits
│   ├── schedule.ts       # per-source next-check calculation from cache / rate-limit headers
│   ├── feeds.ts          # conditional fetching + GDELT/RSS parsing
│   ├── aggregator.ts     # dedupes and sorts events from all sources
│   └── seed.ts           # conflict zones and known deployments (OSINT reference data)
├── state/MonitorProvider.tsx  # per-source timers, caching, refresh
└── theme.ts              # colours matching the desktop dark theme
```

## Notes and limitations

- Categories, severity and locations are inferred from keywords, as in the desktop app, so expect
  occasional misclassifications. Unlike the desktop app, events with no recognisable location are shown in
  the feed but not placed on the map at random coordinates. Severity "Critical" now requires a weapons
  context, so articles about nuclear power no longer raise alerts.
- GDELT returns HTTP 429 when its per-IP limit is exceeded (common on shared networks/VPNs). The app backs
  off automatically and the Intel tab shows the status; the other feeds keep working.
- Asset positions are static OSINT reference data. Live ADS-B tracking needs an API key from a provider and
  isn't wired up yet.
- The web build (`npx expo start --web`) renders, but browsers block the cross-origin RSS/GDELT requests
  (CORS), so live data only works in the native apps.
