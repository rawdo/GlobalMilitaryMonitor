using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using GlobalMilitaryMonitor.DataIngestion.Models;

namespace GlobalMilitaryMonitor.DataIngestion.Processing;

/// <summary>An approximate place: a country or region centroid, or a city.</summary>
public sealed record GeoLocation(double Latitude, double Longitude, string Country);

/// <summary>
/// Keyword-based categorisation, severity assessment and geolocation of news items.
/// Mirrors mobile/src/lib/classify.ts so both apps classify identically.
/// </summary>
public static class TextClassifier
{
    private static readonly (EventCategory Category, string[] Keywords)[] CategoryRules =
    {
        (EventCategory.MissileLaunch, new[] { "missile", "rocket", "launch" }),
        (EventCategory.NavalActivity, new[] { "navy", "naval", "ship", "fleet" }),
        (EventCategory.AirActivity, new[] { "aircraft", "jet", "air force", "drone" }),
        (EventCategory.MilitaryMovement, new[] { "troops", "troop", "military", "army", "deploy" }),
        (EventCategory.NuclearActivity, new[] { "nuclear", "uranium", "atomic" }),
        (EventCategory.CyberAttack, new[] { "cyber", "hack" }),
        (EventCategory.Sanctions, new[] { "sanction", "embargo" }),
        (EventCategory.Diplomacy, new[] { "diplomat", "treaty", "summit", "negotiat" }),
        (EventCategory.Terrorism, new[] { "terror", "bombing", "suicide bomb", "improvised explosive" }),
        (EventCategory.Conflict, new[] { "conflict", "war", "fight", "battle", "strike", "attack", "shelling" }),
    };

    public static EventCategory Categorize(string text)
    {
        var lower = text.ToLowerInvariant();
        foreach (var (category, keywords) in CategoryRules)
        {
            if (keywords.Any(lower.Contains)) return category;
        }
        return EventCategory.Other;
    }

    // "nuclear" alone is too broad (power plants, energy policy), so Critical needs a weapons context.
    private static readonly Regex CriticalRegex = new(
        @"\b(icbm|wmd|warheads?|nuclear (test|strike|attack|weapons?|threat|missile|war|launch))",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static SeverityLevel AssessSeverity(string text)
    {
        var lower = text.ToLowerInvariant();
        if (CriticalRegex.IsMatch(lower)) return SeverityLevel.Critical;
        if (new[] { "missile launch", "invasion", "war declared", "casualties" }.Any(lower.Contains))
            return SeverityLevel.High;
        if (new[] { "military", "conflict", "strike", "attack" }.Any(lower.Contains))
            return SeverityLevel.Medium;
        return SeverityLevel.Low;
    }

    private static readonly string[] MilitaryKeywords =
    {
        "military", "war", "conflict", "missile", "troops", "army", "navy", "air force",
        "nuclear", "weapon", "strike", "attack", "defense", "defence", "drone", "bomb", "bombing",
        "combat", "battlefield", "invasion", "sanction", "nato", "pentagon", "soldier",
        "tank", "fighter jet", "warship", "submarine", "cyber attack", "terrorist",
        "airstrike", "ceasefire", "casualties", "ammunition", "artillery", "garrison",
    };

    // Whole-word match (allowing plurals) so e.g. "war" does not match "award" or "warning".
    private static readonly Regex MilitaryRegex = new(
        $@"\b(?:{string.Join("|", MilitaryKeywords.Select(Regex.Escape))})(?:s|es)?\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool IsMilitaryRelated(string text) => MilitaryRegex.IsMatch(text);

    // Ordered: cities and specific regions first, so "Russian strike on Kharkiv" maps to Ukraine and
    // "North Korea" wins over "Korea". Names match whole words plus common demonym endings
    // ("Russian", "Israeli", "Malian" but not "Malibu"); a trailing * marks a stem matched as a prefix.
    private static readonly (string Name, double Lat, double Lon, string Country)[] Locations =
    {
        ("North Korea", 40.34, 127.51, "North Korea"),
        ("Pyongyang", 39.04, 125.76, "North Korea"),
        ("South Korea", 35.91, 127.77, "South Korea"),
        ("Seoul", 37.57, 126.98, "South Korea"),
        ("South China Sea", 12.0, 114.0, "South China Sea"),
        ("Red Sea", 20.0, 38.0, "Red Sea"),
        ("Black Sea", 43.4, 34.0, "Black Sea"),
        ("Gaza", 31.35, 34.31, "Palestine"),
        ("West Bank", 31.9, 35.2, "Palestine"),
        ("Kyiv", 50.45, 30.52, "Ukraine"),
        ("Kharkiv", 49.99, 36.23, "Ukraine"),
        ("Kherson", 46.64, 32.62, "Ukraine"),
        ("Odesa", 46.48, 30.72, "Ukraine"),
        ("Donetsk", 48.02, 37.8, "Ukraine"),
        ("Zaporizhzhia", 47.84, 35.14, "Ukraine"),
        ("Crimea", 45.3, 34.4, "Ukraine"),
        ("Ukrain*", 48.38, 31.17, "Ukraine"),
        ("Moscow", 55.76, 37.62, "Russia"),
        ("Kremlin", 55.75, 37.62, "Russia"),
        ("Russia", 61.52, 105.32, "Russia"),
        ("Taipei", 25.03, 121.57, "Taiwan"),
        ("Taiwan", 23.7, 120.96, "Taiwan"),
        ("Beijing", 39.9, 116.4, "China"),
        ("China", 35.86, 104.2, "China"),
        ("Chinese", 35.86, 104.2, "China"),
        ("Tehran", 35.69, 51.39, "Iran"),
        ("Iran", 32.43, 53.69, "Iran"),
        ("Beirut", 33.89, 35.5, "Lebanon"),
        ("Hezbollah", 33.85, 35.86, "Lebanon"),
        ("Lebanon", 33.85, 35.86, "Lebanon"),
        ("Hamas", 31.35, 34.31, "Palestine"),
        ("Palestin*", 31.9, 35.2, "Palestine"),
        ("Israel", 31.05, 34.85, "Israel"),
        ("Damascus", 33.51, 36.29, "Syria"),
        ("Syria", 34.8, 38.99, "Syria"),
        ("Houthi", 15.55, 48.52, "Yemen"),
        ("Yemen", 15.55, 48.52, "Yemen"),
        ("Baghdad", 33.31, 44.36, "Iraq"),
        ("Iraq", 33.22, 43.68, "Iraq"),
        ("Japan", 36.2, 138.25, "Japan"),
        ("Kabul", 34.56, 69.21, "Afghanistan"),
        ("Afghan*", 33.94, 67.71, "Afghanistan"),
        ("Libya", 26.34, 17.23, "Libya"),
        ("Somali*", 5.15, 46.2, "Somalia"),
        ("Khartoum", 15.5, 32.56, "Sudan"),
        ("Darfur", 13.5, 24.0, "Sudan"),
        ("South Sudan", 6.88, 31.31, "South Sudan"),
        ("Sudan", 12.86, 30.22, "Sudan"),
        ("Ethiopia", 9.15, 40.49, "Ethiopia"),
        ("Congo", -1.5, 29.0, "DR Congo"),
        ("Rwanda", -1.94, 29.87, "Rwanda"),
        ("Sahel", 14.0, 1.0, "Sahel"),
        ("Mali", 17.57, -4.0, "Mali"),
        ("Myanmar", 21.91, 95.96, "Myanmar"),
        ("Pakistan", 30.38, 69.35, "Pakistan"),
        ("Kashmir", 34.08, 74.8, "Kashmir"),
        ("India", 20.59, 78.96, "India"),
        ("Venezuela", 6.42, -66.59, "Venezuela"),
        ("Baltic", 58.0, 20.0, "Baltic Region"),
        ("Arctic", 75.0, 30.0, "Arctic"),
        ("NATO", 50.85, 4.35, "NATO/Brussels"),
        ("Pentagon", 38.87, -77.06, "United States"),
    };

    private static readonly (Regex Pattern, GeoLocation Location)[] LocationPatterns = Locations
        .Select(l => (
            new Regex(
                l.Name.EndsWith('*')
                    ? $@"\b{Regex.Escape(l.Name[..^1])}"
                    : $@"\b{Regex.Escape(l.Name)}(?:s|n|ns|an|ans|ian|ians|i|is|ese|'s)?\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            new GeoLocation(l.Lat, l.Lon, l.Country)))
        .ToArray();

    /// <summary>First known place named in the text, or null. Never invents coordinates.</summary>
    public static GeoLocation? GuessLocation(string text) =>
        LocationPatterns.FirstOrDefault(p => p.Pattern.IsMatch(text)).Location;

    public static string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return string.Empty;
        var text = Regex.Replace(html, "<[^>]*>", string.Empty);
        // Decode twice: some feeds double-encode entities ("&amp;#8217;").
        return WebUtility.HtmlDecode(WebUtility.HtmlDecode(text)).Trim();
    }

    private static readonly Dictionary<string, int> ZoneOffsetsHours = new(StringComparer.OrdinalIgnoreCase)
    {
        ["GMT"] = 0, ["UT"] = 0, ["UTC"] = 0, ["Z"] = 0,
        ["EST"] = -5, ["EDT"] = -4, ["CST"] = -6, ["CDT"] = -5,
        ["MST"] = -7, ["MDT"] = -6, ["PST"] = -8, ["PDT"] = -7,
    };

    private static readonly Regex IsoDate = new(
        @"^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|([+-])(\d{2}):?(\d{2}))?$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex RfcDate = new(
        @"^(?:[a-z]{3},?\s+)?(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:([+-])(\d{2})(\d{2})|([a-z]+))?$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly string[] Months = { "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec" };

    /// <summary>
    /// Parses RSS (RFC 822) and Atom (ISO 8601) dates, including offsets without a colon ("-0400").
    /// Returns UTC, or null if the value is missing or unparseable.
    /// </summary>
    public static DateTime? ParseFeedDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();

        static int Offset(string sign, string hh, string mm) => (sign == "-" ? -1 : 1) * (int.Parse(hh) * 60 + int.Parse(mm));

        var iso = IsoDate.Match(v);
        if (iso.Success)
        {
            var g = iso.Groups;
            var local = new DateTime(int.Parse(g[1].Value), int.Parse(g[2].Value), int.Parse(g[3].Value),
                int.Parse(g[4].Value), int.Parse(g[5].Value), g[6].Success ? int.Parse(g[6].Value) : 0, DateTimeKind.Utc);
            var offset = g[8].Success ? Offset(g[8].Value, g[9].Value, g[10].Value) : 0;
            return local.AddMinutes(-offset);
        }

        var rfc = RfcDate.Match(v);
        if (rfc.Success)
        {
            var g = rfc.Groups;
            var month = Array.IndexOf(Months, g[2].Value.ToLowerInvariant());
            if (month >= 0)
            {
                var year = g[3].Value.Length == 2 ? 2000 + int.Parse(g[3].Value) : int.Parse(g[3].Value);
                var local = new DateTime(year, month + 1, int.Parse(g[1].Value),
                    int.Parse(g[4].Value), int.Parse(g[5].Value), g[6].Success ? int.Parse(g[6].Value) : 0, DateTimeKind.Utc);
                var offset = g[7].Success
                    ? Offset(g[7].Value, g[8].Value, g[9].Value)
                    : (ZoneOffsetsHours.TryGetValue(g[10].Success ? g[10].Value : "GMT", out var h) ? h : 0) * 60;
                return local.AddMinutes(-offset);
            }
        }

        return DateTime.TryParse(v, CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed
            : null;
    }

    /// <summary>Parses GDELT "seendate" values such as 20261030T081500Z.</summary>
    public static DateTime? ParseGdeltDate(string? value) =>
        DateTime.TryParseExact(value, "yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed
            : null;

    public static string NormalizeTitle(string title) =>
        Regex.Replace(title.ToLowerInvariant(), "[^a-z0-9]+", " ").Trim();
}
