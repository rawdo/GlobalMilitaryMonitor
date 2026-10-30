# Global Military Monitor — Mobile

iOS and Android companion app for the Global Military Monitor desktop dashboard, built with
Expo (React Native + TypeScript) and Expo Router.

![Map, Feed, Alerts, Intel and event detail screens](docs/screenshots.png)

## Features

- **Map** — dark world map (Leaflet + Esri tiles) with conflict zones, geolocated events colour-coded by
  severity (alerts pulse), and known military deployments. Tap an event for details.
- **Feed** — live news from 35 sources (GDELT plus 34 defense, regional and world-news RSS feeds; see
  below), with search and category filters.
- **Alerts** — high and critical severity events, with a badge count on the tab.
- **Intel** — live status of every data source (last check, next check, polling interval), active
  conflict zones and tracked assets.
- Each source refreshes independently, as soon as that source can have new content (see below). Pull to
  refresh forces an immediate check, and the last data is cached for instant start-up and offline viewing.

## Data sources

35 live sources, plus built-in reference data. Every URL below was checked to return a current feed.

| # | Source | Group | Feed | Checked every* | Filtered |
|---|---|---|---|---|---|
| 1 | [GDELT Project](https://www.gdeltproject.org/) | Aggregator | `api.gdeltproject.org/api/v2/doc/doc` | 1 min (no cache info; 15-min batches) | all items |
| 2 | [Defense News](https://www.defensenews.com/) | Defense | `defensenews.com/feed/` | 5 min (source cache) | all items |
| 3 | [Breaking Defense](https://breakingdefense.com/) | Defense | `breakingdefense.com/feed/` | 10 min (source cache) | all items |
| 4 | [The War Zone](https://www.twz.com/) | Defense | `twz.com/feed` | 5 min (source cache) | all items |
| 5 | [Defense One](https://www.defenseone.com/) | Defense | `defenseone.com/rss/all/` | 15 min (source cache) | all items |
| 6 | [Military Times](https://www.militarytimes.com/) | Defense | `militarytimes.com/feed/` | 5 min (source cache) | all items |
| 7 | [Army Times](https://www.armytimes.com/) | Defense | `armytimes.com/feed/` | 5 min (source cache) | all items |
| 8 | [Navy Times](https://www.navytimes.com/) | Defense | `navytimes.com/feed/` | 5 min (source cache) | all items |
| 9 | [Air Force Times](https://www.airforcetimes.com/) | Defense | `airforcetimes.com/feed/` | 5 min (source cache) | all items |
| 10 | [Air & Space Forces Magazine](https://www.airandspaceforces.com/) | Defense | `airandspaceforces.com/feed/` | 15 min (maximum interval) | all items |
| 11 | [USNI News](https://news.usni.org/) | Defense | `news.usni.org/feed` | 10 min (source cache) | all items |
| 12 | [Naval News](https://www.navalnews.com/) | Defense | `navalnews.com/feed/` | 15 min (maximum interval) | all items |
| 13 | [Task & Purpose](https://taskandpurpose.com/) | Defense | `taskandpurpose.com/feed/` | 5 min (source cache) | all items |
| 14 | [Military.com](https://www.military.com/) | Defense | `military.com/feed/daily-news/` | 30s (minimum interval) | all items |
| 15 | [UK Defence Journal](https://ukdefencejournal.org.uk/) | Defense | `ukdefencejournal.org.uk/feed/` | 2 min (no cache info from source) | all items |
| 16 | [Defence Blog](https://defence-blog.com/) | Defense | `defence-blog.com/feed/` | 2 min (no cache info from source) | all items |
| 17 | [FDD Long War Journal](https://www.longwarjournal.org/) | Defense | `longwarjournal.org/feed` | 10 min (source cache) | all items |
| 18 | [DVIDS](https://www.dvidshub.net/) | Defense | `dvidshub.net/rss/news` | 2 min (no cache info from source) | all items |
| 19 | [U.S. Department of War](https://www.war.gov/News/) | Defense | `war.gov/DesktopModules/ArticleCS/RSS.ashx` | 2 min (no cache info from source) | all items |
| 20 | [Kyiv Independent](https://kyivindependent.com/) | Conflict regions | `kyivindependent.com/news-archive/rss/` | 30s (minimum interval) | military topics only, defaults to Ukraine |
| 21 | [Ukrainska Pravda](https://www.pravda.com.ua/eng/) | Conflict regions | `pravda.com.ua/eng/rss/` | 30s (minimum interval) | military topics only, defaults to Ukraine |
| 22 | [Meduza](https://meduza.io/en) | Conflict regions | `meduza.io/rss/en/all` | 1 min (source cache) | military topics only |
| 23 | [Middle East Eye](https://www.middleeasteye.net/) | Conflict regions | `middleeasteye.net/rss` | 1 min (source cache) | military topics only |
| 24 | [Al-Monitor](https://www.al-monitor.com/) | Conflict regions | `al-monitor.com/rss` | 15 min (maximum interval) | military topics only |
| 25 | [Yonhap News](https://en.yna.co.kr/) | Conflict regions | `en.yna.co.kr/RSS/news.xml` | 30s (minimum interval) | military topics only |
| 26 | [NK News](https://www.nknews.org/) | Conflict regions | `nknews.org/feed/` | 2 min (no cache info from source) | military topics only, defaults to North Korea |
| 27 | [South China Morning Post](https://www.scmp.com/) | Conflict regions | `scmp.com/rss/91/feed/` | 15 min (maximum interval) | military topics only |
| 28 | [Dawn](https://www.dawn.com/) | Conflict regions | `dawn.com/feeds/home` | 30s (source cache) | military topics only |
| 29 | [Africanews](https://www.africanews.com/) | Conflict regions | `africanews.com/feed/rss` | 15 min (maximum interval) | military topics only |
| 30 | [BBC World](https://www.bbc.com/news/world) | World news | `feeds.bbci.co.uk/news/world/rss.xml` | 30s (minimum interval) | military topics only |
| 31 | [NYT World](https://www.nytimes.com/section/world) | World news | `rss.nytimes.com/services/xml/rss/nyt/World.xml` | 5 min (source cache) | military topics only |
| 32 | [Al Jazeera](https://www.aljazeera.com/) | World news | `aljazeera.com/xml/rss/all.xml` | 5 min (source cache) | military topics only |
| 33 | [The Guardian World](https://www.theguardian.com/world) | World news | `theguardian.com/world/rss` | 1 min (source cache) | military topics only |
| 34 | [UN News: Peace & Security](https://news.un.org/en/news/topic/peace-and-security) | World news | `news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml` | 2 min (no cache info from source) | military topics only |
| 35 | [The Record](https://therecord.media/) | Cyber | `therecord.media/feed` | 2 min (no cache info from source) | all items |

\* Steady-state intervals derived from each source's `Cache-Control` / `Expires` headers when they were added
(clamped to 30 s – 15 min; 2 min when a source gives no cache info). The app re-reads the headers on every
response, so if a source changes its caching the interval follows. "Military topics only" means items must
match the military keyword filter; specialist defense outlets keep everything.

Built-in reference data (`src/lib/seed.ts`, static): 12 active conflict zones and 14 known military
deployments, both ported from the desktop app.

How refresh scheduling works (`src/lib/schedule.ts`):

- After each response, the next check is set from the source's own `Cache-Control: max-age` (minus
  `Age`) or `Expires` header, i.e. the moment its content can next change, clamped between 30 s
  (1 min for GDELT) and 15 min; sources that send no cache info are checked every 2 min.
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
