# Global Military Monitor

A Windows desktop application providing a real-time global monitoring dashboard for geopolitical and military activity. Built with C#, .NET 8, and WPF.

![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)
![Framework](https://img.shields.io/badge/.NET-8.0-purple)
![UI](https://img.shields.io/badge/UI-WPF-green)

## Features

- **Interactive World Map** — OpenStreetMap-based map (GMap.NET) with live event markers, activity hotspots and live military aircraft
- **Live News Feed** — 35 live sources: the GDELT Project plus 34 defense, conflict-region, world-news and cyber RSS feeds (full list below)
- **Live Military Aircraft** — Real-time positions of aircraft flagged as military by the adsb.lol and adsb.fi ADS-B networks, with country of registration from the ICAO address
- **Activity Hotspots** — Places where live reports cluster over the last 24 hours, rated by report count and severity
- **Real-Time Alerts** — Automatic alerts for high-severity events (nuclear weapons activity, missile launches, invasions, casualties)
- **Event Timeline** — Horizontal scrolling timeline of the latest incidents
- **Source health** — The status bar shows how many sources are live; hover it for each source's status and polling interval
- **No mock data** — Everything shown comes from a live source or is computed from live data (see [Data integrity](#data-integrity))

## Mobile App

An iOS/Android companion app lives in [`mobile/`](mobile/README.md). It's built with Expo (React Native) and includes the map, live feed, alerts and conflict-zone views. To try it on your phone with Expo Go:

```bash
cd mobile && npm install && npx expo start
```

## Architecture

```
src/GlobalMilitaryMonitor/
├── DataIngestion/
│   ├── Interfaces/         # IDataFeedService, IDataAggregator
│   ├── Models/             # GeoEvent, ConflictZone (hotspot), MilitaryAsset, SourceStatus
│   ├── Processing/         # TextClassifier, RefreshScheduler, HotspotAnalyzer, IcaoRegistry
│   ├── Sources/            # SourceCatalog: every live source and its polling limits
│   └── Services/           # HttpFeedService base, GDELT / RSS / aircraft feeds, DataAggregator
├── MapRendering/           # GMap.NET WPF map controller
├── EventProcessing/        # Event filtering
├── Caching/                # In-memory caching layer
├── Configuration/          # Application settings
└── UI/                     # WPF presentation layer (MVVM)
tests/GlobalMilitaryMonitor.Tests/   # xUnit tests for the data layer (run on any OS)
```

### Data Sources

| # | Source | Group | Kind |
|---|--------|-------|------|
| 1 | [GDELT Project](https://www.gdeltproject.org/) | Aggregator | News event API (JSON) |
| 2–19 | Defense News, Breaking Defense, The War Zone, Defense One, Military Times, Army Times, Navy Times, Air Force Times, Air & Space Forces Magazine, USNI News, Naval News, Task & Purpose, Military.com, UK Defence Journal, Defence Blog, FDD Long War Journal, DVIDS, U.S. Department of War | Defense | RSS |
| 20–29 | Kyiv Independent, Ukrainska Pravda, Meduza, Middle East Eye, Al-Monitor, Yonhap News, NK News, South China Morning Post, Dawn, Africanews | Conflict regions | RSS |
| 30–34 | BBC World, NYT World, Al Jazeera, The Guardian World, UN News: Peace & Security | World news | RSS |
| 35 | The Record | Cyber | RSS |
| 36 | [adsb.lol](https://adsb.lol/) military aircraft | Military aircraft | ADS-B (JSON) |
| 37 | [adsb.fi](https://adsb.fi/) military aircraft | Military aircraft | ADS-B (JSON) |

URLs and per-source settings are in `DataIngestion/Sources/SourceCatalog.cs` (identical to the mobile app's
`mobile/src/lib/sources.ts`; see [mobile/README.md](mobile/README.md#data-sources) for each URL and its polling interval).
Specialist defense outlets keep every item; general and regional outlets are filtered to military topics.

### Refresh scheduling

Each source runs on its own loop and is checked as soon as it can have new content:

- The next check comes from the source's `Cache-Control: max-age` (minus `Age`) or `Expires` header, clamped to
  30 s – 15 min (GDELT: 1 min, as it publishes in 15-minute batches; sources with no cache headers: 2 min;
  aircraft: 30 s).
- Requests are conditional (`If-None-Match` / `If-Modified-Since`), so unchanged feeds answer with an empty 304.
- HTTP 429 honours `Retry-After`; other errors back off exponentially up to 15 min, keeping the source's last good items.
- **Refresh** (F5) checks every source at once, but never sooner than 5 s after a source's previous request.

### Data integrity

The app shows no mock, seed or placeholder data:

- **Events** come only from the live news sources. Items without a publication date are skipped rather than
  stamped with the fetch time.
- **Locations** are inferred from place names in the text (country/city level, so approximate). Events with no
  recognisable place are listed but not mapped; they are never given made-up coordinates. Outlets dedicated to
  one country (Kyiv Independent, Ukrainska Pravda, NK News) default to that country.
- **Hotspots** are computed from the live events (3+ located reports in 24 h), not hand-entered conflict zones.
- **Military aircraft** are live ADS-B positions (older than 2 min are dropped). Warships are not shown: no free
  live source of naval positions exists.
- Category and severity are keyword-based and can misclassify.

Conflict-event databases with curated zones (ACLED, UCDP) require registration/API tokens and are not integrated.

### Key Design Decisions

- **One feed per source**: every source is an `IDataFeedService` built from the catalog; the aggregator polls each on its own schedule
- **Shared logic with mobile**: classification, scheduling, hotspots and ICAO lookup mirror the mobile app's TypeScript so both apps behave identically
- **Dependency Injection**: Microsoft.Extensions.DependencyInjection for service registration and lifecycle management
- **MVVM Pattern**: Clean separation between UI (XAML) and business logic (ViewModels)

## Prerequisites

- **Windows 10** or **Windows 11**
- **Visual Studio 2022** (version 17.8 or later) with the ".NET desktop development" workload
- **.NET 8 SDK** ([Download](https://dotnet.microsoft.com/download/dotnet/8.0))

## Build Instructions

### Using Visual Studio

1. Clone the repository
2. Open `GlobalMilitaryMonitor.sln` in Visual Studio 2022
3. Restore NuGet packages (Visual Studio does this automatically)
4. Build the solution: **Build** > **Build Solution** (or `Ctrl+Shift+B`)
5. Run: **Debug** > **Start Debugging** (or `F5`)

### Using Command Line

```bash
# Clone the repository
git clone <repository-url>
cd GlobalMilitaryMonitor

# Restore dependencies
dotnet restore

# Build
dotnet build --configuration Release

# Run
dotnet run --project src/GlobalMilitaryMonitor/GlobalMilitaryMonitor.csproj
```

### Running the tests

The data layer has no WPF dependencies, so its tests run on Windows, macOS or Linux:

```bash
dotnet test tests/GlobalMilitaryMonitor.Tests

# Also hit every real source over the network:
GMM_LIVE_TESTS=1 dotnet test tests/GlobalMilitaryMonitor.Tests --filter Category=Live --logger "console;verbosity=detailed"
```

### Publishing a Standalone Executable

```bash
# Publish as a self-contained single-file executable
dotnet publish src/GlobalMilitaryMonitor/GlobalMilitaryMonitor.csproj \
  -c Release \
  -r win-x64 \
  --self-contained true \
  -p:PublishSingleFile=true \
  -o ./publish
```

The compiled `.exe` will be in the `./publish` directory.

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  GLOBAL MILITARY MONITOR  │  Stats  │  Last Update  │ ↻ │  <- Header
├───────────────────────────────────┬──────────────────────┤
│                                   │  ⚠ ACTIVE ALERTS     │
│                                   │  [Alert cards...]    │
│                                   ├──────────────────────┤
│         INTERACTIVE MAP           │  LIVE EVENT FEED     │
│      (OpenStreetMap + GMap.NET)   │  [Search bar]        │
│                                   │  [Event list...]     │
│  [Legend]                         │                      │
├───────────────────────────────────┴──────────────────────┤
│  🕒 EVENT TIMELINE  │  [Horizontal scrolling cards...]   │  <- Bottom
├─────────────────────────────────────────────────────────┤
│  Status bar  │  Data sources info  │  UTC timestamp      │
└─────────────────────────────────────────────────────────┘
```

## Adding a New Data Feed

To add an RSS/Atom feed, add an entry to `SourceCatalog.Rss` (and the same entry to `mobile/src/lib/sources.ts`):

```csharp
Defense("my-feed", "My Feed", "https://example.com/feed/", "https://example.com/"),
```

For another kind of source, derive from `HttpFeedService` and implement `Parse`; conditional requests,
scheduling and error handling come from the base class:

```csharp
public class MyFeedService : HttpFeedService
{
    public MyFeedService(HttpClient http, ILogger<MyFeedService> logger)
        : base(http, logger, "My Feed", "Defense", "https://example.com/api",
            SourceCatalog.RssLimits, SourceCatalog.HardMinGap) { }

    protected override (IReadOnlyList<GeoEvent> Events, IReadOnlyList<MilitaryAsset> Assets) Parse(string body)
    {
        // Turn the response body into events and/or assets; throw if it is unusable.
    }
}
```

Then register it in `App.xaml.cs`:

```csharp
services.AddSingleton<IDataFeedService, MyFeedService>();
```

## NuGet Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| GMap.NET.WinPresentation | 2.1.7 | WPF map control with OpenStreetMap |
| Microsoft.Extensions.DependencyInjection | 8.0.1 | Dependency injection container |
| Microsoft.Extensions.Hosting | 8.0.1 | Host builder and configuration |
| Microsoft.Extensions.Http | 8.0.1 | HttpClient factory |
| Microsoft.Extensions.Caching.Memory | 8.0.1 | In-memory caching |
| Newtonsoft.Json | 13.0.3 | JSON parsing for GDELT and ADS-B responses |

## License

This project is provided as-is for educational and research purposes. Data from third-party APIs is subject to their respective terms of service.
