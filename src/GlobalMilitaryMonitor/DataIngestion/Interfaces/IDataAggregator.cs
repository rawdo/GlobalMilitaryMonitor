using GlobalMilitaryMonitor.DataIngestion.Models;

namespace GlobalMilitaryMonitor.DataIngestion.Interfaces;

public interface IDataAggregator
{
    event EventHandler<IEnumerable<GeoEvent>>? EventsUpdated;
    event EventHandler<IEnumerable<ConflictZone>>? ConflictZonesUpdated;
    event EventHandler<IEnumerable<MilitaryAsset>>? MilitaryAssetsUpdated;
    event EventHandler<GeoEvent>? AlertTriggered;

    IReadOnlyList<GeoEvent> CurrentEvents { get; }
    IReadOnlyList<ConflictZone> CurrentConflictZones { get; }
    IReadOnlyList<MilitaryAsset> CurrentMilitaryAssets { get; }

    void RegisterFeed(IDataFeedService feed);
    void UnregisterFeed(string feedName);
    Task StartAsync(CancellationToken cancellationToken = default);
    Task StopAsync();
    Task RefreshAllAsync(CancellationToken cancellationToken = default);
}
