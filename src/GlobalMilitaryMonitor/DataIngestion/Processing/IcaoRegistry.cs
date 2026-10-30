using System.Globalization;

namespace GlobalMilitaryMonitor.DataIngestion.Processing;

/// <summary>
/// Maps a 24-bit ICAO aircraft address to its state of registry, using the address blocks ICAO
/// allocates to each state (Annex 10, Vol. III). Mirrors mobile/src/lib/icao.ts.
/// </summary>
public static class IcaoRegistry
{
    private static readonly (int Start, int End, string Country)[] Blocks =
    {
        (0x010000, 0x017FFF, "Egypt"),
        (0x06A000, 0x06A3FF, "Qatar"),
        (0x0D0000, 0x0D7FFF, "Mexico"),
        (0x140000, 0x15FFFF, "Russia"),
        (0x300000, 0x33FFFF, "Italy"),
        (0x340000, 0x37FFFF, "Spain"),
        (0x380000, 0x3BFFFF, "France"),
        (0x3C0000, 0x3FFFFF, "Germany"),
        (0x400000, 0x43FFFF, "United Kingdom"),
        (0x440000, 0x447FFF, "Austria"),
        (0x448000, 0x44FFFF, "Belgium"),
        (0x458000, 0x45FFFF, "Denmark"),
        (0x460000, 0x467FFF, "Finland"),
        (0x468000, 0x46FFFF, "Greece"),
        (0x470000, 0x477FFF, "Hungary"),
        (0x478000, 0x47FFFF, "Norway"),
        (0x480000, 0x487FFF, "Netherlands"),
        (0x488000, 0x48FFFF, "Poland"),
        (0x490000, 0x497FFF, "Portugal"),
        (0x498000, 0x49FFFF, "Czechia"),
        (0x4A0000, 0x4A7FFF, "Romania"),
        (0x4A8000, 0x4AFFFF, "Sweden"),
        (0x4B0000, 0x4B7FFF, "Switzerland"),
        (0x4B8000, 0x4BFFFF, "Turkey"),
        (0x4CA000, 0x4CAFFF, "Ireland"),
        (0x508000, 0x50FFFF, "Ukraine"),
        (0x706000, 0x706FFF, "Kuwait"),
        (0x710000, 0x717FFF, "Saudi Arabia"),
        (0x718000, 0x71FFFF, "South Korea"),
        (0x738000, 0x73FFFF, "Israel"),
        (0x740000, 0x747FFF, "Jordan"),
        (0x760000, 0x767FFF, "Pakistan"),
        (0x768000, 0x76FFFF, "Singapore"),
        (0x780000, 0x7BFFFF, "China"),
        (0x7C0000, 0x7FFFFF, "Australia"),
        (0x800000, 0x83FFFF, "India"),
        (0x840000, 0x87FFFF, "Japan"),
        (0x896000, 0x896FFF, "United Arab Emirates"),
        (0x899000, 0x8993FF, "Taiwan"),
        (0xA00000, 0xAFFFFF, "United States"),
        (0xC00000, 0xC3FFFF, "Canada"),
        (0xC80000, 0xC87FFF, "New Zealand"),
        (0xE00000, 0xE3FFFF, "Argentina"),
        (0xE40000, 0xE7FFFF, "Brazil"),
        (0xE80000, 0xE80FFF, "Chile"),
    };

    /// <summary>State of registry for a hex address such as "ae145a", or "Unknown".</summary>
    public static string CountryOf(string? hex)
    {
        // Addresses prefixed with "~" are non-ICAO (e.g. TIS-B) and carry no registry information.
        if (string.IsNullOrEmpty(hex) || hex.StartsWith('~') ||
            !int.TryParse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var address))
            return "Unknown";
        foreach (var (start, end, country) in Blocks)
        {
            if (address >= start && address <= end) return country;
        }
        return "Unknown";
    }
}
