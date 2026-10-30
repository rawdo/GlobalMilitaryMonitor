# Global Military Monitor — Mobile

iOS and Android companion app for the Global Military Monitor desktop dashboard, built with
Expo (React Native + TypeScript) and Expo Router, with a tactical HUD interface.

![Map, Feed, Alerts, Intel and event detail screens](docs/screenshots.png)

## Features

- **Map** — dark world map (Leaflet + Esri tiles) with activity hotspots, geolocated events colour-coded by
  severity (alerts pulse), and live military aircraft. Tap an event for details.
- **Feed** — live news from 35 sources (GDELT plus 34 defense, regional and world-news RSS feeds; see
  below), with search and category filters.
- **Alerts** — high and critical severity events, with a badge count on the tab.
- **Intel** — live status of every data source (last check, next check, polling interval), activity
  hotspots computed from the last 24 h of reports, and live military aircraft (ADS-B).
- Each source refreshes independently, as soon as that source can have new content (see below). Pull to
  refresh forces an immediate check, and the last data is cached for instant start-up and offline viewing.

## Data sources

35 live news sources plus 2 live military-aircraft sources. Every URL below was checked to return current data.
The desktop app uses the same catalog (`src/GlobalMilitaryMonitor/DataIngestion/Sources/SourceCatalog.cs`).

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
| 36 | [adsb.lol](https://adsb.lol/) | Military aircraft | `api.adsb.lol/v2/mil` | 30s (minimum interval; `no-store`) | live positions ≤ 2 min old |
| 37 | [adsb.fi](https://adsb.fi/) | Military aircraft | `opendata.adsb.fi/api/v2/mil` | 30s (minimum interval; `no-store`) | live positions ≤ 2 min old |

\* Steady-state intervals derived from each source's `Cache-Control` / `Expires` headers when they were added
(clamped to 30 s – 15 min; 2 min when a source gives no cache info). The app re-reads the headers on every
response, so if a source changes its caching the interval follows. "Military topics only" means items must
match the military keyword filter; specialist defense outlets keep everything.

The two ADS-B networks use different receivers, so their aircraft are merged by ICAO address (keeping the
freshest position); the country shown is the state of registry for that address block.

### Data integrity

Nothing in the app is mock, seed or placeholder data:

- Events come only from the live sources; items without a publication date are skipped, not stamped "now".
- Locations are inferred from place names in the text (country/city level, so approximate). Events with no
  recognisable place are listed but not mapped. Kyiv Independent, Ukrainska Pravda and NK News default to
  their country.
- Hotspots are computed from the live events (3+ located reports in the last 24 h), not hand-entered zones.
- Aircraft are live ADS-B positions; positions are not cached between launches. Warships are not shown
  because no free live source of naval positions exists.

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

## Installing on an Android phone

The app is distributed as an APK you install directly (tested build target: arm64 phones on Android 7+,
e.g. the Oppo Find X5 Pro on ColorOS).

1. Download the APK on the phone (from a GitHub release or the Actions run artifact, see below).
2. Open it from the notification or **Files**. ColorOS will ask to allow installs from that app: tap
   **Settings**, enable **Allow from this source**, go back, and tap **Install**.
3. If Google Play Protect warns about an unknown developer, choose **Install anyway** — the APK is
   self-built, not from the Play Store.

Newer builds install over older ones and keep your data, because every build is signed with the same key.

> The release APK is signed with the standard Expo/React Native template key, which is public. That's fine
> for installing your own builds, but anyone could sign an "update" with it. Before distributing the app to
> others, switch to a private signing key.

## Building the APK

**On GitHub (recommended):** the **Android APK** workflow (`.github/workflows/android-apk.yml`) runs the
checks and builds the arm64 release APK. Start it from the repository's **Actions** tab (**Run workflow**),
or push a version tag (`git tag v1.0.1 && git push origin v1.0.1`) to also publish it as a GitHub release.

**Locally** (needs Node 22, JDK 17+, and the Android SDK with platform 37, build-tools 37.0.0 and NDK
27.1.12297006):

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# -> android/app/build/outputs/apk/release/app-release.apk
```

The `android/` folder is generated from `app.json` and is not committed. Bump `expo.version` and
`expo.android.versionCode` in `app.json` for each release.

**With EAS Build** (Expo's cloud service; needs an Expo account):

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android   # .apk/.aab
npx eas-cli@latest build --platform ios       # needs an Apple Developer account
```

## Checks

```bash
npm run typecheck
npx expo lint
npm test          # unit tests: classification, scheduling, hotspots, ADS-B parsing
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
│   ├── aircraft.ts       # ADS-B parsing and merging across networks
│   ├── icao.ts           # ICAO address block -> country of registration
│   └── hotspots.ts       # hotspots derived from live events
├── state/MonitorProvider.tsx  # per-source timers, caching, refresh
└── theme.ts              # colours matching the desktop dark theme
```

## Notes and limitations

- Categories, severity and locations are inferred from keywords (identically in the desktop app), so expect
  occasional misclassifications. Severity "Critical" requires a weapons context, so articles about nuclear
  power don't raise alerts.
- GDELT returns HTTP 429 when its per-IP limit is exceeded (common on shared networks/VPNs). The app backs
  off automatically and the Intel tab shows the status; the other feeds keep working.
- Only aircraft that the ADS-B networks flag as military and that broadcast a position appear; many military
  aircraft fly with transponders off.
- Curated conflict-event databases (ACLED, UCDP) need registration/API tokens, so hotspots are derived from
  news reports instead.
- The web build (`npx expo start --web`) renders, but browsers block the cross-origin RSS/GDELT requests
  (CORS), so live data only works in the native apps.
