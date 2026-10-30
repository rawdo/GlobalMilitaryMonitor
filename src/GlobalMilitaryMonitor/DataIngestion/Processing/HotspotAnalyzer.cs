using GlobalMilitaryMonitor.DataIngestion.Models;

namespace GlobalMilitaryMonitor.DataIngestion.Processing;

/// <summary>
/// Derives activity hotspots from live events: places where recent reports cluster, rated by how many
/// reports there are and how severe they are. Replaces hand-entered conflict zones.
/// Mirrors mobile/src/lib/hotspots.ts.
/// </summary>
public static class HotspotAnalyzer
{
    public static readonly TimeSpan Window = TimeSpan.FromHours(24);
    public const int MinReports = 3;

    // Institutional locations (e.g. "Pentagon", "NATO") mark where news is made, not where fighting is.
    private static readonly HashSet<string> Excluded = new(StringComparer.OrdinalIgnoreCase) { "NATO/Brussels", "United States" };

    public static SeverityLevel RateIntensity(int reports, int highSeverity) =>
        highSeverity >= 5 || reports >= 30 ? SeverityLevel.Critical
        : highSeverity >= 2 || reports >= 15 ? SeverityLevel.High
        : reports >= 6 ? SeverityLevel.Medium
        : SeverityLevel.Low;

    public static List<ConflictZone> Analyze(IEnumerable<GeoEvent> events, DateTime nowUtc)
    {
        var since = nowUtc - Window;
        return events
            .Where(e => e.HasLocation && e.Timestamp >= since && !string.IsNullOrEmpty(e.Country) &&
                        e.Country != "Unknown" && !Excluded.Contains(e.Country))
            .GroupBy(e => e.Country)
            .Where(g => g.Count() >= MinReports)
            .Select(g =>
            {
                var reports = g.Count();
                var high = g.Count(e => e.Severity >= SeverityLevel.High);
                return new ConflictZone
                {
                    Id = $"hotspot-{g.Key}",
                    Name = g.Key,
                    Description = $"{reports} reports in the last 24h" + (high > 0 ? $", {high} high-severity" : string.Empty),
                    CenterLatitude = g.Average(e => e.Latitude!.Value),
                    CenterLongitude = g.Average(e => e.Longitude!.Value),
                    RadiusKm = Math.Min(600, 100 + 15 * reports),
                    Intensity = RateIntensity(reports, high),
                    ReportCount = reports,
                    HighSeverityCount = high,
                    Sources = g.GroupBy(e => e.Source).OrderByDescending(s => s.Count()).Select(s => s.Key).Take(5).ToList(),
                    LastUpdated = g.Max(e => e.Timestamp),
                };
            })
            .OrderByDescending(z => z.Intensity)
            .ThenByDescending(z => z.ReportCount)
            .ToList();
    }
}
