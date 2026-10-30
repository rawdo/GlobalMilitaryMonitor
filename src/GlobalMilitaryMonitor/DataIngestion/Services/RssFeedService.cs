using System.IO;
using System.Net.Http;
using System.Xml;
using System.Xml.Linq;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;
using GlobalMilitaryMonitor.DataIngestion.Sources;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// One RSS 2.0 or Atom feed. Parsed leniently with XDocument rather than SyndicationFeed, which
/// rejects whole feeds over a single non-standard date.
/// </summary>
public class RssFeedService : HttpFeedService
{
    private const int MaxItems = 30;
    private readonly NewsSource _source;

    public RssFeedService(NewsSource source, HttpClient httpClient, ILogger<RssFeedService> logger)
        : base(httpClient, logger, source.Name, source.Group, source.Url, SourceCatalog.RssLimits, SourceCatalog.HardMinGap)
    {
        _source = source;
    }

    protected override (IReadOnlyList<GeoEvent> Events, IReadOnlyList<MilitaryAsset> Assets) Parse(string body) =>
        (ParseFeed(body, _source), Array.Empty<MilitaryAsset>());

    public static List<GeoEvent> ParseFeed(string xml, NewsSource source)
    {
        var settings = new XmlReaderSettings { DtdProcessing = DtdProcessing.Ignore, XmlResolver = null };
        using var reader = XmlReader.Create(new StringReader(xml), settings);
        var doc = XDocument.Load(reader);

        var events = new List<GeoEvent>();
        var items = doc.Descendants().Where(e => e.Name.LocalName is "item" or "entry").Take(MaxItems);
        foreach (var item in items)
        {
            var title = TextClassifier.StripHtml(Child(item, "title"));
            var description = TextClassifier.StripHtml(Child(item, "description", "summary"));
            if (title.Length == 0) continue;
            if (source.MilitaryOnly && !TextClassifier.IsMilitaryRelated($"{title} {description}")) continue;

            // Items without a usable date are skipped rather than stamped with the fetch time.
            var timestamp = TextClassifier.ParseFeedDate(Child(item, "pubDate", "published", "updated", "date"));
            if (timestamp is null) continue;

            events.Add(BuildEvent(
                title,
                description.Length > 280 ? description[..280] + "…" : description,
                timestamp.Value,
                source.Name,
                Link(item),
                source.FallbackLocation));
        }
        return events;
    }

    private static string Child(XElement item, params string[] localNames)
    {
        foreach (var name in localNames)
        {
            var element = item.Elements().FirstOrDefault(e => e.Name.LocalName == name);
            if (element != null && !string.IsNullOrWhiteSpace(element.Value)) return element.Value;
        }
        return string.Empty;
    }

    private static string Link(XElement item)
    {
        var links = item.Elements().Where(e => e.Name.LocalName == "link").ToList();
        // Atom: <link rel="alternate" href="..."/>; RSS: <link>...</link>.
        var atom = links.FirstOrDefault(l => (string?)l.Attribute("rel") is null or "alternate" && l.Attribute("href") != null);
        return (string?)atom?.Attribute("href") ?? links.FirstOrDefault()?.Value.Trim() ?? string.Empty;
    }
}
