using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;
using GlobalMilitaryMonitor.DataIngestion.Services;
using Xunit;

namespace GlobalMilitaryMonitor.Tests;

public class SchedulingAndAggregationTests
{
    private static readonly ScheduleLimits Limits = new(TimeSpan.FromSeconds(30), TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(2));

    private static HttpResponseMessage Response(string? cacheControl = null, int? ageSeconds = null)
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("") };
        if (cacheControl != null) response.Headers.CacheControl = CacheControlHeaderValue.Parse(cacheControl);
        if (ageSeconds != null) response.Headers.Age = TimeSpan.FromSeconds(ageSeconds.Value);
        return response;
    }

    [Fact]
    public void Freshness_FromCacheControlMinusAge()
    {
        Assert.Equal(TimeSpan.FromSeconds(300), RefreshScheduler.Freshness(Response("max-age=300, must-revalidate")));
        Assert.Equal(TimeSpan.FromSeconds(270), RefreshScheduler.Freshness(Response("public, max-age=300", ageSeconds: 30)));
        Assert.Equal(TimeSpan.Zero, RefreshScheduler.Freshness(Response("no-store")));
        Assert.Null(RefreshScheduler.Freshness(Response()));
    }

    [Fact]
    public void AfterSuccess_UsesSourceCacheLifetimeClamped()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), RefreshScheduler.AfterSuccess(TimeSpan.FromSeconds(300), Limits).Delay);
        var bbc = RefreshScheduler.AfterSuccess(TimeSpan.FromSeconds(4), Limits);
        Assert.Equal(TimeSpan.FromSeconds(30), bbc.Delay);
        Assert.Contains("minimum", bbc.Reason);
        Assert.Equal(TimeSpan.FromMinutes(15), RefreshScheduler.AfterSuccess(TimeSpan.FromDays(1), Limits).Delay);
        Assert.Equal(TimeSpan.FromMinutes(2), RefreshScheduler.AfterSuccess(null, Limits).Delay);
    }

    [Fact]
    public void AfterFailure_HonoursRetryAfterElseBacksOff()
    {
        Assert.Equal(TimeSpan.FromMinutes(2), RefreshScheduler.AfterFailure(HttpStatusCode.TooManyRequests, TimeSpan.FromMinutes(2), 1, Limits).Delay);
        Assert.Equal(TimeSpan.FromSeconds(30), RefreshScheduler.AfterFailure(HttpStatusCode.TooManyRequests, null, 1, Limits).Delay);
        Assert.Equal(TimeSpan.FromSeconds(60), RefreshScheduler.AfterFailure(HttpStatusCode.InternalServerError, null, 2, Limits).Delay);
        Assert.Equal(TimeSpan.FromSeconds(120), RefreshScheduler.AfterFailure(null, null, 3, Limits).Delay);
        Assert.Equal(TimeSpan.FromMinutes(15), RefreshScheduler.AfterFailure(null, null, 40, Limits).Delay);
    }

    private static GeoEvent Event(string title, string country, SeverityLevel severity, DateTime timestamp, string source = "Test") => new()
    {
        Id = title,
        Title = title,
        Country = country,
        Latitude = country == "Unknown" ? null : 1,
        Longitude = country == "Unknown" ? null : 2,
        Severity = severity,
        Timestamp = timestamp,
        Source = source,
    };

    [Fact]
    public void Hotspots_DerivedFromRecentLocatedReports()
    {
        var now = new DateTime(2026, 10, 30, 12, 0, 0, DateTimeKind.Utc);
        var events = new List<GeoEvent>();
        for (var i = 0; i < 16; i++) events.Add(Event($"u{i}", "Ukraine", i < 2 ? SeverityLevel.High : SeverityLevel.Medium, now.AddHours(-1), i % 2 == 0 ? "A" : "B"));
        for (var i = 0; i < 3; i++) events.Add(Event($"s{i}", "Sudan", SeverityLevel.Low, now.AddHours(-2)));
        for (var i = 0; i < 2; i++) events.Add(Event($"m{i}", "Mali", SeverityLevel.Low, now.AddHours(-2)));        // too few
        for (var i = 0; i < 5; i++) events.Add(Event($"old{i}", "Iraq", SeverityLevel.High, now.AddHours(-30)));    // too old
        for (var i = 0; i < 5; i++) events.Add(Event($"x{i}", "Unknown", SeverityLevel.High, now));                 // no location
        for (var i = 0; i < 5; i++) events.Add(Event($"p{i}", "United States", SeverityLevel.Medium, now));         // institutional

        var hotspots = HotspotAnalyzer.Analyze(events, now);

        Assert.Equal(new[] { "Ukraine", "Sudan" }, hotspots.Select(h => h.Name));
        Assert.Equal(SeverityLevel.High, hotspots[0].Intensity);
        Assert.Equal(16, hotspots[0].ReportCount);
        Assert.Equal(2, hotspots[0].HighSeverityCount);
        Assert.Equal(new[] { "A", "B" }, hotspots[0].Sources);
        Assert.Equal(SeverityLevel.Low, hotspots[1].Intensity);
    }

    [Fact]
    public void MergeEvents_DedupesByTitleAcrossSourcesNewestFirst()
    {
        var t = new DateTime(2026, 10, 30, 0, 0, 0, DateTimeKind.Utc);
        var merged = DataAggregator.MergeEvents(new IReadOnlyList<GeoEvent>[]
        {
            new[] { Event("Strike on depot", "Ukraine", SeverityLevel.Medium, t), Event("Older", "Ukraine", SeverityLevel.Low, t.AddHours(-1)) },
            new[] { Event("Strike on depot!", "Ukraine", SeverityLevel.Medium, t, "Other outlet"), Event("Newest", "Iran", SeverityLevel.Low, t.AddHours(1)) },
        });
        Assert.Equal(new[] { "Newest", "Strike on depot", "Older" }, merged.Select(e => e.Title));
    }

    [Fact]
    public void MergeAssets_KeepsFreshestPositionPerAircraft()
    {
        var t = new DateTime(2026, 10, 30, 0, 0, 0, DateTimeKind.Utc);
        var merged = DataAggregator.MergeAssets(new IReadOnlyList<MilitaryAsset>[]
        {
            new[] { new MilitaryAsset { Id = "ae0001", Latitude = 1, LastSeen = t }, new MilitaryAsset { Id = "ae0002", LastSeen = t } },
            new[] { new MilitaryAsset { Id = "ae0001", Latitude = 2, LastSeen = t.AddSeconds(5) } },
        });
        Assert.Equal(2, merged.Count);
        Assert.Equal(2, merged.Single(a => a.Id == "ae0001").Latitude);
    }
}
