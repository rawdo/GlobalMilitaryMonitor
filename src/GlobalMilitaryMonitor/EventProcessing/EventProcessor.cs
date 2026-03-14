using GlobalMilitaryMonitor.DataIngestion.Models;

namespace GlobalMilitaryMonitor.EventProcessing;

public class EventFilterCriteria
{
    public HashSet<EventCategory> Categories { get; set; } = new();
    public HashSet<SeverityLevel> Severities { get; set; } = new();
    public string? SearchText { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Country { get; set; }
    public bool AlertsOnly { get; set; }
}

public class EventProcessor
{
    public IEnumerable<GeoEvent> FilterEvents(IEnumerable<GeoEvent> events, EventFilterCriteria criteria)
    {
        var query = events.AsEnumerable();

        if (criteria.Categories.Count > 0)
            query = query.Where(e => criteria.Categories.Contains(e.Category));

        if (criteria.Severities.Count > 0)
            query = query.Where(e => criteria.Severities.Contains(e.Severity));

        if (!string.IsNullOrWhiteSpace(criteria.SearchText))
        {
            var searchLower = criteria.SearchText.ToLowerInvariant();
            query = query.Where(e =>
                e.Title.ToLowerInvariant().Contains(searchLower) ||
                e.Description.ToLowerInvariant().Contains(searchLower) ||
                e.Country.ToLowerInvariant().Contains(searchLower));
        }

        if (criteria.FromDate.HasValue)
            query = query.Where(e => e.Timestamp >= criteria.FromDate.Value);

        if (criteria.ToDate.HasValue)
            query = query.Where(e => e.Timestamp <= criteria.ToDate.Value);

        if (!string.IsNullOrWhiteSpace(criteria.Country))
            query = query.Where(e => e.Country.Equals(criteria.Country, StringComparison.OrdinalIgnoreCase));

        if (criteria.AlertsOnly)
            query = query.Where(e => e.IsAlert);

        return query.OrderByDescending(e => e.Timestamp);
    }

    public Dictionary<EventCategory, int> GetCategoryCounts(IEnumerable<GeoEvent> events)
    {
        return events.GroupBy(e => e.Category)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    public Dictionary<SeverityLevel, int> GetSeverityCounts(IEnumerable<GeoEvent> events)
    {
        return events.GroupBy(e => e.Severity)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    public IEnumerable<GeoEvent> GetRecentAlerts(IEnumerable<GeoEvent> events, int count = 10)
    {
        return events
            .Where(e => e.IsAlert)
            .OrderByDescending(e => e.Timestamp)
            .Take(count);
    }

    public IEnumerable<IGrouping<string, GeoEvent>> GroupByRegion(IEnumerable<GeoEvent> events)
    {
        return events.GroupBy(e => e.Country)
            .OrderByDescending(g => g.Max(e => e.Severity));
    }
}
