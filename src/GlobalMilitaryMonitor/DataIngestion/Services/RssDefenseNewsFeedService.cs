using System.Net.Http;
using System.ServiceModel.Syndication;
using System.Xml;
using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Models;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// Fetches defense and military news from multiple RSS feeds.
/// Sources include major defense publications with public RSS feeds.
/// </summary>
public class RssDefenseNewsFeedService : IDataFeedService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RssDefenseNewsFeedService> _logger;

    private static readonly string[] RssFeeds =
    {
        "https://feeds.feedburner.com/defense-news/home",
        "https://www.janes.com/feeds/news",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://www.aljazeera.com/xml/rss/all.xml",
    };

    public string FeedName => "RSS Defense News";
    public string FeedDescription => "Defense and military news from major RSS feeds";
    public bool IsEnabled { get; set; } = true;
    public TimeSpan RefreshInterval => TimeSpan.FromSeconds(60);

    public RssDefenseNewsFeedService(HttpClient httpClient, ILogger<RssDefenseNewsFeedService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<IEnumerable<GeoEvent>> FetchEventsAsync(CancellationToken cancellationToken = default)
    {
        var events = new List<GeoEvent>();

        foreach (var feedUrl in RssFeeds)
        {
            try
            {
                var feedEvents = await FetchFromFeedAsync(feedUrl, cancellationToken);
                events.AddRange(feedEvents);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch RSS feed: {FeedUrl}", feedUrl);
            }
        }

        return events
            .Where(e => IsMilitaryRelated(e.Title))
            .OrderByDescending(e => e.Timestamp)
            .Take(50);
    }

    public Task<IEnumerable<ConflictZone>> FetchConflictZonesAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IEnumerable<ConflictZone>>(Array.Empty<ConflictZone>());
    }

    public Task<IEnumerable<MilitaryAsset>> FetchMilitaryAssetsAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IEnumerable<MilitaryAsset>>(Array.Empty<MilitaryAsset>());
    }

    private async Task<IEnumerable<GeoEvent>> FetchFromFeedAsync(string feedUrl, CancellationToken cancellationToken)
    {
        var events = new List<GeoEvent>();

        using var request = new HttpRequestMessage(HttpMethod.Get, feedUrl);
        request.Headers.Add("User-Agent", "GlobalMilitaryMonitor/1.0");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = XmlReader.Create(stream);

        var feed = SyndicationFeed.Load(reader);
        if (feed == null) return events;

        var sourceName = feed.Title?.Text ?? new Uri(feedUrl).Host;

        foreach (var item in feed.Items.Take(20))
        {
            var title = item.Title?.Text ?? string.Empty;
            var description = item.Summary?.Text ?? string.Empty;
            var link = item.Links.FirstOrDefault()?.Uri?.ToString() ?? string.Empty;
            var pubDate = item.PublishDate.UtcDateTime;

            if (pubDate == DateTime.MinValue)
                pubDate = DateTime.UtcNow;

            var (lat, lon, country) = GuessLocation(title + " " + description);
            var category = CategorizeContent(title + " " + description);
            var severity = AssessSeverity(title + " " + description);

            events.Add(new GeoEvent
            {
                Title = StripHtml(title),
                Description = StripHtml(description).Length > 200
                    ? StripHtml(description)[..200] + "..."
                    : StripHtml(description),
                Latitude = lat,
                Longitude = lon,
                Timestamp = pubDate,
                Category = category,
                Severity = severity,
                Source = sourceName,
                SourceUrl = link,
                Country = country,
                IsAlert = severity >= SeverityLevel.High
            });
        }

        return events;
    }

    private static bool IsMilitaryRelated(string text)
    {
        var keywords = new[]
        {
            "military", "war", "conflict", "missile", "troops", "army", "navy", "air force",
            "nuclear", "weapon", "strike", "attack", "defense", "defence", "drone", "bomb",
            "combat", "battlefield", "invasion", "sanctions", "nato", "pentagon", "soldier",
            "tank", "fighter jet", "warship", "submarine", "cyber attack", "terrorist",
            "airstrike", "ceasefire", "casualties", "ammunition", "artillery", "garrison"
        };
        var lower = text.ToLowerInvariant();
        return keywords.Any(k => lower.Contains(k));
    }

    private static EventCategory CategorizeContent(string text)
    {
        var lower = text.ToLowerInvariant();
        if (lower.Contains("missile") || lower.Contains("rocket") || lower.Contains("launch"))
            return EventCategory.MissileLaunch;
        if (lower.Contains("navy") || lower.Contains("naval") || lower.Contains("ship"))
            return EventCategory.NavalActivity;
        if (lower.Contains("aircraft") || lower.Contains("jet") || lower.Contains("air force") || lower.Contains("drone"))
            return EventCategory.AirActivity;
        if (lower.Contains("troop") || lower.Contains("deploy") || lower.Contains("army"))
            return EventCategory.MilitaryMovement;
        if (lower.Contains("nuclear"))
            return EventCategory.NuclearActivity;
        if (lower.Contains("cyber") || lower.Contains("hack"))
            return EventCategory.CyberAttack;
        if (lower.Contains("sanction"))
            return EventCategory.Sanctions;
        if (lower.Contains("diplomat") || lower.Contains("treaty") || lower.Contains("summit"))
            return EventCategory.Diplomacy;
        if (lower.Contains("terror"))
            return EventCategory.Terrorism;
        return EventCategory.Conflict;
    }

    private static SeverityLevel AssessSeverity(string text)
    {
        var lower = text.ToLowerInvariant();
        if (lower.Contains("nuclear") || lower.Contains("icbm"))
            return SeverityLevel.Critical;
        if (lower.Contains("casualties") || lower.Contains("invasion") || lower.Contains("missile launch"))
            return SeverityLevel.High;
        if (lower.Contains("attack") || lower.Contains("strike") || lower.Contains("conflict"))
            return SeverityLevel.Medium;
        return SeverityLevel.Low;
    }

    private static (double lat, double lon, string country) GuessLocation(string text)
    {
        var locationMap = new Dictionary<string, (double, double, string)>(StringComparer.OrdinalIgnoreCase)
        {
            ["Ukraine"] = (48.38, 31.17, "Ukraine"),
            ["Russia"] = (61.52, 105.32, "Russia"),
            ["China"] = (35.86, 104.20, "China"),
            ["Taiwan"] = (23.70, 120.96, "Taiwan"),
            ["Iran"] = (32.43, 53.69, "Iran"),
            ["Israel"] = (31.05, 34.85, "Israel"),
            ["Gaza"] = (31.35, 34.31, "Palestine"),
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
            ["Myanmar"] = (21.91, 95.96, "Myanmar"),
            ["Pakistan"] = (30.38, 69.35, "Pakistan"),
            ["India"] = (20.59, 78.96, "India"),
            ["Lebanon"] = (33.85, 35.86, "Lebanon"),
        };

        foreach (var kvp in locationMap)
        {
            if (text.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                return kvp.Value;
        }

        var rng = new Random(text.GetHashCode());
        return (rng.Next(-50, 60), rng.Next(-150, 160), "Unknown");
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return html;
        return System.Text.RegularExpressions.Regex.Replace(html, "<[^>]*>", string.Empty).Trim();
    }
}
