using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// Polls every source on its own schedule (as soon as that source says new content can exist) and
/// merges the results: deduplicated events, hotspots derived from them, and aircraft merged across
/// ADS-B networks.
/// </summary>
public class DataAggregator : IDataAggregator, IDisposable
{
    public const int MaxEvents = 400;

    private sealed class FeedState
    {
        public required IDataFeedService Feed { get; init; }
        public required SourceStatus Status { get; init; }
        public IReadOnlyList<GeoEvent> Events { get; set; } = Array.Empty<GeoEvent>();
        public IReadOnlyList<MilitaryAsset> Assets { get; set; } = Array.Empty<MilitaryAsset>();
        public DateTime LastRequest { get; set; } = DateTime.MinValue;
        public SemaphoreSlim Gate { get; } = new(1, 1);
        public CancellationTokenSource? Wake { get; set; }
    }

    private readonly ILogger<DataAggregator> _logger;
    private readonly List<FeedState> _feeds = new();
    private readonly HashSet<string> _alertedIds = new();
    private readonly object _lock = new();
    private IReadOnlyList<GeoEvent> _events = Array.Empty<GeoEvent>();
    private IReadOnlyList<ConflictZone> _hotspots = Array.Empty<ConflictZone>();
    private IReadOnlyList<MilitaryAsset> _assets = Array.Empty<MilitaryAsset>();
    private CancellationTokenSource? _cts;
    private bool _disposed;

    public event EventHandler<IReadOnlyList<GeoEvent>>? EventsUpdated;
    public event EventHandler<IReadOnlyList<ConflictZone>>? ConflictZonesUpdated;
    public event EventHandler<IReadOnlyList<MilitaryAsset>>? MilitaryAssetsUpdated;
    public event EventHandler<GeoEvent>? AlertTriggered;
    public event EventHandler<IReadOnlyList<SourceStatus>>? SourcesUpdated;

    public DataAggregator(ILogger<DataAggregator> logger)
    {
        _logger = logger;
    }

    public IReadOnlyList<GeoEvent> CurrentEvents { get { lock (_lock) return _events; } }
    public IReadOnlyList<ConflictZone> CurrentConflictZones { get { lock (_lock) return _hotspots; } }
    public IReadOnlyList<MilitaryAsset> CurrentMilitaryAssets { get { lock (_lock) return _assets; } }

    public IReadOnlyList<SourceStatus> SourceStatuses
    {
        get { lock (_lock) return _feeds.Select(f => f.Status).ToList(); }
    }

    public void RegisterFeed(IDataFeedService feed)
    {
        lock (_lock)
        {
            if (_feeds.Any(f => f.Feed.FeedName == feed.FeedName)) return;
            _feeds.Add(new FeedState
            {
                Feed = feed,
                Status = new SourceStatus { Name = feed.FeedName, Group = feed.Group, Url = feed.Url },
            });
        }
        _logger.LogInformation("Registered data feed: {FeedName}", feed.FeedName);
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        // The loops outlive the caller's (startup timeout) token; StopAsync / Dispose end them.
        _cts = new CancellationTokenSource();
        _logger.LogInformation("Starting data aggregator with {Count} feeds", _feeds.Count);

        var loops = _feeds.Select(f => Task.Run(() => RunFeedLoopAsync(f, _cts.Token))).ToList();
        _ = Task.WhenAll(loops);

        // Return once every source has had its first attempt (or the caller gives up waiting).
        while (_feeds.Any(f => f.Status.LastChecked is null))
        {
            await Task.Delay(250, cancellationToken);
        }
    }

    public Task StopAsync()
    {
        _cts?.Cancel();
        _logger.LogInformation("Data aggregator stopped");
        return Task.CompletedTask;
    }

    public async Task RefreshAllAsync(CancellationToken cancellationToken = default)
    {
        var token = _cts?.Token ?? cancellationToken;
        await Task.WhenAll(_feeds.Select(f => PollAsync(f, token)));
    }

    private async Task RunFeedLoopAsync(FeedState state, CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            var delay = (state.Status.NextCheck ?? DateTime.UtcNow) - DateTime.UtcNow;
            using var wake = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            state.Wake = wake;
            try
            {
                if (delay > TimeSpan.Zero) await Task.Delay(delay, wake.Token);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                // Rescheduled (e.g. by a manual refresh): recompute the delay.
                continue;
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                await PollAsync(state, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error polling {FeedName}", state.Feed.FeedName);
                state.Status.NextCheck = DateTime.UtcNow.AddMinutes(1);
            }
        }
    }

    private async Task PollAsync(FeedState state, CancellationToken cancellationToken)
    {
        if (!state.Feed.IsEnabled) return;
        // A poll already in flight for this source satisfies the request.
        if (!await state.Gate.WaitAsync(0, cancellationToken)) return;
        try
        {
            var sinceLast = DateTime.UtcNow - state.LastRequest;
            if (sinceLast < state.Feed.HardMinGap)
            {
                state.Status.NextCheck = state.LastRequest + state.Feed.HardMinGap;
                return;
            }

            state.LastRequest = DateTime.UtcNow;
            var result = await state.Feed.FetchAsync(cancellationToken);
            var now = DateTime.UtcNow;

            lock (_lock)
            {
                if (result.Success && result.Changed)
                {
                    state.Events = result.Events;
                    state.Assets = result.Assets;
                    state.Status.LastChanged = now;
                }
                // On failure the last good items are kept: stale news beats an empty screen.
                state.Status.Ok = result.Success;
                state.Status.Error = result.Error;
                state.Status.ItemCount = state.Events.Count + state.Assets.Count;
                state.Status.LastChecked = now;
                state.Status.NextCheck = now + result.Next.Delay;
                state.Status.Schedule = result.Next.Reason;
            }

            Publish(result.Success && result.Changed, now);
        }
        finally
        {
            state.Gate.Release();
            try
            {
                state.Wake?.Cancel();
            }
            catch (ObjectDisposedException)
            {
                // The loop already moved on to a new wait.
            }
        }
    }

    private void Publish(bool dataChanged, DateTime now)
    {
        IReadOnlyList<GeoEvent> events;
        IReadOnlyList<ConflictZone> hotspots;
        IReadOnlyList<MilitaryAsset> assets;
        List<GeoEvent> newAlerts;
        IReadOnlyList<SourceStatus> statuses;

        lock (_lock)
        {
            if (dataChanged)
            {
                _events = MergeEvents(_feeds.Select(f => f.Events));
                _hotspots = HotspotAnalyzer.Analyze(_events, now);
                _assets = MergeAssets(_feeds.Select(f => f.Assets));
            }
            events = _events;
            hotspots = _hotspots;
            assets = _assets;
            newAlerts = _events.Where(e => e.IsAlert && _alertedIds.Add(e.Id)).ToList();
            statuses = _feeds.Select(f => f.Status).ToList();
        }

        if (dataChanged)
        {
            EventsUpdated?.Invoke(this, events);
            ConflictZonesUpdated?.Invoke(this, hotspots);
            MilitaryAssetsUpdated?.Invoke(this, assets);
            foreach (var alert in newAlerts.OrderBy(e => e.Timestamp)) AlertTriggered?.Invoke(this, alert);
        }
        SourcesUpdated?.Invoke(this, statuses);
    }

    /// <summary>Dedupes by normalised title (the same story often arrives via several outlets), newest first.</summary>
    public static IReadOnlyList<GeoEvent> MergeEvents(IEnumerable<IReadOnlyList<GeoEvent>> groups)
    {
        var seen = new HashSet<string>();
        return groups
            .SelectMany(g => g)
            .Where(e => seen.Add(TextClassifier.NormalizeTitle(e.Title)))
            .OrderByDescending(e => e.Timestamp)
            .Take(MaxEvents)
            .ToList();
    }

    /// <summary>Merges aircraft reported by several networks, keeping the freshest position of each.</summary>
    public static IReadOnlyList<MilitaryAsset> MergeAssets(IEnumerable<IReadOnlyList<MilitaryAsset>> groups) =>
        groups
            .SelectMany(g => g)
            .GroupBy(a => a.Id)
            .Select(g => g.MaxBy(a => a.LastSeen)!)
            .ToList();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _cts?.Cancel();
        _cts?.Dispose();
        GC.SuppressFinalize(this);
    }
}
