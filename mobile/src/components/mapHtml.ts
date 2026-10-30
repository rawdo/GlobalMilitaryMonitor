// Leaflet page rendered inside a WebView (native) or iframe (web), styled as a night-vision tactical
// display. Data is pushed in with window.setMapData(...) so the map keeps its viewport across
// refreshes; marker taps are sent back as {type: 'event', id}.

import { categoryCode, colors, severityColor, zuluTime } from '../theme';
import type { GeoEvent, Hotspot, MilitaryAsset } from '../lib/types';

export interface MapData {
  events: GeoEvent[];
  hotspots: Hotspot[];
  assets: MilitaryAsset[];
}

/** Strips the data down to what the map page needs. */
export function toMapPayload({ events, hotspots, assets }: MapData): string {
  return JSON.stringify({
    events: events
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => ({
        id: e.id,
        lat: e.latitude,
        lon: e.longitude,
        title: e.title,
        color: severityColor[e.severity],
        code: categoryCode[e.category],
        sev: e.severity.toUpperCase(),
        time: zuluTime(e.timestamp),
        src: e.source,
        alert: e.isAlert,
      })),
    zones: hotspots.map((z) => ({
      lat: z.centerLatitude,
      lon: z.centerLongitude,
      r: z.radiusKm * 1000,
      name: z.name.toUpperCase(),
      text: z.description,
      sev: z.intensity.toUpperCase(),
      color: severityColor[z.intensity],
    })),
    assets: assets.map((a) => ({
      lat: a.latitude,
      lon: a.longitude,
      name: a.name,
      call: a.name.split(' (')[0],
      status: `${a.country} · ${a.status}`,
      hdg: a.heading,
      drone: a.type === 'Drone',
    })),
  });
}

const c = colors;

export const MAP_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  :root { --g: ${c.accent}; --bg: ${c.background}; --panel: ${c.panel}; --line: ${c.lineBright}; --air: ${c.air}; }
  html, body, #map { margin: 0; height: 100%; background: var(--bg); overflow: hidden; }
  body { font-family: 'JetBrains Mono', ui-monospace, 'Roboto Mono', monospace; }
  /* Night-vision tint on the base map only; markers keep their true colours. */
  .leaflet-tile-pane { filter: sepia(1) hue-rotate(95deg) saturate(2.4) brightness(0.8) contrast(1.15); }
  .leaflet-container { background: var(--bg); }
  .fx { position: absolute; inset: 0; pointer-events: none; z-index: 450; }
  .grid { background-image:
      linear-gradient(rgba(61,255,162,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(61,255,162,.06) 1px, transparent 1px);
    background-size: 48px 48px; }
  .scan { background: repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px); }
  .vignette { background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.75) 100%); }
  .sweep { inset: auto; left: 50%; top: 50%; width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax;
    background: conic-gradient(from 0deg, rgba(61,255,162,.22), rgba(61,255,162,0) 14%, transparent 100%);
    border-radius: 50%; animation: spin 7s linear infinite; mix-blend-mode: screen; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .reticle { left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; inset: auto;
    border: 1px solid rgba(61,255,162,.35); border-radius: 50%; }
  .reticle:before, .reticle:after { content: ''; position: absolute; background: rgba(61,255,162,.45); }
  .reticle:before { left: 50%; top: -10px; bottom: -10px; width: 1px; }
  .reticle:after { top: 50%; left: -10px; right: -10px; height: 1px; }
  .hud { position: absolute; z-index: 460; pointer-events: none; color: var(--g); font-size: 10px;
    letter-spacing: 1px; text-shadow: 0 0 6px rgba(61,255,162,.6); }
  .hud.br { right: 10px; bottom: 26px; text-align: right; }
  .leaflet-control-attribution { background: rgba(4,8,10,.7) !important; color: #4a6560 !important; font-size: 8px; }
  .leaflet-control-attribution a { color: #4a6560 !important; }

  .ev { width: 11px; height: 11px; transform: rotate(45deg); border: 1px solid rgba(255,255,255,.55);
    box-sizing: border-box; }
  .ev.alert:after { content: ''; position: absolute; inset: -5px; border: 1.5px solid #ff1f4b;
    animation: ping 1.6s ease-out infinite; }
  @keyframes ping { from { opacity: 1; transform: scale(.6); } to { opacity: 0; transform: scale(2.2); } }
  .ac svg { filter: drop-shadow(0 0 3px var(--air)); }
  .ac .lbl { position: absolute; left: 16px; top: -2px; white-space: nowrap; font-size: 9px; color: var(--air);
    text-shadow: 0 0 4px #000, 0 0 2px #000; display: none; }
  .zoomed .ac .lbl { display: block; }
  .zone-lbl { background: rgba(4,8,10,.75) !important; border: 1px solid var(--line) !important; border-radius: 0 !important;
    box-shadow: none !important; font: 700 9px 'JetBrains Mono', monospace; letter-spacing: 1px; padding: 1px 4px !important; }
  .zone-lbl:before { display: none; }

  .leaflet-popup-content-wrapper { background: rgba(10,18,22,.96); color: ${c.text}; border-radius: 0;
    border: 1px solid var(--line); box-shadow: 0 0 18px rgba(61,255,162,.15); }
  .leaflet-popup-tip { background: rgba(10,18,22,.96); border: 1px solid var(--line); }
  .leaflet-popup-content { margin: 10px 12px; font: 12px/1.45 'JetBrains Mono', monospace; }
  .leaflet-container a.leaflet-popup-close-button { color: ${c.textSecondary}; }
  .pk { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; font-size: 10px; font-weight: 700; letter-spacing: 1px; }
  .pk span { border: 1px solid currentColor; padding: 0 4px; }
  .pt { font-family: Rajdhani, 'Roboto Condensed', sans-serif; font-weight: 600; font-size: 15px; line-height: 1.25; }
  .pm { color: ${c.textSecondary}; font-size: 10px; margin-top: 4px; }
  .open { display: inline-block; margin-top: 8px; color: var(--g); font-weight: 700; font-size: 11px; letter-spacing: 1px; text-decoration: none; }
</style>
</head><body>
<div id="map"></div>
<div class="fx grid"></div>
<div class="fx sweep"></div>
<div class="fx scan"></div>
<div class="fx vignette"></div>
<div class="fx reticle"></div>
<div class="hud br" id="coords"></div>
<script>
  var map = L.map('map', { zoomControl: false, worldCopyJump: true, minZoom: 2 }).setView([30, 30], 2);
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

  function fmt(v, pos, neg, w) { return Math.abs(v).toFixed(2).padStart(w, '0') + '\\u00b0' + (v >= 0 ? pos : neg); }
  function updateHud() {
    var c = map.getCenter().wrap();
    document.getElementById('coords').textContent =
      'CTR ' + fmt(c.lat, 'N', 'S', 5) + ' ' + fmt(c.lng, 'E', 'W', 6) + '  Z' + map.getZoom();
    map.getContainer().classList.toggle('zoomed', map.getZoom() >= 5);
  }
  map.on('move zoomend', updateHud); updateHud();

  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; }
  window.openEvent = function (id) { send({ type: 'event', id: id }); };

  function chevron(hdg, drone) {
    var shape = drone
      ? '<path d="M8 1 L14 8 L8 15 L2 8 Z" fill="none" stroke="${c.air}" stroke-width="1.6"/>'
      : '<path d="M8 1 L14 15 L8 11 L2 15 Z" fill="${c.air}" fill-opacity=".85" stroke="#001820" stroke-width=".6"/>';
    return '<svg width="16" height="16" viewBox="0 0 16 16" style="transform: rotate(' + (hdg || 0) + 'deg)">' + shape + '</svg>';
  }

  window.setMapData = function (data) {
    zoneLayer.clearLayers(); assetLayer.clearLayers(); eventLayer.clearLayers();
    data.zones.forEach(function (z) {
      L.circle([z.lat, z.lon], { radius: z.r, color: z.color, weight: 1.2, dashArray: '4 5', fillColor: z.color, fillOpacity: 0.08 })
        .bindTooltip('<span style="color:' + z.color + '">' + esc(z.name) + ' \\u00b7 ' + z.sev + '</span>',
          { permanent: true, direction: 'top', className: 'zone-lbl', opacity: 1 })
        .bindPopup('<div class="pk" style="color:' + z.color + '"><span>HOTSPOT</span>' + esc(z.sev) + '</div>' +
          '<div class="pt">' + esc(z.name) + '</div><div class="pm">' + esc(z.text) + '</div>')
        .addTo(zoneLayer);
    });
    data.assets.forEach(function (a) {
      L.marker([a.lat, a.lon], { icon: L.divIcon({ className: 'ac', iconSize: [16, 16], iconAnchor: [8, 8],
          html: chevron(a.hdg, a.drone) + '<div class="lbl">' + esc(a.call) + '</div>' }) })
        .bindPopup('<div class="pk" style="color:${c.air}"><span>AIR TRACK</span>LIVE ADS-B</div>' +
          '<div class="pt">' + esc(a.name) + '</div><div class="pm">' + esc(a.status) +
          (a.hdg != null ? ' \\u00b7 HDG ' + String(Math.round(a.hdg)).padStart(3, '0') : '') + '</div>')
        .addTo(assetLayer);
    });
    // Events sharing a location are fanned out slightly so they don't stack exactly.
    var counts = {};
    data.events.forEach(function (e) {
      var key = e.lat + ',' + e.lon, n = counts[key] = (counts[key] || 0) + 1;
      var angle = n * 2.4, dist = n > 1 ? Math.sqrt(n) * 0.6 : 0;
      var pos = [e.lat + Math.sin(angle) * dist, e.lon + Math.cos(angle) * dist];
      L.marker(pos, { icon: L.divIcon({ className: '', iconSize: [11, 11],
          html: '<div class="ev' + (e.alert ? ' alert' : '') + '" style="background:' + e.color + ';box-shadow:0 0 8px ' + e.color + '"></div>' }) })
        .bindPopup('<div class="pk" style="color:' + e.color + '"><span>' + e.code + '</span>' + e.sev + ' \\u00b7 ' + e.time + '</div>' +
          '<div class="pt">' + esc(e.title) + '</div><div class="pm">' + esc(e.src) + '</div>' +
          '<a class="open" href="#" onclick="openEvent(\\'' + e.id + '\\');return false;">OPEN REPORT \\u203a</a>')
        .addTo(eventLayer);
    });
  };
  send({ type: 'ready' });
</script>
</body></html>`;
