using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Models;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// Provides known active conflict zone data.
/// In production, this would integrate with ACLED, UCDP, or similar conflict databases.
/// Currently seeds well-known active conflict zones and can be extended with API integration.
/// </summary>
public class ConflictZoneDataService : IDataFeedService
{
    private readonly ILogger<ConflictZoneDataService> _logger;

    public string FeedName => "Conflict Zone Data";
    public string FeedDescription => "Active global conflict zones from ACLED/UCDP databases";
    public bool IsEnabled { get; set; } = true;
    public TimeSpan RefreshInterval => TimeSpan.FromMinutes(5);

    public ConflictZoneDataService(ILogger<ConflictZoneDataService> logger)
    {
        _logger = logger;
    }

    public Task<IEnumerable<GeoEvent>> FetchEventsAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IEnumerable<GeoEvent>>(Array.Empty<GeoEvent>());
    }

    public Task<IEnumerable<ConflictZone>> FetchConflictZonesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Fetching active conflict zones");

        var zones = new List<ConflictZone>
        {
            new()
            {
                Name = "Ukraine - Eastern Front",
                Description = "Active conflict between Ukraine and Russia along the eastern front lines",
                CenterLatitude = 48.5,
                CenterLongitude = 37.5,
                RadiusKm = 300,
                Intensity = SeverityLevel.Critical,
                InvolvedParties = new List<string> { "Ukraine", "Russia" },
                IsActive = true
            },
            new()
            {
                Name = "Gaza Strip",
                Description = "Ongoing conflict in the Gaza Strip region",
                CenterLatitude = 31.35,
                CenterLongitude = 34.31,
                RadiusKm = 40,
                Intensity = SeverityLevel.Critical,
                InvolvedParties = new List<string> { "Israel", "Hamas", "Palestine" },
                IsActive = true
            },
            new()
            {
                Name = "Yemen - Houthi Conflict",
                Description = "Civil war and international intervention in Yemen",
                CenterLatitude = 15.55,
                CenterLongitude = 48.52,
                RadiusKm = 200,
                Intensity = SeverityLevel.High,
                InvolvedParties = new List<string> { "Houthis", "Saudi Coalition", "Yemen Government" },
                IsActive = true
            },
            new()
            {
                Name = "Red Sea Shipping Crisis",
                Description = "Houthi attacks on commercial shipping in the Red Sea",
                CenterLatitude = 14.0,
                CenterLongitude = 42.0,
                RadiusKm = 250,
                Intensity = SeverityLevel.High,
                InvolvedParties = new List<string> { "Houthis", "US Navy", "International Shipping" },
                IsActive = true
            },
            new()
            {
                Name = "Syria - Multi-party Conflict",
                Description = "Ongoing multi-party conflict in Syria",
                CenterLatitude = 35.0,
                CenterLongitude = 38.0,
                RadiusKm = 200,
                Intensity = SeverityLevel.High,
                InvolvedParties = new List<string> { "Syria", "Turkey", "Kurdish Forces", "Various Militias" },
                IsActive = true
            },
            new()
            {
                Name = "Sudan Civil War",
                Description = "Armed conflict between the Sudanese Armed Forces and the RSF",
                CenterLatitude = 15.5,
                CenterLongitude = 32.5,
                RadiusKm = 400,
                Intensity = SeverityLevel.High,
                InvolvedParties = new List<string> { "Sudanese Armed Forces", "RSF" },
                IsActive = true
            },
            new()
            {
                Name = "Myanmar Civil War",
                Description = "Armed resistance against the military junta",
                CenterLatitude = 19.76,
                CenterLongitude = 96.08,
                RadiusKm = 300,
                Intensity = SeverityLevel.High,
                InvolvedParties = new List<string> { "Myanmar Military", "NUG", "Ethnic Armed Organizations" },
                IsActive = true
            },
            new()
            {
                Name = "Somalia - Al-Shabaab Insurgency",
                Description = "Ongoing insurgency by Al-Shabaab in Somalia",
                CenterLatitude = 2.05,
                CenterLongitude = 45.32,
                RadiusKm = 300,
                Intensity = SeverityLevel.Medium,
                InvolvedParties = new List<string> { "Somalia Government", "Al-Shabaab", "AMISOM" },
                IsActive = true
            },
            new()
            {
                Name = "Taiwan Strait Tensions",
                Description = "Military tensions in the Taiwan Strait region",
                CenterLatitude = 24.0,
                CenterLongitude = 120.0,
                RadiusKm = 200,
                Intensity = SeverityLevel.Medium,
                InvolvedParties = new List<string> { "China", "Taiwan", "United States" },
                IsActive = true
            },
            new()
            {
                Name = "Korean Peninsula DMZ",
                Description = "Heightened tensions along the Korean DMZ",
                CenterLatitude = 38.0,
                CenterLongitude = 127.0,
                RadiusKm = 100,
                Intensity = SeverityLevel.Medium,
                InvolvedParties = new List<string> { "North Korea", "South Korea", "United States" },
                IsActive = true
            },
            new()
            {
                Name = "Sahel Region - Jihadist Insurgency",
                Description = "Multi-country insurgency across the Sahel belt",
                CenterLatitude = 14.0,
                CenterLongitude = 1.0,
                RadiusKm = 500,
                Intensity = SeverityLevel.Medium,
                InvolvedParties = new List<string> { "Mali", "Burkina Faso", "Niger", "JNIM", "ISGS" },
                IsActive = true
            },
            new()
            {
                Name = "Eastern DRC Conflict",
                Description = "M23 and armed group activity in eastern Democratic Republic of Congo",
                CenterLatitude = -1.5,
                CenterLongitude = 29.0,
                RadiusKm = 200,
                Intensity = SeverityLevel.High,
                InvolvedParties = new List<string> { "DRC", "M23", "Rwanda", "UN Peacekeepers" },
                IsActive = true
            }
        };

        return Task.FromResult<IEnumerable<ConflictZone>>(zones);
    }

    public Task<IEnumerable<MilitaryAsset>> FetchMilitaryAssetsAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IEnumerable<MilitaryAsset>>(Array.Empty<MilitaryAsset>());
    }
}
