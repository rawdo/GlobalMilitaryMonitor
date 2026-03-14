using System.Windows;
using GlobalMilitaryMonitor.Caching;
using GlobalMilitaryMonitor.Configuration;
using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Services;
using GlobalMilitaryMonitor.EventProcessing;
using GlobalMilitaryMonitor.MapRendering;
using GlobalMilitaryMonitor.UI.ViewModels;
using GlobalMilitaryMonitor.UI.Views;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor;

public partial class App : Application
{
    private ServiceProvider? _serviceProvider;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var services = new ServiceCollection();
        ConfigureServices(services);
        _serviceProvider = services.BuildServiceProvider();

        // Register data feeds with the aggregator
        var aggregator = _serviceProvider.GetRequiredService<IDataAggregator>();
        var feeds = _serviceProvider.GetServices<IDataFeedService>();
        foreach (var feed in feeds)
        {
            aggregator.RegisterFeed(feed);
        }

        var mainWindow = _serviceProvider.GetRequiredService<MainWindow>();
        MainWindow = mainWindow;
        mainWindow.Show();
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        // Logging
        services.AddLogging(builder =>
        {
            builder.SetMinimumLevel(LogLevel.Information);
            builder.AddDebug();
        });

        // Configuration
        services.AddSingleton<AppSettings>();

        // HTTP Client
        services.AddHttpClient();

        // Caching
        services.AddMemoryCache();
        services.AddSingleton<DataCache>();

        // Data Feed Services
        services.AddHttpClient<GdeltNewsFeedService>();
        services.AddHttpClient<RssDefenseNewsFeedService>();
        services.AddHttpClient<MilitaryAssetTrackingService>();

        services.AddSingleton<IDataFeedService, GdeltNewsFeedService>(sp =>
            sp.GetRequiredService<GdeltNewsFeedService>());
        services.AddSingleton<IDataFeedService, RssDefenseNewsFeedService>(sp =>
            sp.GetRequiredService<RssDefenseNewsFeedService>());
        services.AddSingleton<IDataFeedService, ConflictZoneDataService>();
        services.AddSingleton<IDataFeedService, MilitaryAssetTrackingService>(sp =>
            sp.GetRequiredService<MilitaryAssetTrackingService>());

        // Data Aggregator
        services.AddSingleton<IDataAggregator, DataAggregator>();

        // Event Processing
        services.AddSingleton<EventProcessor>();

        // Map Rendering
        services.AddSingleton<MapController>();

        // ViewModels
        services.AddSingleton<MainViewModel>();

        // Views
        services.AddSingleton<MainWindow>();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        if (_serviceProvider is IDisposable disposable)
        {
            disposable.Dispose();
        }
        base.OnExit(e);
    }
}
