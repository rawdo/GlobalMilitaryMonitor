using GlobalMilitaryMonitor.DataIngestion.Processing;

namespace GlobalMilitaryMonitor.DataIngestion.Sources;

public sealed record NewsSource(
    string Id,
    string Name,
    string Group,
    string Url,
    string Homepage,
    /// <summary>Drop items that don't mention military topics. Off for specialist defense outlets.</summary>
    bool MilitaryOnly,
    /// <summary>Used when an item names no recognisable place (e.g. a Kyiv outlet's local headlines).</summary>
    GeoLocation? FallbackLocation = null);

public sealed record AircraftSource(string Id, string Name, string Url, string Homepage);

/// <summary>
/// Every live data source. Keep in sync with mobile/src/lib/sources.ts.
/// </summary>
public static class SourceCatalog
{
    private static readonly GeoLocation Ukraine = new(48.38, 31.17, "Ukraine");
    private static readonly GeoLocation NorthKorea = new(40.34, 127.51, "North Korea");

    // RSS feeds are polled as soon as their Cache-Control lifetime expires (floored at 30s, capped at
    // 15 min); feeds with no freshness headers every 2 minutes, using conditional requests.
    public static readonly ScheduleLimits RssLimits = new(TimeSpan.FromSeconds(30), TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(2));

    // GDELT sends no cache headers and publishes in 15-minute batches; polling every minute picks up a
    // new batch within a minute of release. Its documented rate limit is one request per 5 seconds.
    public static readonly ScheduleLimits GdeltLimits = new(TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(15));

    // Aircraft positions change continuously and the APIs send no-store, so poll at the floor.
    public static readonly ScheduleLimits AircraftLimits = new(TimeSpan.FromSeconds(30), TimeSpan.FromMinutes(5));

    public static readonly TimeSpan HardMinGap = TimeSpan.FromSeconds(5);

    public const string GdeltUrl =
        "https://api.gdeltproject.org/api/v2/doc/doc?query=(military%20OR%20conflict%20OR%20missile%20OR%20war%20OR%20troops)%20sourcelang:english&mode=ArtList&format=json&maxrecords=75&timespan=6h&sort=DateDesc";

    private static NewsSource Defense(string id, string name, string url, string homepage) =>
        new(id, name, "Defense", url, homepage, MilitaryOnly: false);

    private static NewsSource Region(string id, string name, string url, string homepage, GeoLocation? fallback = null) =>
        new(id, name, "Conflict regions", url, homepage, MilitaryOnly: true, fallback);

    private static NewsSource World(string id, string name, string url, string homepage) =>
        new(id, name, "World news", url, homepage, MilitaryOnly: true);

    public static readonly IReadOnlyList<NewsSource> Rss = new[]
    {
        // Specialist defense and military outlets.
        Defense("defense-news", "Defense News", "https://www.defensenews.com/feed/", "https://www.defensenews.com/"),
        Defense("breaking-defense", "Breaking Defense", "https://breakingdefense.com/feed/", "https://breakingdefense.com/"),
        Defense("the-war-zone", "The War Zone", "https://www.twz.com/feed", "https://www.twz.com/"),
        Defense("defense-one", "Defense One", "https://www.defenseone.com/rss/all/", "https://www.defenseone.com/"),
        Defense("military-times", "Military Times", "https://www.militarytimes.com/feed/", "https://www.militarytimes.com/"),
        Defense("army-times", "Army Times", "https://www.armytimes.com/feed/", "https://www.armytimes.com/"),
        Defense("navy-times", "Navy Times", "https://www.navytimes.com/feed/", "https://www.navytimes.com/"),
        Defense("air-force-times", "Air Force Times", "https://www.airforcetimes.com/feed/", "https://www.airforcetimes.com/"),
        Defense("air-space-forces", "Air & Space Forces Magazine", "https://www.airandspaceforces.com/feed/", "https://www.airandspaceforces.com/"),
        Defense("usni-news", "USNI News", "https://news.usni.org/feed", "https://news.usni.org/"),
        Defense("naval-news", "Naval News", "https://www.navalnews.com/feed/", "https://www.navalnews.com/"),
        Defense("task-purpose", "Task & Purpose", "https://taskandpurpose.com/feed/", "https://taskandpurpose.com/"),
        Defense("military-com", "Military.com", "https://www.military.com/feed/daily-news/", "https://www.military.com/"),
        Defense("uk-defence-journal", "UK Defence Journal", "https://ukdefencejournal.org.uk/feed/", "https://ukdefencejournal.org.uk/"),
        Defense("defence-blog", "Defence Blog", "https://defence-blog.com/feed/", "https://defence-blog.com/"),
        Defense("long-war-journal", "FDD Long War Journal", "https://www.longwarjournal.org/feed", "https://www.longwarjournal.org/"),
        Defense("dvids", "DVIDS", "https://www.dvidshub.net/rss/news", "https://www.dvidshub.net/"),
        Defense("us-dow", "U.S. Department of War", "https://www.war.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10", "https://www.war.gov/News/"),

        // Outlets covering specific conflict regions.
        Region("kyiv-independent", "Kyiv Independent", "https://kyivindependent.com/news-archive/rss/", "https://kyivindependent.com/", Ukraine),
        Region("ukrainska-pravda", "Ukrainska Pravda", "https://www.pravda.com.ua/eng/rss/", "https://www.pravda.com.ua/eng/", Ukraine),
        Region("meduza", "Meduza", "https://meduza.io/rss/en/all", "https://meduza.io/en"),
        Region("middle-east-eye", "Middle East Eye", "https://www.middleeasteye.net/rss", "https://www.middleeasteye.net/"),
        Region("al-monitor", "Al-Monitor", "https://www.al-monitor.com/rss", "https://www.al-monitor.com/"),
        Region("yonhap", "Yonhap News", "https://en.yna.co.kr/RSS/news.xml", "https://en.yna.co.kr/"),
        Region("nk-news", "NK News", "https://www.nknews.org/feed/", "https://www.nknews.org/", NorthKorea),
        Region("scmp", "South China Morning Post", "https://www.scmp.com/rss/91/feed/", "https://www.scmp.com/"),
        Region("dawn", "Dawn", "https://www.dawn.com/feeds/home", "https://www.dawn.com/"),
        Region("africanews", "Africanews", "https://www.africanews.com/feed/rss", "https://www.africanews.com/"),

        // General world news, filtered to military topics.
        World("bbc-world", "BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml", "https://www.bbc.com/news/world"),
        World("nyt-world", "NYT World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "https://www.nytimes.com/section/world"),
        World("al-jazeera", "Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml", "https://www.aljazeera.com/"),
        World("guardian-world", "The Guardian World", "https://www.theguardian.com/world/rss", "https://www.theguardian.com/world"),
        World("un-news-peace", "UN News: Peace & Security", "https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml", "https://news.un.org/en/news/topic/peace-and-security"),

        // Dedicated cyber and national security outlet, so its items aren't keyword-filtered.
        new("the-record", "The Record", "Cyber", "https://therecord.media/feed", "https://therecord.media/", MilitaryOnly: false),
    };

    /// <summary>
    /// Free, keyless ADS-B aggregators publishing aircraft flagged as military. They use different
    /// receiver networks, so both are polled and the results merged by ICAO address.
    /// </summary>
    public static readonly IReadOnlyList<AircraftSource> Aircraft = new[]
    {
        new AircraftSource("adsb-lol", "adsb.lol (military aircraft)", "https://api.adsb.lol/v2/mil", "https://adsb.lol/"),
        new AircraftSource("adsb-fi", "adsb.fi (military aircraft)", "https://opendata.adsb.fi/api/v2/mil", "https://adsb.fi/"),
    };
}
