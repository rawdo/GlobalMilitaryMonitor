using System.Windows;
using System.Windows.Media;
using GMap.NET;
using GMap.NET.MapProviders;
using GMap.NET.WindowsPresentation;
using GlobalMilitaryMonitor.DataIngestion.Models;
using Microsoft.Extensions.Logging;

namespace GlobalMilitaryMonitor.MapRendering;

/// <summary>
/// Controls the GMap.NET WPF map instance, managing markers, overlays, and conflict zone rendering.
/// </summary>
public class MapController
{
    private GMapControl? _mapControl;
    private readonly ILogger<MapController> _logger;
    private readonly Dictionary<string, GMapMarker> _eventMarkers = new();
    private readonly Dictionary<string, GMapMarker> _assetMarkers = new();

    public event EventHandler<GeoEvent>? EventMarkerClicked;
    public event EventHandler<MilitaryAsset>? AssetMarkerClicked;

    public MapController(ILogger<MapController> logger)
    {
        _logger = logger;
    }

    public void Initialize(GMapControl mapControl)
    {
        _mapControl = mapControl;

        // Configure the map
        GMaps.Instance.Mode = AccessMode.ServerAndCache;
        _mapControl.MapProvider = GMapProviders.OpenStreetMap;
        _mapControl.Position = new PointLatLng(30.0, 30.0);
        _mapControl.MinZoom = 2;
        _mapControl.MaxZoom = 18;
        _mapControl.Zoom = 3;
        _mapControl.ShowCenter = false;
        _mapControl.DragButton = System.Windows.Input.MouseButton.Left;
        _mapControl.CanDragMap = true;
        _mapControl.MouseWheelZoomType = MouseWheelZoomType.MousePositionWithoutCenter;

        _logger.LogInformation("Map initialized with OpenStreetMap provider");
    }

    public void UpdateEventMarkers(IEnumerable<GeoEvent> events)
    {
        if (_mapControl == null) return;

        Application.Current.Dispatcher.BeginInvoke(() =>
        {
            // Remove old event markers
            foreach (var marker in _eventMarkers.Values)
            {
                _mapControl.Markers.Remove(marker);
            }
            _eventMarkers.Clear();

            foreach (var evt in events)
            {
                if (evt.Latitude == 0 && evt.Longitude == 0) continue;

                var marker = CreateEventMarker(evt);
                _eventMarkers[evt.Id] = marker;
                _mapControl.Markers.Add(marker);
            }
        });
    }

    public void UpdateConflictZones(IEnumerable<ConflictZone> zones)
    {
        if (_mapControl == null) return;

        Application.Current.Dispatcher.BeginInvoke(() =>
        {
            // Conflict zones are rendered as circle markers with tooltips
            foreach (var zone in zones)
            {
                var marker = CreateConflictZoneMarker(zone);
                _mapControl.Markers.Add(marker);
            }
        });
    }

    public void UpdateMilitaryAssets(IEnumerable<MilitaryAsset> assets)
    {
        if (_mapControl == null) return;

        Application.Current.Dispatcher.BeginInvoke(() =>
        {
            foreach (var marker in _assetMarkers.Values)
            {
                _mapControl.Markers.Remove(marker);
            }
            _assetMarkers.Clear();

            foreach (var asset in assets)
            {
                var marker = CreateAssetMarker(asset);
                _assetMarkers[asset.Id] = marker;
                _mapControl.Markers.Add(marker);
            }
        });
    }

    public void FocusOnLocation(double latitude, double longitude, int zoom = 8)
    {
        if (_mapControl == null) return;

        Application.Current.Dispatcher.BeginInvoke(() =>
        {
            _mapControl.Position = new PointLatLng(latitude, longitude);
            _mapControl.Zoom = zoom;
        });
    }

    public void ClearAllMarkers()
    {
        if (_mapControl == null) return;

        Application.Current.Dispatcher.BeginInvoke(() =>
        {
            _mapControl.Markers.Clear();
            _eventMarkers.Clear();
            _assetMarkers.Clear();
        });
    }

    private GMapMarker CreateEventMarker(GeoEvent evt)
    {
        var position = new PointLatLng(evt.Latitude, evt.Longitude);
        var marker = new GMapMarker(position);

        var markerElement = CreateEventMarkerVisual(evt);
        markerElement.ToolTip = $"{evt.Title}\n{evt.Category} | {evt.Severity}\n{evt.Timestamp:g}\nSource: {evt.Source}";
        markerElement.Tag = evt;
        markerElement.MouseLeftButtonDown += (s, e) =>
        {
            EventMarkerClicked?.Invoke(this, evt);
            e.Handled = true;
        };

        marker.Shape = markerElement;
        marker.Offset = new Point(-8, -8);

        return marker;
    }

    private GMapMarker CreateConflictZoneMarker(ConflictZone zone)
    {
        var position = new PointLatLng(zone.CenterLatitude, zone.CenterLongitude);
        var marker = new GMapMarker(position);

        var color = zone.Intensity switch
        {
            SeverityLevel.Critical => Color.FromArgb(96, 213, 0, 0),
            SeverityLevel.High => Color.FromArgb(80, 244, 67, 54),
            SeverityLevel.Medium => Color.FromArgb(64, 255, 152, 0),
            SeverityLevel.Low => Color.FromArgb(48, 76, 175, 80),
            _ => Color.FromArgb(48, 158, 158, 158)
        };

        var size = zone.RadiusKm / 10.0;
        size = Math.Clamp(size, 20, 80);

        var ellipse = new System.Windows.Shapes.Ellipse
        {
            Width = size,
            Height = size,
            Fill = new SolidColorBrush(color),
            Stroke = new SolidColorBrush(Color.FromArgb(160, color.R, color.G, color.B)),
            StrokeThickness = 2,
            ToolTip = $"CONFLICT ZONE: {zone.Name}\n{zone.Description}\nIntensity: {zone.Intensity}\nParties: {string.Join(", ", zone.InvolvedParties)}"
        };

        marker.Shape = ellipse;
        marker.Offset = new Point(-size / 2, -size / 2);

        return marker;
    }

    private GMapMarker CreateAssetMarker(MilitaryAsset asset)
    {
        var position = new PointLatLng(asset.Latitude, asset.Longitude);
        var marker = new GMapMarker(position);

        var markerElement = CreateAssetMarkerVisual(asset);
        markerElement.ToolTip = $"{asset.Name}\nType: {asset.Type}\nCountry: {asset.Country}\nStatus: {asset.Status}\nSource: {asset.Source}";
        markerElement.Tag = asset;
        markerElement.MouseLeftButtonDown += (s, e) =>
        {
            AssetMarkerClicked?.Invoke(this, asset);
            e.Handled = true;
        };

        marker.Shape = markerElement;
        marker.Offset = new Point(-10, -10);

        return marker;
    }

    private static System.Windows.Controls.Border CreateEventMarkerVisual(GeoEvent evt)
    {
        var color = evt.Severity switch
        {
            SeverityLevel.Critical => Colors.Red,
            SeverityLevel.High => Color.FromRgb(244, 67, 54),
            SeverityLevel.Medium => Color.FromRgb(255, 152, 0),
            SeverityLevel.Low => Color.FromRgb(76, 175, 80),
            _ => Colors.Gray
        };

        var size = evt.Severity switch
        {
            SeverityLevel.Critical => 18.0,
            SeverityLevel.High => 14.0,
            SeverityLevel.Medium => 12.0,
            _ => 10.0
        };

        var border = new System.Windows.Controls.Border
        {
            Width = size,
            Height = size,
            CornerRadius = new CornerRadius(size / 2),
            Background = new SolidColorBrush(Color.FromArgb(200, color.R, color.G, color.B)),
            BorderBrush = new SolidColorBrush(Colors.White),
            BorderThickness = new Thickness(1.5),
            Cursor = System.Windows.Input.Cursors.Hand
        };

        if (evt.IsAlert)
        {
            border.BorderBrush = new SolidColorBrush(Colors.Yellow);
            border.BorderThickness = new Thickness(2);
        }

        return border;
    }

    private static System.Windows.Controls.Border CreateAssetMarkerVisual(MilitaryAsset asset)
    {
        var color = asset.Type switch
        {
            AssetType.Aircraft => Color.FromRgb(0, 150, 255),
            AssetType.Warship => Color.FromRgb(0, 100, 200),
            AssetType.Submarine => Color.FromRgb(0, 80, 160),
            AssetType.Drone => Color.FromRgb(100, 200, 255),
            AssetType.GroundForce => Color.FromRgb(139, 119, 42),
            _ => Color.FromRgb(100, 100, 100)
        };

        var icon = asset.Type switch
        {
            AssetType.Aircraft => "\u2708",
            AssetType.Warship => "\u26F5",
            AssetType.Drone => "\u25C6",
            AssetType.Submarine => "\u25BC",
            AssetType.GroundForce => "\u25A0",
            _ => "\u25CF"
        };

        var border = new System.Windows.Controls.Border
        {
            Width = 20,
            Height = 20,
            CornerRadius = new CornerRadius(3),
            Background = new SolidColorBrush(Color.FromArgb(200, color.R, color.G, color.B)),
            BorderBrush = new SolidColorBrush(Color.FromArgb(255, color.R, color.G, color.B)),
            BorderThickness = new Thickness(1),
            Cursor = System.Windows.Input.Cursors.Hand,
            Child = new System.Windows.Controls.TextBlock
            {
                Text = icon,
                Foreground = new SolidColorBrush(Colors.White),
                FontSize = 12,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                TextAlignment = System.Windows.TextAlignment.Center
            }
        };

        if (asset.Heading.HasValue)
        {
            border.RenderTransform = new RotateTransform(asset.Heading.Value, 10, 10);
        }

        return border;
    }
}
