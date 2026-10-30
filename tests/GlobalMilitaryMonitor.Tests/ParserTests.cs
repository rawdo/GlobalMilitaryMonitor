using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Services;
using GlobalMilitaryMonitor.DataIngestion.Sources;
using Xunit;

namespace GlobalMilitaryMonitor.Tests;

public class ParserTests
{
    private static NewsSource Source(bool militaryOnly) =>
        SourceCatalog.Rss.First(s => s.MilitaryOnly == militaryOnly && s.FallbackLocation is null);

    [Fact]
    public void Rss_ParsesItemsFiltersAndSkipsUndated()
    {
        const string xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE rss SYSTEM "http://example.invalid/rss.dtd">
            <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
              <item><title>Russian drone attack on Ukrainian train station</title><link>https://example.com/a</link>
                <description>&lt;p&gt;At least 14 killed&lt;/p&gt;</description><pubDate>Fri, 30 Oct 2026 04:29:22 -0400</pubDate></item>
              <item><title>Football results</title><link>https://example.com/b</link><pubDate>Fri, 30 Oct 2026 05:00:00 GMT</pubDate></item>
              <item><title>Troops deploy without a date</title><link>https://example.com/c</link></item>
              <item><title>Missile test reported</title><link>https://example.com/d</link><dc:date>2026-10-30T03:46:30-0400</dc:date></item>
            </channel></rss>
            """;

        var events = RssFeedService.ParseFeed(xml, Source(militaryOnly: true));

        Assert.Equal(new[] { "Russian drone attack on Ukrainian train station", "Missile test reported" }, events.Select(e => e.Title));
        var first = events[0];
        Assert.Equal("At least 14 killed", first.Description);
        Assert.Equal("Ukraine", first.Country);
        Assert.Equal(new DateTime(2026, 10, 30, 8, 29, 22, DateTimeKind.Utc), first.Timestamp);
        Assert.Equal("https://example.com/a", first.SourceUrl);
        Assert.Null(events[1].Latitude); // no place named: not mapped, not invented
    }

    [Fact]
    public void Atom_ParsesEntriesAndHrefLinks()
    {
        const string xml = """
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry><title>Navy commissions new frigate</title><link rel="alternate" href="https://example.com/frigate"/>
                <summary>Ceremony held</summary><published>2026-10-29T12:00:00Z</published></entry>
            </feed>
            """;

        var e = Assert.Single(RssFeedService.ParseFeed(xml, Source(militaryOnly: false)));
        Assert.Equal("https://example.com/frigate", e.SourceUrl);
        Assert.Equal(EventCategory.NavalActivity, e.Category);
    }

    [Fact]
    public void Rss_FallbackLocationForRegionalOutlets()
    {
        var kyiv = SourceCatalog.Rss.Single(s => s.Id == "kyiv-independent");
        const string xml = """<rss><channel><item><title>Air defense intercepts drones overnight</title><pubDate>Fri, 30 Oct 2026 09:02:58 GMT</pubDate></item></channel></rss>""";
        Assert.Equal("Ukraine", Assert.Single(RssFeedService.ParseFeed(xml, kyiv)).Country);
    }

    [Fact]
    public void Gdelt_ParsesArticlesAndSkipsUndated()
    {
        const string json = """
            {"articles":[
              {"url":"https://example.com/1","title":"Military drills near Taiwan","seendate":"20261030T081500Z","domain":"example.com"},
              {"url":"https://example.com/2","title":"No date here","domain":"example.com"}
            ]}
            """;
        var e = Assert.Single(GdeltFeedService.ParseArticles(json));
        Assert.Equal("Taiwan", e.Country);
        Assert.Equal(new DateTime(2026, 10, 30, 8, 15, 0, DateTimeKind.Utc), e.Timestamp);
    }

    [Fact]
    public void Gdelt_PlainTextRateLimitNoticeIsAnError() =>
        Assert.Throws<InvalidOperationException>(() => GdeltFeedService.ParseArticles("Please limit requests to one every 5 seconds"));

    [Fact]
    public void Aircraft_ParsesLivePositionsAndDropsStaleOrUnpositioned()
    {
        const string json = """
            {"now":1793350000000,"ac":[
              {"hex":"ae145a","flight":"RCH6156 ","r":"06-6156","t":"C17","desc":"Boeing C-17A Globemaster III","alt_baro":34000,"gs":400.0,"track":279.0,"lat":38.69,"lon":-89.3,"seen_pos":3.3},
              {"hex":"ae5f01","t":"Q4","alt_baro":"ground","lat":39.0,"lon":-77.0,"seen_pos":1.0},
              {"hex":"43c6f1","flight":"RRR123","t":"A400","lat":51.0,"lon":-1.0,"seen_pos":600},
              {"hex":"3e8e7c","flight":"GAF001","t":"A400"}
            ]}
            """;

        var assets = MilitaryAircraftFeedService.ParseAircraft(json, "adsb.lol");

        Assert.Equal(2, assets.Count);
        var c17 = assets[0];
        Assert.Equal("RCH6156 (Boeing C-17A Globemaster III)", c17.Name);
        Assert.Equal("United States", c17.Country);
        Assert.Equal(279.0, c17.Heading);
        Assert.Equal("34,000 ft · 400 kn", c17.Status);
        Assert.Equal(DateTimeOffset.FromUnixTimeMilliseconds(1793350000000).UtcDateTime.AddSeconds(-3.3), c17.LastSeen, TimeSpan.FromMilliseconds(1));
        Assert.Equal(AssetType.Drone, assets[1].Type);
        Assert.Equal("on ground", assets[1].Status);
    }

    [Fact]
    public void Catalog_Has35NewsSourcesWithUniqueIdsAndUrls()
    {
        Assert.Equal(34, SourceCatalog.Rss.Count); // + GDELT = 35 news sources
        Assert.Equal(SourceCatalog.Rss.Count, SourceCatalog.Rss.Select(s => s.Id).Distinct().Count());
        Assert.Equal(SourceCatalog.Rss.Count, SourceCatalog.Rss.Select(s => s.Url).Distinct().Count());
        Assert.All(SourceCatalog.Rss, s => Assert.StartsWith("https://", s.Url));
    }
}
