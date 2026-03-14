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
    }

    public async Task InitializeAsync()
    {
        IsLoading = true;
        StatusText = "Connecting to data feeds...";

        try
        {
            await _aggregator.StartAsync();
            StatusText = "Connected - receiving live data";
        }
        catch (Exception ex)
        {
            StatusText = $"Error: {ex.Message}";
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

    private void OnEventsUpdated(object? sender, IEnumerable<GeoEvent> events)
    {
        _dispatcher.BeginInvoke(() =>
        {
            Events.Clear();
            foreach (var evt in events.OrderByDescending(e => e.Timestamp).Take(_settings.MaxEventsToDisplay))
            {
                Events.Add(evt);
            }

            TotalEvents = Events.Count;
            LastUpdate = DateTime.UtcNow;
            ApplyFilters();
            UpdateTimeline();
        });
    }

    private void OnConflictZonesUpdated(object? sender, IEnumerable<ConflictZone> zones)
    {
        _dispatcher.BeginInvoke(() =>
        {
            ConflictZones.Clear();
            foreach (var zone in zones)
            {
                ConflictZones.Add(zone);
            }
            ConflictZoneCount = ConflictZones.Count;
        });
    }

    private void OnMilitaryAssetsUpdated(object? sender, IEnumerable<MilitaryAsset> assets)
    {
        _dispatcher.BeginInvoke(() =>
        {
            MilitaryAssets.Clear();
            foreach (var asset in assets)
            {
                MilitaryAssets.Add(asset);
            }
            TrackedAssets = MilitaryAssets.Count;
        });
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

        FilteredEvents.Clear();
        foreach (var evt in filtered.Take(_settings.MaxEventsToDisplay))
        {
            FilteredEvents.Add(evt);
        }
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
