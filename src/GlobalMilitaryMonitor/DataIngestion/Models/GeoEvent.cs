namespace GlobalMilitaryMonitor.DataIngestion.Models;

public enum EventCategory
{
    Conflict,
    MissileLaunch,
    MilitaryMovement,
    NavalActivity,
    AirActivity,
    Diplomacy,
    Sanctions,
    Terrorism,
    CyberAttack,
    NuclearActivity,
    Other
}

public enum SeverityLevel
{
    Low,
    Medium,
    High,
    Critical
}

public class GeoEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>Null when no location could be derived; such events are listed but not mapped.</summary>
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool HasLocation => Latitude.HasValue && Longitude.HasValue;
    /// <summary>Publication time reported by the source (UTC).</summary>
    public DateTime Timestamp { get; set; }
    public EventCategory Category { get; set; }
    public SeverityLevel Severity { get; set; }
    public string Source { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public bool IsAlert { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();

    public string CategoryIcon => Category switch
    {
        EventCategory.Conflict => "\u2694",
        EventCategory.MissileLaunch => "\uD83D\uDE80",
        EventCategory.MilitaryMovement => "\uD83D\uDEB6",
        EventCategory.NavalActivity => "\u2693",
        EventCategory.AirActivity => "\u2708",
        EventCategory.Diplomacy => "\uD83E\uDD1D",
        EventCategory.Sanctions => "\uD83D\uDEAB",
        EventCategory.Terrorism => "\u26A0",
        EventCategory.CyberAttack => "\uD83D\uDCBB",
        EventCategory.NuclearActivity => "\u2622",
        _ => "\u2139"
    };

    public string SeverityColor => Severity switch
    {
        SeverityLevel.Low => "#4CAF50",
        SeverityLevel.Medium => "#FF9800",
        SeverityLevel.High => "#F44336",
        SeverityLevel.Critical => "#D50000",
        _ => "#9E9E9E"
    };
}
