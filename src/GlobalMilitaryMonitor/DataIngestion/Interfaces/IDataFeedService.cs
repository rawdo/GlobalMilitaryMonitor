using GlobalMilitaryMonitor.DataIngestion.Models;

namespace GlobalMilitaryMonitor.DataIngestion.Interfaces;

public interface IDataFeedService
{
    string FeedName { get; }
    string FeedDescription { get; }
    bool IsEnabled { get; set; }
    TimeSpan RefreshInterval { get; }

    Task<IEnumerable<GeoEvent>> FetchEventsAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<ConflictZone>> FetchConflictZonesAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<MilitaryAsset>> FetchMilitaryAssetsAsync(CancellationToken cancellationToken = default);
}
