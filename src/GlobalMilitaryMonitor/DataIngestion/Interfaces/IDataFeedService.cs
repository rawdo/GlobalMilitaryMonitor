using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;

namespace GlobalMilitaryMonitor.DataIngestion.Interfaces;

public interface IDataFeedService
{
    string FeedName { get; }
    string Group { get; }
    string Url { get; }
    bool IsEnabled { get; set; }

    /// <summary>Minimum spacing between any two requests, including manual refreshes (the source's rate limit).</summary>
    TimeSpan HardMinGap { get; }

    /// <summary>Fetches the source once. Never throws for source errors; they are reported in the result.</summary>
    Task<FeedFetchResult> FetchAsync(CancellationToken cancellationToken = default);
}

public sealed class FeedFetchResult
{
    public bool Success { get; init; }
    /// <summary>False when the source answered 304 Not Modified (keep the previous items).</summary>
    public bool Changed { get; init; }
    public IReadOnlyList<GeoEvent> Events { get; init; } = Array.Empty<GeoEvent>();
    public IReadOnlyList<MilitaryAsset> Assets { get; init; } = Array.Empty<MilitaryAsset>();
    public string? Error { get; init; }
    public required NextFetch Next { get; init; }
}
