using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;
using GlobalMilitaryMonitor.Configuration;
using GlobalMilitaryMonitor.DataIngestion.Interfaces;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.EventProcessing;

namespace GlobalMilitaryMonitor.UI.ViewModels;

public class RelayCommand : ICommand
{
    private readonly Action<object?> _execute;
    private readonly Func<object?, bool>? _canExecute;

    public RelayCommand(Action<object?> execute, Func<object?, bool>? canExecute = null)
    {
        _execute = execute;
        _canExecute = canExecute;
    }

    public event EventHandler? CanExecuteChanged
    {
        add => CommandManager.RequerySuggested += value;
        remove => CommandManager.RequerySuggested -= value;
    }

    public bool CanExecute(object? parameter) => _canExecute?.Invoke(parameter) ?? true;
    public void Execute(object? parameter) => _execute(parameter);
}

public class MainViewModel : INotifyPropertyChanged
{
    private readonly IDataAggregator _aggregator;
    private readonly EventProcessor _eventProcessor;
    private readonly AppSettings _settings;
    private readonly Dispatcher _dispatcher;

    public ObservableCollection<GeoEvent> Events { get; } = new();
    public ObservableCollection<GeoEvent> FilteredEvents { get; } = new();
    public ObservableCollection<GeoEvent> Alerts { get; } = new();
    public ObservableCollection<ConflictZone> ConflictZones { get; } = new();
    public ObservableCollection<MilitaryAsset> MilitaryAssets { get; } = new();
    public ObservableCollection<GeoEvent> TimelineEvents { get; } = new();
    public ObservableCollection<SourceStatus> Sources { get; } = new();

    /// <summary>Raised (on the UI thread) after each bulk update, so the map redraws once per update.</summary>
    public event EventHandler? EventsChanged;
    public event EventHandler? HotspotsChanged;
    public event EventHandler? AssetsChanged;

    private string _sourceSummary = "Connecting to sources…";
    public string SourceSummary
    {
        get => _sourceSummary;
        set { _sourceSummary = value; OnPropertyChanged(); }
    }

    private string _sourceDetails = string.Empty;
    /// <summary>One line per source (status, item count, polling interval) for the status bar tooltip.</summary>
    public string SourceDetails
    {
        get => _sourceDetails;
        set { _sourceDetails = value; OnPropertyChanged(); }
    }

    private string _searchText = string.Empty;
    public string SearchText
    {
        get => _searchText;
        set
        {
            _searchText = value;
            OnPropertyChanged();
            ApplyFilters();
        }
    }

    private EventCategory? _selectedCategory;
    public EventCategory? SelectedCategory
    {
        get => _selectedCategory;
        set
        {
            _selectedCategory = value;
            OnPropertyChanged();
            ApplyFilters();
        }
    }

    private SeverityLevel? _selectedSeverity;
    public SeverityLevel? SelectedSeverity
    {
        get => _selectedSeverity;
        set
        {
            _selectedSeverity = value;
            OnPropertyChanged();
            ApplyFilters();
        }
    }

    private bool _alertsOnly;
    public bool AlertsOnly
    {
        get => _alertsOnly;
        set
        {
            _alertsOnly = value;
            OnPropertyChanged();
            ApplyFilters();
        }
    }

    private string _statusText = "Initializing...";
    public string StatusText
    {
        get => _statusText;
        set { _statusText = value; OnPropertyChanged(); }
    }

    private int _totalEvents;
    public int TotalEvents
    {
        get => _totalEvents;
        set { _totalEvents = value; OnPropertyChanged(); }
    }

    private int _activeAlerts;
    public int ActiveAlerts
    {
        get => _activeAlerts;
        set { _activeAlerts = value; OnPropertyChanged(); }
    }

    private int _conflictZoneCount;
    public int ConflictZoneCount
    {
        get => _conflictZoneCount;
        set { _conflictZoneCount = value; OnPropertyChanged(); }
    }

    private int _trackedAssets;
    public int TrackedAssets
    {
        get => _trackedAssets;
        set { _trackedAssets = value; OnPropertyChanged(); }
    }

    private DateTime _lastUpdate;
    public DateTime LastUpdate
    {
        get => _lastUpdate;
        set { _lastUpdate = value; OnPropertyChanged(); OnPropertyChanged(nameof(LastUpdateText)); }
    }

    public string LastUpdateText => LastUpdate == default
        ? "Never"
        : LastUpdate.ToLocalTime().ToString("HH:mm:ss");

    private bool _isLoading;
    public bool IsLoading
    {
        get => _isLoading;
        set { _isLoading = value; OnPropertyChanged(); }
    }

    private GeoEvent? _selectedEvent;
    public GeoEvent? SelectedEvent
    {
        get => _selectedEvent;
        set { _selectedEvent = value; OnPropertyChanged(); }
    }

    public ICommand RefreshCommand { get; }
    public ICommand ClearFiltersCommand { get; }
    public ICommand OpenSourceUrlCommand { get; }

    public MainViewModel(IDataAggregator aggregator, EventProcessor eventProcessor, AppSettings settings)
    {
        _aggregator = aggregator;
        _eventProcessor = eventProcessor;
        _settings = settings;
        _dispatcher = Application.Current.Dispatcher;

        RefreshCommand = new RelayCommand(async _ => await RefreshDataAsync());
        ClearFiltersCommand = new RelayCommand(_ => ClearFilters());
        OpenSourceUrlCommand = new RelayCommand(param =>
        {
            if (param is string url && !string.IsNullOrEmpty(url))
            {
                try
                {
                    var psi = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = url,
                        UseShellExecute = true
                    };
                    System.Diagnostics.Process.Start(psi);
                }
                catch { /* Ignore URL open failures */ }
            }
        });

        _aggregator.EventsUpdated += OnEventsUpdated;
        _aggregator.ConflictZonesUpdated += OnConflictZonesUpdated;
        _aggregator.MilitaryAssetsUpdated += OnMilitaryAssetsUpdated;
        _aggregator.AlertTriggered += OnAlertTriggered;
        _aggregator.SourcesUpdated += OnSourcesUpdated;
    }

    public async Task InitializeAsync()
    {
        IsLoading = true;
        StatusText = "Connecting to data feeds...";

        try
        {
            // Use a timeout so the UI isn't stuck forever if feeds are slow
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            await _aggregator.StartAsync(cts.Token);
            StatusText = $"Connected - {TotalEvents} events, {ConflictZoneCount} hotspots, {TrackedAssets} military aircraft";
        }
        catch (OperationCanceledException)
        {
            StatusText = $"Partial load - {TotalEvents} events so far (some sources are still responding)";
        }
        catch (Exception ex)
        {
            StatusText = $"Loaded with errors: {ex.Message}";
            System.Diagnostics.Debug.WriteLine($"InitializeAsync error: {ex}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task RefreshDataAsync()
    {
        IsLoading = true;
        StatusText = "Refreshing data...";

        try
        {
            await _aggregator.RefreshAllAsync();
            StatusText = "Data refreshed successfully";
        }
        catch (Exception ex)
        {
            StatusText = $"Refresh error: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void OnEventsUpdated(object? sender, IReadOnlyList<GeoEvent> events)
    {
        _dispatcher.BeginInvoke(() =>
        {
            Replace(Events, events.Take(_settings.MaxEventsToDisplay));
            TotalEvents = Events.Count;
            LastUpdate = DateTime.UtcNow;
            ApplyFilters();
            UpdateTimeline();
            EventsChanged?.Invoke(this, EventArgs.Empty);
        });
    }

    private void OnConflictZonesUpdated(object? sender, IReadOnlyList<ConflictZone> hotspots)
    {
        _dispatcher.BeginInvoke(() =>
        {
            Replace(ConflictZones, hotspots);
            ConflictZoneCount = ConflictZones.Count;
            HotspotsChanged?.Invoke(this, EventArgs.Empty);
        });
    }

    private void OnMilitaryAssetsUpdated(object? sender, IReadOnlyList<MilitaryAsset> assets)
    {
        _dispatcher.BeginInvoke(() =>
        {
            Replace(MilitaryAssets, assets);
            TrackedAssets = MilitaryAssets.Count;
            AssetsChanged?.Invoke(this, EventArgs.Empty);
        });
    }

    private void OnSourcesUpdated(object? sender, IReadOnlyList<SourceStatus> sources)
    {
        _dispatcher.BeginInvoke(() =>
        {
            Replace(Sources, sources);
            var live = sources.Count(s => s.Ok == true);
            var failing = sources.Count(s => s.Ok == false);
            SourceSummary = $"Sources: {live}/{sources.Count} live" + (failing > 0 ? $", {failing} failing" : string.Empty);
            SourceDetails = string.Join(Environment.NewLine, sources.Select(s =>
                $"{(s.Ok switch { true => "●", false => "✖", null => "…" })} {s.Name} [{s.Group}] — " +
                (s.Ok == false ? s.Error : $"{s.ItemCount} items") + $" — every {s.Schedule}"));
        });
    }

    private static void Replace<T>(ObservableCollection<T> collection, IEnumerable<T> items)
    {
        collection.Clear();
        foreach (var item in items) collection.Add(item);
    }

    private void OnAlertTriggered(object? sender, GeoEvent alert)
    {
        _dispatcher.BeginInvoke(() =>
        {
            Alerts.Insert(0, alert);
            if (Alerts.Count > _settings.MaxAlertsToDisplay)
            {
                Alerts.RemoveAt(Alerts.Count - 1);
            }
            ActiveAlerts = Alerts.Count;
        });
    }

    private void ApplyFilters()
    {
        var criteria = new EventFilterCriteria
        {
            SearchText = SearchText,
            AlertsOnly = AlertsOnly
        };

        if (SelectedCategory.HasValue)
            criteria.Categories.Add(SelectedCategory.Value);

        if (SelectedSeverity.HasValue)
            criteria.Severities.Add(SelectedSeverity.Value);

        var filtered = _eventProcessor.FilterEvents(Events, criteria);

        Replace(FilteredEvents, filtered.Take(_settings.MaxEventsToDisplay));
    }

    private void UpdateTimeline()
    {
        TimelineEvents.Clear();
        foreach (var evt in Events.OrderByDescending(e => e.Timestamp).Take(50))
        {
            TimelineEvents.Add(evt);
        }
    }

    private void ClearFilters()
    {
        SearchText = string.Empty;
        SelectedCategory = null;
        SelectedSeverity = null;
        AlertsOnly = false;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    protected void OnPropertyChanged([CallerMemberName] string? name = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }
}
