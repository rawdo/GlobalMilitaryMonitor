using System.Windows;
using System.Windows.Input;
using GlobalMilitaryMonitor.DataIngestion.Models;
using GlobalMilitaryMonitor.MapRendering;
using GlobalMilitaryMonitor.UI.ViewModels;

namespace GlobalMilitaryMonitor.UI.Views;

public partial class MainWindow : Window
{
    private readonly MainViewModel _viewModel;
    private readonly MapController _mapController;

    public MainWindow(MainViewModel viewModel, MapController mapController)
    {
        InitializeComponent();

        _viewModel = viewModel;
        _mapController = mapController;

        DataContext = _viewModel;

        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            // Initialize the map
            _mapController.Initialize(MainMap);

            // Wire up map events
            _mapController.EventMarkerClicked += OnEventMarkerClicked;
            _mapController.AssetMarkerClicked += OnAssetMarkerClicked;

            // Redraw each map layer once per bulk update from the view model
            _viewModel.EventsChanged += (_, _) => _mapController.UpdateEventMarkers(_viewModel.Events);
            _viewModel.HotspotsChanged += (_, _) => _mapController.UpdateConflictZones(_viewModel.ConflictZones);
            _viewModel.AssetsChanged += (_, _) => _mapController.UpdateMilitaryAssets(_viewModel.MilitaryAssets);

            // Start data loading
            await _viewModel.InitializeAsync();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"OnLoaded error: {ex}");
            _viewModel.StatusText = $"Startup error: {ex.Message}";
        }
    }

    private void OnEventMarkerClicked(object? sender, GeoEvent evt)
    {
        _viewModel.SelectedEvent = evt;

        if (!string.IsNullOrEmpty(evt.SourceUrl))
        {
            _viewModel.OpenSourceUrlCommand.Execute(evt.SourceUrl);
        }
    }

    private void OnAssetMarkerClicked(object? sender, MilitaryAsset asset)
    {
        MessageBox.Show(
            $"Name: {asset.Name}\n" +
            $"Type: {asset.Type}\n" +
            $"Country: {asset.Country}\n" +
            $"Position: {asset.Latitude:F2}, {asset.Longitude:F2}\n" +
            $"Status: {asset.Status}\n" +
            $"Last seen: {asset.LastSeen:yyyy-MM-dd HH:mm:ss} UTC\n" +
            $"Source: {asset.Source}",
            "Military Aircraft (live ADS-B)",
            MessageBoxButton.OK,
            MessageBoxImage.Information);
    }

    protected override void OnKeyDown(KeyEventArgs e)
    {
        base.OnKeyDown(e);

        if (e.Key == Key.F5)
        {
            _viewModel.RefreshCommand.Execute(null);
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            _viewModel.SelectedEvent = null;
            e.Handled = true;
        }
    }
}
