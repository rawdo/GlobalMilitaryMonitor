namespace GlobalMilitaryMonitor.DataIngestion.Models;

public class ConflictZone
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double CenterLatitude { get; set; }
    public double CenterLongitude { get; set; }
    public double RadiusKm { get; set; }
    public SeverityLevel Intensity { get; set; }
    public List<string> InvolvedParties { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public string IntensityColor => Intensity switch
    {
        SeverityLevel.Low => "#4CAF5060",
        SeverityLevel.Medium => "#FF980060",
        SeverityLevel.High => "#F4433660",
        SeverityLevel.Critical => "#D5000080",
        _ => "#9E9E9E60"
    };
}
