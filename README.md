# Global Military Monitor

A Windows desktop application providing a real-time global monitoring dashboard for geopolitical and military activity. Built with C#, .NET 8, and WPF.

![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)
![Framework](https://img.shields.io/badge/.NET-8.0-purple)
![UI](https://img.shields.io/badge/UI-WPF-green)

## Features

- **Interactive World Map** — Full-screen OpenStreetMap-based map with conflict zone overlays, event markers, and military asset tracking via GMap.NET
- **Live News Feed** — Real-time geopolitical and military news from GDELT Project API and major RSS defense news feeds (BBC, NYT, Al Jazeera, Defense News, Janes)
- **Missile Launch Tracking** — Event detection and categorization of missile/rocket activity from OSINT data
- **Military Movement Indicators** — Aircraft tracking via ADS-B Exchange and naval vessel positions from OSINT data (carriers, destroyers, submarines)
- **Real-Time Alerts** — Automatic alert generation for high-severity events (nuclear activity, missile launches, invasions)
- **Event Timeline** — Horizontal scrolling timeline panel showing the latest incidents in chronological order
- **Dark Theme UI** — Professional dark theme with color-coded severity indicators

## Architecture

The application follows a modular architecture with clear separation of concerns:

```
src/GlobalMilitaryMonitor/
├── DataIngestion/          # Data feed layer
│   ├── Interfaces/         # IDataFeedService, IDataAggregator
│   ├── Models/             # GeoEvent, ConflictZone, MilitaryAsset
│   └── Services/           # GDELT, RSS, ConflictZone, MilitaryAsset feeds
├── MapRendering/           # GMap.NET WPF map controller
├── EventProcessing/        # Event filtering, categorization, severity assessment
├── Caching/                # In-memory caching layer
├── Configuration/          # Application settings
└── UI/                     # WPF presentation layer
    ├── Views/              # MainWindow XAML
    ├── ViewModels/         # MainViewModel (MVVM)
    ├── Converters/         # WPF value converters
    └── Themes/             # Dark theme resource dictionary
```

### Data Sources

| Source | Type | Data |
|--------|------|------|
| GDELT Project API | REST/JSON | Global conflict events, geo-located incidents |
| RSS Feeds (BBC, NYT, etc.) | RSS/XML | Defense and military news articles |
| ADS-B Exchange | REST/JSON | Military aircraft positions and tracking |
| OSINT Database | Seed Data | Known military deployments, conflict zones |

### Key Design Decisions

- **Modular Data Feeds**: All data sources implement `IDataFeedService`, making it easy to add new feeds without modifying existing code
- **Background Refresh**: Each feed runs on its own timer (30-60 seconds) on background threads, keeping the UI responsive
- **Dependency Injection**: Microsoft.Extensions.DependencyInjection for clean service registration and lifecycle management
- **MVVM Pattern**: Clean separation between UI (XAML) and business logic (ViewModels)
- **In-Memory Caching**: Microsoft.Extensions.Caching.Memory for reducing redundant API calls

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

To add a new data source, implement the `IDataFeedService` interface:

```csharp
public class MyNewFeedService : IDataFeedService
{
    public string FeedName => "My New Feed";
    public string FeedDescription => "Description of the feed";
    public bool IsEnabled { get; set; } = true;
    public TimeSpan RefreshInterval => TimeSpan.FromSeconds(45);

    public async Task<IEnumerable<GeoEvent>> FetchEventsAsync(CancellationToken ct)
    {
        // Fetch and return events
    }

    public Task<IEnumerable<ConflictZone>> FetchConflictZonesAsync(CancellationToken ct)
        => Task.FromResult<IEnumerable<ConflictZone>>(Array.Empty<ConflictZone>());

    public Task<IEnumerable<MilitaryAsset>> FetchMilitaryAssetsAsync(CancellationToken ct)
        => Task.FromResult<IEnumerable<MilitaryAsset>>(Array.Empty<MilitaryAsset>());
}
```

Then register it in `App.xaml.cs`:

```csharp
services.AddSingleton<IDataFeedService, MyNewFeedService>();
```

The aggregator will automatically pick it up and include it in the refresh cycle.

## NuGet Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| GMap.NET.WinPresentation | 2.1.7 | WPF map control with OpenStreetMap |
| Microsoft.Extensions.DependencyInjection | 8.0.1 | Dependency injection container |
| Microsoft.Extensions.Hosting | 8.0.1 | Host builder and configuration |
| Microsoft.Extensions.Http | 8.0.1 | HttpClient factory |
| Microsoft.Extensions.Caching.Memory | 8.0.1 | In-memory caching |
| Newtonsoft.Json | 13.0.3 | JSON parsing for API responses |
| System.ServiceModel.Syndication | 8.0.0 | RSS/Atom feed parsing |

## License

This project is provided as-is for educational and research purposes. Data from third-party APIs is subject to their respective terms of service.
