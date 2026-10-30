// Leaflet page rendered inside a WebView (native) or iframe (web).
// Data is pushed in with window.setMapData(...) so the map keeps its viewport across refreshes;
// marker taps are sent back as {type: 'event', id}.

import { colors, severityColor, categoryIcon, assetIcon } from '../theme';
import type { ConflictZone, GeoEvent, MilitaryAsset } from '../lib/types';

export interface MapData {
  events: GeoEvent[];
  zones: ConflictZone[];
  assets: MilitaryAsset[];
}

/** Strips the data down to what the map page needs. */
export function toMapPayload({ events, zones, assets }: MapData): string {
  return JSON.stringify({
    events: events
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => ({
        id: e.id,
        lat: e.latitude,
        lon: e.longitude,
        title: e.title,
        color: severityColor[e.severity],
        icon: categoryIcon[e.category],
        alert: e.isAlert,
      })),
    zones: zones.map((z) => ({
      lat: z.centerLatitude,
      lon: z.centerLongitude,
      r: z.radiusKm * 1000,
      name: z.name,
      color: severityColor[z.intensity],
    })),
    assets: assets.map((a) => ({
      lat: a.latitude,
      lon: a.longitude,
      name: a.name,
      status: a.status,
      icon: assetIcon[a.type],
    })),
  });
}

export const MAP_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: ${colors.background}; }
  .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: ${colors.card}; color: ${colors.text}; }
  .leaflet-popup-content { font: 13px -apple-system, Roboto, sans-serif; margin: 10px 12px; }
  .leaflet-popup-content b { color: ${colors.accent}; }
  .leaflet-container a.leaflet-popup-close-button { color: ${colors.textSecondary}; }
  .open { display: inline-block; margin-top: 6px; color: ${colors.accent}; font-weight: 600; }
  .asset { font-size: 18px; text-shadow: 0 0 3px #000; }
  .dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff8; box-sizing: border-box; }
  .dot.alert { animation: pulse 1.6s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 #ff444499; } 70% { box-shadow: 0 0 0 12px #ff444400; } 100% { box-shadow: 0 0 0 0 #ff444400; } }
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, worldCopyJump: true, minZoom: 2 }).setView([25, 30], 2);
  // Esri dark canvas: free with attribution and, unlike most dark basemaps, needs no API key.
  var esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  L.tileLayer(esri + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16, attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors'
  }).addTo(map);
  L.tileLayer(esri + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 }).addTo(map);
  map.attributionControl.setPrefix(false);
  var zoneLayer = L.layerGroup().addTo(map);
  var assetLayer = L.layerGroup().addTo(map);
  var eventLayer = L.layerGroup().addTo(map);

  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  window.openEvent = function (id) { send({ type: 'event', id: id }); };

  window.setMapData = function (data) {
    zoneLayer.clearLayers(); assetLayer.clearLayers(); eventLayer.clearLayers();
    data.zones.forEach(function (z) {
      L.circle([z.lat, z.lon], { radius: z.r, color: z.color, weight: 1, fillOpacity: 0.18 })
        .bindPopup('<b>' + esc(z.name) + '</b>').addTo(zoneLayer);
    });
    data.assets.forEach(function (a) {
      L.marker([a.lat, a.lon], { icon: L.divIcon({ className: 'asset', html: a.icon, iconSize: [20, 20] }) })
        .bindPopup('<b>' + esc(a.name) + '</b><br>' + esc(a.status)).addTo(assetLayer);
    });
    // Events sharing a location are fanned out slightly so they don't stack exactly.
    var counts = {};
    data.events.forEach(function (e) {
      var key = e.lat + ',' + e.lon, n = counts[key] = (counts[key] || 0) + 1;
      var angle = n * 2.4, dist = n > 1 ? Math.sqrt(n) * 0.6 : 0;
      var pos = [e.lat + Math.sin(angle) * dist, e.lon + Math.cos(angle) * dist];
      L.marker(pos, { icon: L.divIcon({ className: '', iconSize: [14, 14],
          html: '<div class="dot' + (e.alert ? ' alert' : '') + '" style="background:' + e.color + '"></div>' }) })
        .bindPopup(e.icon + ' ' + esc(e.title) + '<br><a class="open" href="#" onclick="openEvent(\\'' + e.id + '\\');return false;">Details ›</a>')
        .addTo(eventLayer);
    });
  };
  send({ type: 'ready' });
</script>
</body></html>`;
