using System.Net;
using System.Net.Http;
using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Services;
using GlobalMilitaryMonitor.DataIngestion.Sources;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Xunit.Abstractions;

namespace GlobalMilitaryMonitor.Tests;

/// <summary>
/// Hits every real source over the network. Skipped unless GMM_LIVE_TESTS=1, since it depends on
/// third-party availability:  GMM_LIVE_TESTS=1 dotnet test --filter Category=Live
/// </summary>
[Trait("Category", "Live")]
public class LiveSourceTests
{
    private readonly ITestOutputHelper _output;

    public LiveSourceTests(ITestOutputHelper output) => _output = output;

    [SkippableFact]
    public async Task EverySourceReturnsLiveData()
    {
        Skip.IfNot(Environment.GetEnvironmentVariable("GMM_LIVE_TESTS") == "1", "Set GMM_LIVE_TESTS=1 to run");

        using var http = new HttpClient(new HttpClientHandler { AutomaticDecompression = DecompressionMethods.All })
        {
            Timeout = TimeSpan.FromSeconds(20),
        };
        http.DefaultRequestHeaders.Add("User-Agent", "GlobalMilitaryMonitor/1.0");

        var feeds = new List<IDataFeedService> { new GdeltFeedService(http, NullLogger<GdeltFeedService>.Instance) };
        feeds.AddRange(SourceCatalog.Rss.Select(s => new RssFeedService(s, http, NullLogger<RssFeedService>.Instance)));
        feeds.AddRange(SourceCatalog.Aircraft.Select(s => new MilitaryAircraftFeedService(s, http, NullLogger<MilitaryAircraftFeedService>.Instance)));

        var results = await Task.WhenAll(feeds.Select(async f => (Feed: f, Result: await f.FetchAsync())));

        foreach (var (feed, result) in results)
        {
            var items = result.Events.Count + result.Assets.Count;
            var newest = result.Events.Count > 0 ? $" newest {result.Events.Max(e => e.Timestamp):yyyy-MM-dd HH:mm}Z" : string.Empty;
            _output.WriteLine($"{(result.Success ? "OK  " : "FAIL")} {feed.FeedName,-30} {items,4} items{newest}  next: {result.Next.Reason}{(result.Error is null ? "" : "  error: " + result.Error)}");
        }

        // GDELT rate-limits shared IPs aggressively, so it alone may fail without the sources being broken.
        var failures = results.Where(r => !r.Result.Success && r.Feed is not GdeltFeedService).Select(r => $"{r.Feed.FeedName}: {r.Result.Error}").ToList();
        Assert.True(failures.Count == 0, "Failing sources:\n" + string.Join("\n", failures));
        Assert.All(results.Where(r => r.Result.Success), r => Assert.True(r.Result.Events.Count + r.Result.Assets.Count > 0, $"{r.Feed.FeedName} returned no items"));
    }
}
