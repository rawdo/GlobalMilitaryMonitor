using System.Net.Http;
using System.Windows;
using System.Windows.Threading;
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

        // Global exception handlers
        DispatcherUnhandledException += OnDispatcherUnhandledException;
        AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
        TaskScheduler.UnobservedTaskException += OnUnobservedTaskException;

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

    private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        System.Diagnostics.Debug.WriteLine($"UI Exception: {e.Exception}");
        e.Handled = true;
    }

    private void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        System.Diagnostics.Debug.WriteLine($"Unhandled Exception: {e.ExceptionObject}");
    }

    private void OnUnobservedTaskException(object? sender, UnobservedTaskExceptionEventArgs e)
    {
        System.Diagnostics.Debug.WriteLine($"Task Exception: {e.Exception}");
        e.SetObserved();
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        // Logging
        services.AddLogging(builder =>
        {
            builder.SetMinimumLevel(LogLevel.Debug);
            builder.AddDebug();
        });

        // Configuration
        services.AddSingleton<AppSettings>();

        // HTTP Client with timeout
        services.AddSingleton<HttpClient>(_ =>
        {
            var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.Add("User-Agent", "GlobalMilitaryMonitor/1.0");
            return client;
        });

        // Caching
        services.AddMemoryCache();
        services.AddSingleton<DataCache>();

        // Data Feed Services - register each as both concrete and IDataFeedService
        services.AddSingleton<GdeltNewsFeedService>();
        services.AddSingleton<IDataFeedService>(sp => sp.GetRequiredService<GdeltNewsFeedService>());

        services.AddSingleton<RssDefenseNewsFeedService>();
        services.AddSingleton<IDataFeedService>(sp => sp.GetRequiredService<RssDefenseNewsFeedService>());

        services.AddSingleton<ConflictZoneDataService>();
        services.AddSingleton<IDataFeedService>(sp => sp.GetRequiredService<ConflictZoneDataService>());

        services.AddSingleton<MilitaryAssetTrackingService>();
        services.AddSingleton<IDataFeedService>(sp => sp.GetRequiredService<MilitaryAssetTrackingService>());

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
