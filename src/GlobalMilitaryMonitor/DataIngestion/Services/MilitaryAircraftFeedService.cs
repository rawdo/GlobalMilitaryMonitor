using System.Globalization;
using System.Net.Http;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;
using GlobalMilitaryMonitor.DataIngestion.Sources;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// Live positions of aircraft flagged as military, from a keyless ADS-B aggregator
/// (readsb "v2" JSON format, used by adsb.lol and adsb.fi).
/// </summary>
public class MilitaryAircraftFeedService : HttpFeedService
{
    /// <summary>Positions older than this are dropped as no longer live.</summary>
    public static readonly TimeSpan MaxPositionAge = TimeSpan.FromMinutes(2);

    private static readonly string[] DroneTypes = { "Q1", "Q4", "Q9", "MQ1", "MQ4", "MQ9", "RQ4", "RQ7", "HRON", "TB2", "AKIN", "WLII" };

    private readonly AircraftSource _source;

    public MilitaryAircraftFeedService(AircraftSource source, HttpClient httpClient, ILogger<MilitaryAircraftFeedService> logger)
        : base(httpClient, logger, source.Name, "Military aircraft", source.Url, SourceCatalog.AircraftLimits, SourceCatalog.HardMinGap)
    {
        _source = source;
    }

    protected override (IReadOnlyList<GeoEvent> Events, IReadOnlyList<MilitaryAsset> Assets) Parse(string body) =>
        (Array.Empty<GeoEvent>(), ParseAircraft(body, _source.Name));

    public static List<MilitaryAsset> ParseAircraft(string body, string sourceName)
    {
        var json = JObject.Parse(body);
        var snapshot = json["now"]?.Value<double>() is { } nowMs
            ? DateTimeOffset.FromUnixTimeMilliseconds((long)nowMs).UtcDateTime
            : throw new InvalidOperationException("Response has no 'now' timestamp");

        var assets = new List<MilitaryAsset>();
        foreach (var ac in json["ac"] ?? new JArray())
        {
            var lat = ac["lat"]?.Value<double?>();
            var lon = ac["lon"]?.Value<double?>();
            var hex = ac["hex"]?.ToString();
            if (lat is null || lon is null || string.IsNullOrEmpty(hex)) continue;

            var seenAgo = TimeSpan.FromSeconds(ac["seen_pos"]?.Value<double?>() ?? 0);
            if (seenAgo > MaxPositionAge) continue;

            var callsign = ac["flight"]?.ToString().Trim();
            var registration = ac["r"]?.ToString();
            var type = ac["t"]?.ToString() ?? string.Empty;
            var description = ac["desc"]?.ToString();
            var altitude = ac["alt_baro"] is JValue { Type: JTokenType.String } ? "on ground"
                : ac["alt_baro"]?.Value<double?>() is { } feet ? $"{feet.ToString("N0", CultureInfo.InvariantCulture)} ft"
                : "altitude n/a";
            var speed = ac["gs"]?.Value<double?>();

            var label = !string.IsNullOrEmpty(callsign) ? callsign : !string.IsNullOrEmpty(registration) ? registration : hex.ToUpperInvariant();
            var model = description ?? (type.Length > 0 ? type : null);
            assets.Add(new MilitaryAsset
            {
                Id = hex,
                Name = model is null ? label : $"{label} ({model})",
                Type = DroneTypes.Contains(type.ToUpperInvariant()) ? AssetType.Drone : AssetType.Aircraft,
                Country = IcaoRegistry.CountryOf(hex),
                Latitude = lat.Value,
                Longitude = lon.Value,
                Heading = ac["track"]?.Value<double?>(),
                SpeedKnots = speed,
                Status = speed is null ? altitude : $"{altitude} · {speed:0} kn",
                LastSeen = snapshot - seenAgo,
                Source = sourceName,
                Metadata = new Dictionary<string, string>
                {
                    ["Hex"] = hex,
                    ["Callsign"] = callsign ?? string.Empty,
                    ["Registration"] = registration ?? string.Empty,
                    ["Type"] = type,
                },
            });
        }
        return assets;
    }
}
