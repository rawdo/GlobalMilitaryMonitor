namespace GlobalMilitaryMonitor.DataIngestion.Models;

/// <summary>
/// An activity hotspot: a place where live reports cluster. Derived from the current events
/// (see HotspotAnalyzer), never hand-entered.
/// </summary>
public class ConflictZone
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double CenterLatitude { get; set; }
    public double CenterLongitude { get; set; }
    public double RadiusKm { get; set; }
    public SeverityLevel Intensity { get; set; }
    public int ReportCount { get; set; }
    public int HighSeverityCount { get; set; }
    /// <summary>Outlets reporting from this hotspot, most reports first.</summary>
    public List<string> Sources { get; set; } = new();
    public DateTime LastUpdated { get; set; }

    public string IntensityColor => Intensity switch
    {
        SeverityLevel.Low => "#4CAF5060",
        SeverityLevel.Medium => "#FF980060",
        SeverityLevel.High => "#F4433660",
        SeverityLevel.Critical => "#D5000080",
        _ => "#9E9E9E60"
    };
}
