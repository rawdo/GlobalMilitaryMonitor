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

            // Wire up ViewModel collection changes to update map markers
            _viewModel.Events.CollectionChanged += (_, _) =>
            {
                _mapController.UpdateEventMarkers(_viewModel.Events);
            };

            _viewModel.ConflictZones.CollectionChanged += (_, _) =>
            {
                _mapController.UpdateConflictZones(_viewModel.ConflictZones);
            };

            _viewModel.MilitaryAssets.CollectionChanged += (_, _) =>
            {
                _mapController.UpdateMilitaryAssets(_viewModel.MilitaryAssets);
            };

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
            $"Source: {asset.Source}",
            "Military Asset Details",
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
