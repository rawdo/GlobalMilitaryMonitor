using System.Net;
using System.Net.Http;

namespace GlobalMilitaryMonitor.DataIngestion.Processing;

/// <summary>Bounds on how often a source may be polled.</summary>
public sealed record ScheduleLimits(TimeSpan Min, TimeSpan Max, TimeSpan? Default = null);

public sealed record NextFetch(TimeSpan Delay, string Reason);

/// <summary>
/// Decides when each source should next be fetched from what the source itself reports: HTTP cache
/// headers say when its content can next change; 429 / Retry-After say when we may ask again.
/// Mirrors mobile/src/lib/schedule.ts.
/// </summary>
public static class RefreshScheduler
{
    private static TimeSpan Clamp(TimeSpan value, ScheduleLimits limits) =>
        value < limits.Min ? limits.Min : value > limits.Max ? limits.Max : value;

    /// <summary>How long the response stays fresh per Cache-Control/Age or Expires/Date, or null if unstated.</summary>
    public static TimeSpan? Freshness(HttpResponseMessage response)
    {
        var cacheControl = response.Headers.CacheControl;
        if (cacheControl != null && (cacheControl.NoCache || cacheControl.NoStore)) return TimeSpan.Zero;
        if (cacheControl?.MaxAge is { } maxAge)
        {
            var age = response.Headers.Age ?? TimeSpan.Zero;
            return maxAge > age ? maxAge - age : TimeSpan.Zero;
        }
        if (response.Content.Headers.Expires is { } expires)
        {
            var date = response.Headers.Date ?? DateTimeOffset.UtcNow;
            return expires > date ? expires - date : TimeSpan.Zero;
        }
        return null;
    }

    public static string Format(TimeSpan t) => t.TotalSeconds < 60
        ? $"{Math.Round(t.TotalSeconds)}s"
        : t.TotalMinutes % 1 == 0 ? $"{t.TotalMinutes} min" : $"{t.TotalMinutes:0.#} min";

    /// <summary>After a successful (200 or 304) response.</summary>
    public static NextFetch AfterSuccess(TimeSpan? freshness, ScheduleLimits limits)
    {
        if (freshness is null)
        {
            var delay = limits.Default ?? limits.Min;
            return new NextFetch(delay, $"{Format(delay)} (no cache info from source)");
        }
        var clamped = Clamp(freshness.Value, limits);
        var why = clamped == freshness ? "source cache" : clamped == limits.Min ? "minimum interval" : "maximum interval";
        return new NextFetch(clamped, $"{Format(clamped)} ({why})");
    }

    /// <summary>
    /// After a failure. Honours Retry-After when given; otherwise backs off exponentially from the
    /// minimum interval so a broken source doesn't get hammered.
    /// </summary>
    public static NextFetch AfterFailure(HttpStatusCode? status, TimeSpan? retryAfter, int failures, ScheduleLimits limits)
    {
        if (retryAfter is { } wait)
        {
            var delay = Clamp(wait, limits);
            return new NextFetch(delay, $"{Format(delay)} (source asked us to wait)");
        }
        var backoff = Clamp(TimeSpan.FromTicks(limits.Min.Ticks * (1L << Math.Clamp(failures - 1, 0, 20))), limits);
        var what = status == HttpStatusCode.TooManyRequests ? "rate limited" : "error";
        return new NextFetch(backoff, $"{Format(backoff)} ({what}, backing off)");
    }

    public static TimeSpan? RetryAfter(HttpResponseMessage response)
    {
        var retry = response.Headers.RetryAfter;
        if (retry?.Delta is { } delta) return delta;
        if (retry?.Date is { } date) return date > DateTimeOffset.UtcNow ? date - DateTimeOffset.UtcNow : TimeSpan.Zero;
        return null;
    }
}
