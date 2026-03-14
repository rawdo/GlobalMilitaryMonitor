namespace GlobalMilitaryMonitor.DataIngestion.Models;

public enum AssetType
{
    Aircraft,
    Warship,
    Submarine,
    GroundForce,
    MissileLauncher,
    Drone,
    Satellite,
    Other
}

public class MilitaryAsset
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public AssetType Type { get; set; }
    public string Country { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Heading { get; set; }
    public double? SpeedKnots { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    public string Source { get; set; } = string.Empty;
    public Dictionary<string, string> Metadata { get; set; } = new();

    public string AssetIcon => Type switch
    {
        AssetType.Aircraft => "\u2708",
        AssetType.Warship => "\u26F5",
        AssetType.Submarine => "\uD83D\uDEA4",
        AssetType.GroundForce => "\uD83D\uDE9B",
        AssetType.MissileLauncher => "\uD83D\uDE80",
        AssetType.Drone => "\uD83D\uDEE9",
        AssetType.Satellite => "\uD83D\uDEF0",
        _ => "\u2B24"
    };
}
