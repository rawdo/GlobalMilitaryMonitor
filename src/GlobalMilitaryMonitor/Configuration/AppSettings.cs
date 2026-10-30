namespace GlobalMilitaryMonitor.Configuration;

public class AppSettings
{
    public int MaxEventsToDisplay { get; set; } = 400;
    public int MaxAlertsToDisplay { get; set; } = 50;
    public double DefaultMapLatitude { get; set; } = 30.0;
    public double DefaultMapLongitude { get; set; } = 30.0;
    public int DefaultMapZoom { get; set; } = 3;
    public bool EnableSoundAlerts { get; set; } = false;
    public bool ShowMilitaryAssets { get; set; } = true;
    public bool ShowConflictZones { get; set; } = true;
    public bool ShowEvents { get; set; } = true;
}
