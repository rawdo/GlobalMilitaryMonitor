using System.Net.Http;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;
using GlobalMilitaryMonitor.DataIngestion.Sources;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// Military/conflict articles from the GDELT Project DOC 2.0 API, which monitors news media worldwide.
/// </summary>
public class GdeltFeedService : HttpFeedService
{
    public GdeltFeedService(HttpClient httpClient, ILogger<GdeltFeedService> logger)
        : base(httpClient, logger, "GDELT Project", "Aggregator", SourceCatalog.GdeltUrl,
            SourceCatalog.GdeltLimits, SourceCatalog.HardMinGap)
    {
    }

    protected override (IReadOnlyList<GeoEvent> Events, IReadOnlyList<MilitaryAsset> Assets) Parse(string body) =>
        (ParseArticles(body), Array.Empty<MilitaryAsset>());

    public static List<GeoEvent> ParseArticles(string body)
    {
        JObject json;
        try
        {
            json = JObject.Parse(body);
        }
        catch (JsonReaderException)
        {
            // GDELT sometimes answers with a plain-text message (e.g. its rate-limit notice).
            throw new InvalidOperationException(body.Length > 120 ? body[..120] : body);
        }

        var events = new List<GeoEvent>();
        foreach (var article in json["articles"] ?? new JArray())
        {
            var title = TextClassifier.StripHtml(article["title"]?.ToString() ?? string.Empty);
            var timestamp = TextClassifier.ParseGdeltDate(article["seendate"]?.ToString());
            if (title.Length == 0 || timestamp is null) continue;

            var domain = article["domain"]?.ToString() ?? "GDELT";
            events.Add(BuildEvent(title, $"Reported by {domain}", timestamp.Value, domain, article["url"]?.ToString() ?? string.Empty));
        }
        return events;
    }
}
