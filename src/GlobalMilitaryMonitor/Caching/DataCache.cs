using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.Caching;

public class DataCache
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<DataCache> _logger;

    public DataCache(IMemoryCache cache, ILogger<DataCache> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public T? Get<T>(string key) where T : class
    {
        return _cache.Get<T>(key);
    }

    public void Set<T>(string key, T value, TimeSpan? expiration = null)
    {
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(5),
            SlidingExpiration = TimeSpan.FromMinutes(2)
        };

        _cache.Set(key, value, options);
        _logger.LogDebug("Cached data with key: {Key}", key);
    }

    public T GetOrCreate<T>(string key, Func<T> factory, TimeSpan? expiration = null) where T : class
    {
        return _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(5);
            entry.SlidingExpiration = TimeSpan.FromMinutes(2);
            _logger.LogDebug("Cache miss for key: {Key}, creating new entry", key);
            return factory();
        })!;
    }

    public void Remove(string key)
    {
        _cache.Remove(key);
        _logger.LogDebug("Removed cached data with key: {Key}", key);
    }
}
