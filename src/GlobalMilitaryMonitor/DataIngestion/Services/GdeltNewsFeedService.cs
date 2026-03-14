using System.Globalization;
using System.Net.Http;
using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// Fetches geopolitical events from the GDELT Project API.
/// GDELT monitors news media worldwide and provides free access to conflict/event data.
/// </summary>
public class GdeltNewsFeedService : IDataFeedService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GdeltNewsFeedService> _logger;

    private const string GdeltGeoApiUrl =
        "https://api.gdeltproject.org/api/v2/geo/geo?query=conflict%20OR%20military%20OR%20missile%20OR%20war&mode=PointData&format=GeoJSON&timespan=1h";

    private const string GdeltDocApiUrl =
        "https://api.gdeltproject.org/api/v2/doc/doc?query=military%20OR%20conflict%20OR%20missile%20OR%20war%20OR%20troops&mode=ArtList&format=json&maxrecords=50&timespan=60min&sort=DateDesc";

    public string FeedName => "GDELT News Feed";
    public string FeedDescription => "Global conflict and military events from GDELT Project";
    public bool IsEnabled { get; set; } = true;
    public TimeSpan RefreshInterval => TimeSpan.FromSeconds(45);

    public GdeltNewsFeedService(HttpClient httpClient, ILogger<GdeltNewsFeedService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<IEnumerable<GeoEvent>> FetchEventsAsync(CancellationToken cancellationToken = default)
    {
        var events = new List<GeoEvent>();

        try
        {
            var response = await _httpClient.GetStringAsync(GdeltDocApiUrl, cancellationToken);
            var json = JObject.Parse(response);
            var articles = json["articles"];

            if (articles == null) return events;

            foreach (var article in articles)
            {
                var title = article["title"]?.ToString() ?? string.Empty;
                var url = article["url"]?.ToString() ?? string.Empty;
                var sourceName = article["domain"]?.ToString() ?? "GDELT";
                var dateStr = article["seendate"]?.ToString();
                var language = article["language"]?.ToString() ?? "English";

                var timestamp = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(dateStr) &&
                    DateTime.TryParseExact(dateStr, "yyyyMMdd'T'HHmmss'Z'",
                        CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
                {
                    timestamp = parsed.ToUniversalTime();
                }

                var category = CategorizeTitle(title);
                var severity = AssessSeverity(title);
                var (lat, lon, country) = ExtractLocationFromTitle(title);

                events.Add(new GeoEvent
                {
                    Title = title,
                    Description = $"Source: {sourceName} | Language: {language}",
                    Latitude = lat,
                    Longitude = lon,
                    Timestamp = timestamp,
                    Category = category,
                    Severity = severity,
                    Source = sourceName,
                    SourceUrl = url,
                    Country = country,
                    IsAlert = severity >= SeverityLevel.High
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch events from GDELT Doc API");
        }

        try
        {
            var geoResponse = await _httpClient.GetStringAsync(GdeltGeoApiUrl, cancellationToken);
            var geoJson = JObject.Parse(geoResponse);
            var features = geoJson["features"];

            if (features != null)
            {
                foreach (var feature in features.Take(30))
                {
                    var props = feature["properties"];
                    var geometry = feature["geometry"];
                    var coordinates = geometry?["coordinates"];

                    if (coordinates == null || props == null) continue;

                    var lon = coordinates[0]?.Value<double>() ?? 0;
                    var lat = coordinates[1]?.Value<double>() ?? 0;
                    var name = props["name"]?.ToString() ?? "Unknown Event";
                    var urlGeo = props["html"]?.ToString() ?? string.Empty;

                    if (events.All(e => e.Title != name))
                    {
                        events.Add(new GeoEvent
                        {
                            Title = name,
                            Description = "Geo-located event from GDELT",
                            Latitude = lat,
                            Longitude = lon,
                            Timestamp = DateTime.UtcNow,
                            Category = CategorizeTitle(name),
                            Severity = AssessSeverity(name),
                            Source = "GDELT Geo",
                            SourceUrl = urlGeo,
                            IsAlert = false
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch events from GDELT Geo API");
        }

        return events;
    }

    public Task<IEnumerable<ConflictZone>> FetchConflictZonesAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IEnumerable<ConflictZone>>(Array.Empty<ConflictZone>());
    }

    public Task<IEnumerable<MilitaryAsset>> FetchMilitaryAssetsAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IEnumerable<MilitaryAsset>>(Array.Empty<MilitaryAsset>());
    }

    private static EventCategory CategorizeTitle(string title)
    {
        var lower = title.ToLowerInvariant();
        if (lower.Contains("missile") || lower.Contains("rocket") || lower.Contains("launch"))
            return EventCategory.MissileLaunch;
        if (lower.Contains("navy") || lower.Contains("naval") || lower.Contains("ship") || lower.Contains("fleet"))
            return EventCategory.NavalActivity;
        if (lower.Contains("aircraft") || lower.Contains("jet") || lower.Contains("air force") || lower.Contains("drone"))
            return EventCategory.AirActivity;
        if (lower.Contains("troops") || lower.Contains("military") || lower.Contains("army") || lower.Contains("deploy"))
            return EventCategory.MilitaryMovement;
        if (lower.Contains("nuclear") || lower.Contains("uranium") || lower.Contains("atomic"))
            return EventCategory.NuclearActivity;
        if (lower.Contains("cyber") || lower.Contains("hack"))
            return EventCategory.CyberAttack;
        if (lower.Contains("sanction") || lower.Contains("embargo"))
            return EventCategory.Sanctions;
        if (lower.Contains("diplomat") || lower.Contains("treaty") || lower.Contains("summit") || lower.Contains("negotiat"))
            return EventCategory.Diplomacy;
        if (lower.Contains("terror") || lower.Contains("bombing") || lower.Contains("attack") || lower.Contains("ied"))
            return EventCategory.Terrorism;
        if (lower.Contains("conflict") || lower.Contains("war") || lower.Contains("fight") || lower.Contains("battle") || lower.Contains("strike"))
            return EventCategory.Conflict;
        return EventCategory.Other;
    }

    private static SeverityLevel AssessSeverity(string title)
    {
        var lower = title.ToLowerInvariant();
        if (lower.Contains("nuclear") || lower.Contains("icbm") || lower.Contains("wmd"))
            return SeverityLevel.Critical;
        if (lower.Contains("missile launch") || lower.Contains("invasion") || lower.Contains("war declared") ||
            lower.Contains("casualties"))
            return SeverityLevel.High;
        if (lower.Contains("military") || lower.Contains("conflict") || lower.Contains("strike") ||
            lower.Contains("attack"))
            return SeverityLevel.Medium;
        return SeverityLevel.Low;
    }

    private static (double lat, double lon, string country) ExtractLocationFromTitle(string title)
    {
        var locationMap = new Dictionary<string, (double lat, double lon, string country)>(StringComparer.OrdinalIgnoreCase)
        {
            ["Ukraine"] = (48.38, 31.17, "Ukraine"),
            ["Russia"] = (61.52, 105.32, "Russia"),
            ["China"] = (35.86, 104.20, "China"),
            ["Taiwan"] = (23.70, 120.96, "Taiwan"),
            ["Iran"] = (32.43, 53.69, "Iran"),
            ["Israel"] = (31.05, 34.85, "Israel"),
            ["Gaza"] = (31.35, 34.31, "Palestine"),
            ["Palestine"] = (31.90, 35.20, "Palestine"),
            ["Syria"] = (34.80, 38.99, "Syria"),
            ["Yemen"] = (15.55, 48.52, "Yemen"),
            ["North Korea"] = (40.34, 127.51, "North Korea"),
            ["South Korea"] = (35.91, 127.77, "South Korea"),
            ["Japan"] = (36.20, 138.25, "Japan"),
            ["Iraq"] = (33.22, 43.68, "Iraq"),
            ["Afghanistan"] = (33.94, 67.71, "Afghanistan"),
            ["Libya"] = (26.34, 17.23, "Libya"),
            ["Somalia"] = (5.15, 46.20, "Somalia"),
            ["Sudan"] = (12.86, 30.22, "Sudan"),
            ["Ethiopia"] = (9.15, 40.49, "Ethiopia"),
            ["Myanmar"] = (21.91, 95.96, "Myanmar"),
            ["Pakistan"] = (30.38, 69.35, "Pakistan"),
            ["India"] = (20.59, 78.96, "India"),
            ["Lebanon"] = (33.85, 35.86, "Lebanon"),
            ["Red Sea"] = (20.0, 38.0, "Red Sea"),
            ["South China Sea"] = (12.0, 114.0, "South China Sea"),
            ["Baltic"] = (58.0, 20.0, "Baltic Region"),
            ["Arctic"] = (75.0, 30.0, "Arctic"),
            ["NATO"] = (50.85, 4.35, "NATO/Brussels"),
            ["Pentagon"] = (38.87, -77.06, "United States"),
        };

        foreach (var kvp in locationMap)
        {
            if (title.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                return kvp.Value;
        }

        var rng = new Random(title.GetHashCode());
        return (rng.Next(-60, 70), rng.Next(-160, 170), "Unknown");
    }
}
