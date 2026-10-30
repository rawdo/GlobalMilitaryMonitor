namespace GlobalMilitaryMonitor.DataIngestion.Models;

/// <summary>Live health and polling schedule of one data source.</summary>
public class SourceStatus
{
    public string Name { get; init; } = string.Empty;
    public string Group { get; init; } = string.Empty;
    public string Url { get; init; } = string.Empty;
    /// <summary>Null until the first fetch completes.</summary>
    public bool? Ok { get; set; }
    public string? Error { get; set; }
    public int ItemCount { get; set; }
    public DateTime? LastChecked { get; set; }
    public DateTime? LastChanged { get; set; }
    public DateTime? NextCheck { get; set; }
    /// <summary>Why the source is polled at its current interval, e.g. "5 min (source cache)".</summary>
    public string Schedule { get; set; } = "starting…";
}
