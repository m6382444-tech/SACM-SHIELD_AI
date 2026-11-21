/**
 * Interactive Leaflet Map Viewer for Phone Telecom GPS Coordinates
 * Displays exact exchange base station coordinates, cell tower radar circle,
 * and caller location details.
 */

class PhoneMapViewer {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.marker = null;
    this.circle = null;
  }

  initMap(lat, lng, zoom = 14) {
    const container = document.getElementById(this.containerId);
    if (!container || typeof L === 'undefined') return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Initialize Leaflet map with dark theme tiles (CartoDB Dark Matter / OSM)
    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: false
    }).setView([lat, lng], zoom);

    // Dark cyberpunk map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    // Add scale bar
    L.control.scale({ imperial: false }).addTo(this.map);
  }

  renderLocation(gpsData, isScam = false, callerName = '') {
    if (!gpsData || !gpsData.lat || !gpsData.lng) return;

    const lat = gpsData.lat;
    const lng = gpsData.lng;
    const radius = gpsData.accuracyRadiusMeters || 650;

    this.initMap(lat, lng, 14);

    if (!this.map) return;

    // Custom pulse marker icon
    const markerColor = isScam ? '#ff3366' : '#00e5ff';
    const customIcon = L.divIcon({
      className: 'custom-tower-marker',
      html: `
        <div class="tower-beacon ${isScam ? 'scam-beacon' : 'safe-beacon'}">
          <div class="beacon-core" style="background-color: ${markerColor};"></div>
          <div class="beacon-pulse" style="border-color: ${markerColor};"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Add Marker
    this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);

    // Add Radar Coverage Circle
    this.circle = L.circle([lat, lng], {
      radius: radius,
      color: markerColor,
      fillColor: markerColor,
      fillOpacity: 0.18,
      weight: 2,
      dashArray: '4, 6'
    }).addTo(this.map);

    // Bind popup
    const popupHtml = `
      <div style="font-family: inherit; font-size: 13px; color: #1e293b; line-height: 1.5;">
        <strong style="color: ${isScam ? '#e11d48' : '#0284c7'}; font-size: 14px;">
          ${isScam ? '🚨 Flagged Scam Caller Exchange' : '🛡️ Verified Telecom Exchange'}
        </strong><br/>
        <b>Caller ID:</b> ${callerName || 'Registered Account'}<br/>
        <b>Base Station:</b> ${gpsData.exchange || 'BTS Tower'}<br/>
        <b>GPS Coordinates:</b> ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E<br/>
        <b>Address:</b> ${gpsData.address || 'Telecom Switching Center'}<br/>
        <b>Coverage Radius:</b> ~${radius} meters
      </div>
    `;

    this.marker.bindPopup(popupHtml).openPopup();

    // Invalidate size to ensure proper tile layout
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 250);
  }

  resize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}

window.PhoneMapViewer = PhoneMapViewer;
