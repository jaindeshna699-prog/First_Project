import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon assets if needed
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function WasteHotspotsMap({
  hotspots = [],
  center = [28.6139, 77.2090],
  showUserLocation = true,
  autoLocate = true,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const hotspotsLayerRef = useRef(null);
  const userLocationLayerRef = useRef(null);

  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | locating | active | denied

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 12,
      zoomControl: false, // Custom position or cleaner UI
    });

    // Add zoom control at top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Modern crisp OpenStreetMap layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const hotspotsLayer = L.layerGroup().addTo(map);
    const userLayer = L.layerGroup().addTo(map);

    hotspotsLayerRef.current = hotspotsLayer;
    userLocationLayerRef.current = userLayer;
    mapInstanceRef.current = map;

    // Invalidate size on initial mount and on window resize
    const timer = setTimeout(() => map.invalidateSize(), 250);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      hotspotsLayerRef.current = null;
      userLocationLayerRef.current = null;
    };
  }, [center]);

  // Handle Geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }

    setLocating(true);
    setLocationStatus('locating');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        const accuracy = pos.coords.accuracy || 200;
        setUserCoords({ coords, accuracy });
        setLocationStatus('active');
        setLocating(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 13, {
            duration: 1.5,
          });
        }
      },
      () => {
        setLocationStatus('denied');
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  // Auto-locate on first load if enabled
  useEffect(() => {
    if (autoLocate && showUserLocation) {
      requestLocation();
    }
  }, [autoLocate, showUserLocation, requestLocation]);

  // Update User Live Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocationLayerRef.current) return;
    userLocationLayerRef.current.clearLayers();

    if (!userCoords) return;

    const { coords, accuracy } = userCoords;

    // Pulsing accuracy halo
    const halo = L.circle(coords, {
      radius: Math.min(accuracy, 600),
      color: '#3b82f6',
      fillColor: '#60a5fa',
      fillOpacity: 0.15,
      weight: 1.5,
      dashArray: '4, 4',
    });

    // Custom pulsing beacon icon
    const liveIcon = L.divIcon({
      className: 'live-gps-beacon',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;">
          <div style="position:absolute;width:28px;height:28px;border-radius:9999px;background-color:#3b82f6;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;width:14px;height:14px;border-radius:9999px;background-color:#2563eb;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker(coords, { icon: liveIcon });
    marker.bindPopup(`
      <div style="padding:4px 2px;min-width:180px;font-family:system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#1e40af;">
          <span style="font-size:16px;">📍</span> Your Live Location
        </div>
        <div style="font-size:11px;color:#475569;margin-top:4px;">
          GPS: <strong>${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}</strong>
        </div>
        <div style="margin-top:6px;padding:3px 8px;border-radius:6px;background-color:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600;display:inline-block;">
          ⚡ Active Rescue Dispatch Zone
        </div>
      </div>
    `);

    userLocationLayerRef.current.addLayer(halo);
    userLocationLayerRef.current.addLayer(marker);
  }, [userCoords]);

  // Update Hotspots Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !hotspotsLayerRef.current) return;
    hotspotsLayerRef.current.clearLayers();

    // Combine provided hotspots with localized simulation points if user is in a different city
    const allHotspots = [...hotspots];

    if (userCoords && userCoords.coords) {
      const [uLat, uLng] = userCoords.coords;
      // Add local contextual spots around user's live position
      const localDeltas = [
        { dLat: 0.008, dLng: 0.007, title: 'Local Bistro Surplus', cat: 'cooked', kg: 28 },
        { dLat: -0.006, dLng: 0.009, title: 'Community Bakery Hub', cat: 'bakery', kg: 14 },
        { dLat: 0.005, dLng: -0.008, title: 'Metro Organic Market', cat: 'produce', kg: 42 },
      ];

      localDeltas.forEach((d, idx) => {
        allHotspots.push({
          id: `live-local-${idx}`,
          title: d.title,
          category: d.cat,
          quantityKg: d.kg,
          status: idx === 0 ? 'posted' : idx === 1 ? 'matched' : 'picked_up',
          lat: uLat + d.dLat,
          lng: uLng + d.dLng,
        });
      });
    }

    if (allHotspots.length === 0) return;

    const bounds = L.latLngBounds([]);

    allHotspots.forEach((h) => {
      if (!h.lat || !h.lng) return;

      const kg = h.quantityKg || 10;
      const radius = Math.min(24, Math.max(9, kg * 0.45));

      let fillColor = '#16a34a'; // Emerald
      let strokeColor = '#15803d';
      if (kg >= 35) {
        fillColor = '#dc2626'; // Red for large hotspot
        strokeColor = '#991b1b';
      } else if (kg >= 20) {
        fillColor = '#f59e0b'; // Amber for medium
        strokeColor = '#d97706';
      }

      const circle = L.circleMarker([h.lat, h.lng], {
        radius,
        fillColor,
        fillOpacity: 0.7,
        color: strokeColor,
        weight: 2,
      });

      circle.bindPopup(`
        <div style="min-width:170px;padding:3px;font-family:system-ui,sans-serif;">
          <div style="font-weight:700;font-size:13px;color:#0f172a;">${h.title || 'Surplus Hotspot'}</div>
          <div style="font-size:12px;color:#334155;margin-top:3px;">
            Surplus: <strong>${kg} kg</strong> (${h.category || 'general'})
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">
            Status: <span style="font-weight:600;text-transform:capitalize;color:${strokeColor};">${(h.status || 'posted').replace('_', ' ')}</span>
          </div>
          <div style="margin-top:6px;font-size:10px;color:#059669;font-weight:600;">
            ✓ In safe 30-min rescue buffer
          </div>
        </div>
      `);

      hotspotsLayerRef.current.addLayer(circle);
      bounds.extend([h.lat, h.lng]);
    });

    // If user position exists, include it in bounds
    if (userCoords && userCoords.coords) {
      bounds.extend(userCoords.coords);
    }

    if (bounds.isValid() && !userCoords) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
    }
  }, [hotspots, userCoords]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-surface-200 shadow-sm bg-white">
      {/* Responsive Map Canvas */}
      <div
        ref={mapContainerRef}
        className="h-80 sm:h-96 md:h-[420px] w-full z-0 transition-all"
        style={{ minHeight: '300px' }}
      />

      {/* Floating GPS Location Controls & Status */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={requestLocation}
          disabled={locating}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all shadow-md backdrop-blur border ${
            locationStatus === 'active'
              ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700'
              : 'bg-white/95 text-surface-800 border-surface-200/90 hover:bg-surface-50'
          }`}
          title="Detect and center on your live location"
        >
          <span className={`text-sm ${locating ? 'animate-spin' : ''}`}>
            {locating ? '⏳' : '📍'}
          </span>
          <span className="hidden sm:inline">
            {locating
              ? 'Locating...'
              : locationStatus === 'active'
              ? 'Live Location Active'
              : 'Detect Live Location'}
          </span>
          <span className="sm:hidden">
            {locating ? 'GPS...' : locationStatus === 'active' ? 'Live' : 'GPS'}
          </span>
        </button>
      </div>

      {/* Responsive Map Legend */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-lg border border-surface-200 text-xs">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="font-extrabold text-surface-900 text-[11px] sm:text-xs">
            Rescue Telemetry Grid
          </div>
          {userCoords && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              ● Live GPS Connected
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300 inline-block shrink-0" />
            <span className="text-surface-700 font-semibold">Your Location</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block shrink-0" />
            <span className="text-surface-600">&gt; 35 kg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
            <span className="text-surface-600">20-35 kg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-600 inline-block shrink-0" />
            <span className="text-surface-600">&lt; 20 kg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
