using System.Collections.Concurrent;
using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Models;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

public class DataAggregator : IDataAggregator, IDisposable
{
    private readonly ILogger<DataAggregator> _logger;
    private readonly ConcurrentDictionary<string, IDataFeedService> _feeds = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _feedTimers = new();
    private readonly List<GeoEvent> _events = new();
    private readonly List<ConflictZone> _conflictZones = new();
    private readonly List<MilitaryAsset> _militaryAssets = new();
    private readonly object _lock = new();
    private CancellationTokenSource? _globalCts;
    private bool _disposed;

    public event EventHandler<IEnumerable<GeoEvent>>? EventsUpdated;
    public event EventHandler<IEnumerable<ConflictZone>>? ConflictZonesUpdated;
    public event EventHandler<IEnumerable<MilitaryAsset>>? MilitaryAssetsUpdated;
    public event EventHandler<GeoEvent>? AlertTriggered;

    public IReadOnlyList<GeoEvent> CurrentEvents
    {
        get { lock (_lock) return _events.ToList().AsReadOnly(); }
    }

    public IReadOnlyList<ConflictZone> CurrentConflictZones
    {
        get { lock (_lock) return _conflictZones.ToList().AsReadOnly(); }
    }

    public IReadOnlyList<MilitaryAsset> CurrentMilitaryAssets
    {
        get { lock (_lock) return _militaryAssets.ToList().AsReadOnly(); }
    }

    public DataAggregator(ILogger<DataAggregator> logger)
    {
        _logger = logger;
    }

    public void RegisterFeed(IDataFeedService feed)
    {
        if (_feeds.TryAdd(feed.FeedName, feed))
        {
            _logger.LogInformation("Registered data feed: {FeedName}", feed.FeedName);
        }
    }

    public void UnregisterFeed(string feedName)
    {
        if (_feeds.TryRemove(feedName, out _))
        {
            if (_feedTimers.TryRemove(feedName, out var cts))
            {
                cts.Cancel();
                cts.Dispose();
            }
            _logger.LogInformation("Unregistered data feed: {FeedName}", feedName);
        }
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        _globalCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _logger.LogInformation("Starting data aggregator with {Count} feeds", _feeds.Count);

        // Initial fetch from all feeds
        await RefreshAllAsync(_globalCts.Token);

        // Start periodic refresh for each feed
        foreach (var feed in _feeds.Values)
        {
            StartFeedRefreshLoop(feed, _globalCts.Token);
        }
    }

    public Task StopAsync()
    {
        _globalCts?.Cancel();
        foreach (var cts in _feedTimers.Values)
        {
            cts.Cancel();
            cts.Dispose();
        }
        _feedTimers.Clear();
        _logger.LogInformation("Data aggregator stopped");
        return Task.CompletedTask;
    }

    public async Task RefreshAllAsync(CancellationToken cancellationToken = default)
    {
        var tasks = _feeds.Values
            .Where(f => f.IsEnabled)
            .Select(f => RefreshFeedAsync(f, cancellationToken));

        await Task.WhenAll(tasks);
    }

    private void StartFeedRefreshLoop(IDataFeedService feed, CancellationToken cancellationToken)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _feedTimers[feed.FeedName] = cts;

        _ = Task.Run(async () =>
        {
            while (!cts.Token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(feed.RefreshInterval, cts.Token);
                    if (feed.IsEnabled)
                    {
                        await RefreshFeedAsync(feed, cts.Token);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in refresh loop for {FeedName}", feed.FeedName);
                    await Task.Delay(TimeSpan.FromSeconds(10), cts.Token);
                }
            }
        }, cts.Token);
    }

    private async Task RefreshFeedAsync(IDataFeedService feed, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Refreshing feed: {FeedName}", feed.FeedName);

            var eventsTask = feed.FetchEventsAsync(cancellationToken);
            var zonesTask = feed.FetchConflictZonesAsync(cancellationToken);
            var assetsTask = feed.FetchMilitaryAssetsAsync(cancellationToken);

            await Task.WhenAll(eventsTask, zonesTask, assetsTask);

            var newEvents = (await eventsTask).ToList();
            var newZones = (await zonesTask).ToList();
            var newAssets = (await assetsTask).ToList();

            bool eventsChanged = false;
            bool zonesChanged = false;
            bool assetsChanged = false;

            lock (_lock)
            {
                if (newEvents.Count > 0)
                {
                    // Merge events, avoiding duplicates by title+source
                    var existingKeys = _events.Select(e => $"{e.Title}|{e.Source}").ToHashSet();
                    var uniqueNew = newEvents.Where(e => !existingKeys.Contains($"{e.Title}|{e.Source}")).ToList();

                    if (uniqueNew.Count > 0)
                    {
                        _events.AddRange(uniqueNew);
                        // Keep only the latest 500 events
                        if (_events.Count > 500)
                        {
                            var sorted = _events.OrderByDescending(e => e.Timestamp).Take(500).ToList();
                            _events.Clear();
                            _events.AddRange(sorted);
                        }
                        eventsChanged = true;

                        // Trigger alerts for high-severity events
                        foreach (var evt in uniqueNew.Where(e => e.IsAlert))
                        {
                            AlertTriggered?.Invoke(this, evt);
                        }
                    }
                }

                if (newZones.Count > 0)
                {
                    _conflictZones.Clear();
                    _conflictZones.AddRange(newZones);
                    zonesChanged = true;
                }

                if (newAssets.Count > 0)
                {
                    _militaryAssets.Clear();
                    _militaryAssets.AddRange(newAssets);
                    assetsChanged = true;
                }
            }

            if (eventsChanged)
                EventsUpdated?.Invoke(this, CurrentEvents);
            if (zonesChanged)
                ConflictZonesUpdated?.Invoke(this, CurrentConflictZones);
            if (assetsChanged)
                MilitaryAssetsUpdated?.Invoke(this, CurrentMilitaryAssets);

            _logger.LogDebug("Feed {FeedName} refreshed: {Events} events, {Zones} zones, {Assets} assets",
                feed.FeedName, newEvents.Count, newZones.Count, newAssets.Count);
        }
        catch (OperationCanceledException)
        {
            // Expected during shutdown
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing feed: {FeedName}", feed.FeedName);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _globalCts?.Cancel();
        _globalCts?.Dispose();
        foreach (var cts in _feedTimers.Values)
        {
            cts.Cancel();
            cts.Dispose();
        }
        GC.SuppressFinalize(this);
    }
}
