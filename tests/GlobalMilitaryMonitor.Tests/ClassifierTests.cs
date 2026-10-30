using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;
using Xunit;

namespace GlobalMilitaryMonitor.Tests;

// Same cases as mobile/tests/classify.test.ts, so both apps classify identically.
public class ClassifierTests
{
    [Theory]
    [InlineData("North Korea fires ballistic missile", EventCategory.MissileLaunch)]
    [InlineData("Navy destroyer transits strait", EventCategory.NavalActivity)]
    [InlineData("Drone strike reported near border", EventCategory.AirActivity)]
    [InlineData("Army deploys additional troops", EventCategory.MilitaryMovement)]
    [InlineData("Talks on uranium enrichment stall", EventCategory.NuclearActivity)]
    [InlineData("New sanctions announced", EventCategory.Sanctions)]
    [InlineData("Peace summit opens in Geneva", EventCategory.Diplomacy)]
    [InlineData("Heavy fighting continues", EventCategory.Conflict)]
    [InlineData("Leader attacks rival parties", EventCategory.Conflict)]
    [InlineData("Terror cell arrested", EventCategory.Terrorism)]
    [InlineData("Weather update", EventCategory.Other)]
    public void Categorize(string text, EventCategory expected) =>
        Assert.Equal(expected, TextClassifier.Categorize(text));

    [Theory]
    [InlineData("ICBM test detected", SeverityLevel.Critical)]
    [InlineData("Threat of nuclear strike raised", SeverityLevel.Critical)]
    [InlineData("New nuclear power plant opens", SeverityLevel.Low)]
    [InlineData("Navy orders new nuclear attack submarine", SeverityLevel.Medium)] // not Critical
    [InlineData("Invasion fears grow", SeverityLevel.High)]
    [InlineData("Military exercise begins", SeverityLevel.Medium)]
    [InlineData("Ministers meet", SeverityLevel.Low)]
    public void AssessSeverity(string text, SeverityLevel expected) =>
        Assert.Equal(expected, TextClassifier.AssessSeverity(text));

    [Theory]
    [InlineData("War in the region escalates", true)]
    [InlineData("Airstrikes hit depot", true)]
    [InlineData("New sanctions imposed", true)]
    [InlineData("Software award announced", false)]
    [InlineData("Storm warning issued", false)]
    public void IsMilitaryRelated(string text, bool expected) =>
        Assert.Equal(expected, TextClassifier.IsMilitaryRelated(text));

    [Theory]
    [InlineData("Strikes in Gaza as Israel expands operation", "Palestine")]
    [InlineData("North Korea and South Korea talks", "North Korea")]
    [InlineData("Houthi drones target shipping", "Yemen")]
    [InlineData("Iranian officials respond", "Iran")]
    [InlineData("Russian drone attack on Ukrainian train station", "Ukraine")]
    [InlineData("Shelling reported in Kherson", "Ukraine")]
    [InlineData("Bamako, Mali residents flee", "Mali")]
    public void GuessLocation(string text, string country) =>
        Assert.Equal(country, TextClassifier.GuessLocation(text)?.Country);

    [Theory]
    [InlineData("Malibu fires spread")]
    [InlineData("Something happened somewhere")]
    public void GuessLocation_ReturnsNullRatherThanInventing(string text) =>
        Assert.Null(TextClassifier.GuessLocation(text));

    [Theory]
    [InlineData("Fri, 30 Oct 2026 04:29:22 -0400", "2026-10-30T08:29:22")]
    [InlineData("Fri, 30 Oct 2026 09:02:58 GMT", "2026-10-30T09:02:58")]
    [InlineData("30 Oct 2026 09:02 EDT", "2026-10-30T13:02:00")]
    [InlineData("2026-10-30T03:46:30-0400", "2026-10-30T07:46:30")] // Al-Monitor
    [InlineData("2026-10-30T10:15:00+02:00", "2026-10-30T08:15:00")]
    [InlineData("2026-10-30T08:00:00.123Z", "2026-10-30T08:00:00")]
    public void ParseFeedDate(string value, string expectedUtc)
    {
        var parsed = TextClassifier.ParseFeedDate(value);
        Assert.NotNull(parsed);
        Assert.Equal(DateTimeKind.Utc, parsed!.Value.Kind);
        Assert.Equal(expectedUtc, parsed.Value.ToString("yyyy-MM-ddTHH:mm:ss"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not a date")]
    public void ParseFeedDate_Unparseable(string? value) => Assert.Null(TextClassifier.ParseFeedDate(value));

    [Fact]
    public void StripHtml_DecodesEntities()
    {
        Assert.Equal("Tom & Jerry's", TextClassifier.StripHtml("<p>Tom &amp; Jerry&#39;s</p>"));
        Assert.Equal("Europe’s output", TextClassifier.StripHtml("Europe&#8217;s output"));
    }

    [Theory]
    [InlineData("ae145a", "United States")]
    [InlineData("43c6f1", "United Kingdom")]
    [InlineData("3e8e7c", "Germany")]
    [InlineData("508035", "Ukraine")]
    [InlineData("~2a01c3", "Unknown")]
    [InlineData("zzzz", "Unknown")]
    public void IcaoRegistry_CountryOf(string hex, string country) =>
        Assert.Equal(country, IcaoRegistry.CountryOf(hex));
}
