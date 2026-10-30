using GlobalMilitaryMonitor.DataIngestion.Models;

namespace GlobalMilitaryMonitor.DataIngestion.Interfaces;

public interface IDataAggregator
{
    event EventHandler<IReadOnlyList<GeoEvent>>? EventsUpdated;
    /// <summary>Activity hotspots derived from the current events.</summary>
    event EventHandler<IReadOnlyList<ConflictZone>>? ConflictZonesUpdated;
    event EventHandler<IReadOnlyList<MilitaryAsset>>? MilitaryAssetsUpdated;
    event EventHandler<GeoEvent>? AlertTriggered;
    event EventHandler<IReadOnlyList<SourceStatus>>? SourcesUpdated;

    IReadOnlyList<GeoEvent> CurrentEvents { get; }
    IReadOnlyList<ConflictZone> CurrentConflictZones { get; }
    IReadOnlyList<MilitaryAsset> CurrentMilitaryAssets { get; }
    IReadOnlyList<SourceStatus> SourceStatuses { get; }

    void RegisterFeed(IDataFeedService feed);

    /// <summary>Fetches every source once, then keeps each on its own schedule until stopped.</summary>
    Task StartAsync(CancellationToken cancellationToken = default);
    Task StopAsync();

    /// <summary>Checks every source now (respecting each source's minimum request gap).</summary>
    Task RefreshAllAsync(CancellationToken cancellationToken = default);
}
