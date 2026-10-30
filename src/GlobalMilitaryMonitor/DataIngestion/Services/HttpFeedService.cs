using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.DataIngestion.Processing;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.DataIngestion.Services;

/// <summary>
/// Base for HTTP sources: conditional GETs (ETag / Last-Modified, so unchanged feeds answer 304) and
/// scheduling of the next fetch from the response's cache and rate-limit headers.
/// </summary>
public abstract class HttpFeedService : IDataFeedService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;
    private readonly ScheduleLimits _limits;
    private EntityTagHeaderValue? _etag;
    private DateTimeOffset? _lastModified;
    private int _failures;

    protected HttpFeedService(HttpClient httpClient, ILogger logger, string name, string group, string url,
        ScheduleLimits limits, TimeSpan hardMinGap)
    {
        _httpClient = httpClient;
        _logger = logger;
        FeedName = name;
        Group = group;
        Url = url;
        _limits = limits;
        HardMinGap = hardMinGap;
    }

    public string FeedName { get; }
    public string Group { get; }
    public string Url { get; }
    public bool IsEnabled { get; set; } = true;
    public TimeSpan HardMinGap { get; }

    /// <summary>Turns a response body into events and/or assets. Throw if the body is unusable.</summary>
    protected abstract (IReadOnlyList<GeoEvent> Events, IReadOnlyList<MilitaryAsset> Assets) Parse(string body);

    public async Task<FeedFetchResult> FetchAsync(CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, Url);
        if (_etag != null) request.Headers.IfNoneMatch.Add(_etag);
        if (_lastModified != null) request.Headers.IfModifiedSince = _lastModified;

        try
        {
            using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            if (response.StatusCode == HttpStatusCode.NotModified)
            {
                _failures = 0;
                return new FeedFetchResult
                {
                    Success = true,
                    Changed = false,
                    Next = RefreshScheduler.AfterSuccess(RefreshScheduler.Freshness(response), _limits),
                };
            }

            if (!response.IsSuccessStatusCode)
            {
                var message = response.StatusCode == HttpStatusCode.TooManyRequests
                    ? "Rate limited by source (HTTP 429)"
                    : $"HTTP {(int)response.StatusCode}";
                return Failure(message, response.StatusCode, RefreshScheduler.RetryAfter(response));
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var (events, assets) = Parse(body);

            _etag = response.Headers.ETag;
            _lastModified = response.Content.Headers.LastModified;
            _failures = 0;
            return new FeedFetchResult
            {
                Success = true,
                Changed = true,
                Events = events,
                Assets = assets,
                Next = RefreshScheduler.AfterSuccess(RefreshScheduler.Freshness(response), _limits),
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            return Failure(ex is TaskCanceledException ? "Timed out" : ex.Message, null, null);
        }
    }

    private FeedFetchResult Failure(string message, HttpStatusCode? status, TimeSpan? retryAfter)
    {
        _failures++;
        _logger.LogWarning("{Feed} failed ({Failures} in a row): {Message}", FeedName, _failures, message);
        return new FeedFetchResult
        {
            Success = false,
            Error = message,
            Next = RefreshScheduler.AfterFailure(status, retryAfter, _failures, _limits),
        };
    }

    /// <summary>Builds a classified event. Location comes from the text, else the source's fallback, else none.</summary>
    protected static GeoEvent BuildEvent(string title, string description, DateTime timestampUtc, string source,
        string sourceUrl, GeoLocation? fallbackLocation = null)
    {
        var text = $"{title} {description}";
        var severity = TextClassifier.AssessSeverity(text);
        var location = TextClassifier.GuessLocation(text) ?? fallbackLocation;
        return new GeoEvent
        {
            Id = string.IsNullOrEmpty(sourceUrl) ? TextClassifier.NormalizeTitle(title) : sourceUrl,
            Title = title,
            Description = description,
            Latitude = location?.Latitude,
            Longitude = location?.Longitude,
            Timestamp = timestampUtc,
            Category = TextClassifier.Categorize(text),
            Severity = severity,
            Source = source,
            SourceUrl = sourceUrl,
            Country = location?.Country ?? "Unknown",
            IsAlert = severity >= SeverityLevel.High,
        };
    }
}
