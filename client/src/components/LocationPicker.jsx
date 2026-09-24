import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinSvg = `
<svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 0C7.61116 0 0 7.61116 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.61116 26.3888 0 17 0Z" fill="#16a34a"/>
  <circle cx="17" cy="17" r="7" fill="white"/>
</svg>
`;

const customPinIcon = L.divIcon({
  className: 'custom-pin',
  html: `<div style="position:relative;left:-17px;top:-42px;width:34px;height:42px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3));cursor:pointer;">${pinSvg}</div>`,
  iconSize: [34, 42],
  iconAnchor: [17, 42],
});

export default function LocationPicker({ lat, lng, onChange }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = lat || 28.6139;
    const initialLng = lng || 77.2090;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onChange(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onChange(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update map when external lat/lng change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
    }
  }, [lat, lng]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onChange(latitude, longitude);
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
          mapInstanceRef.current.setView([latitude, longitude], 15);
        }
        setGeoLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          Click map to pin pickup location
        </span>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors border border-brand-200"
        >
          {geoLoading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
          ) : (
            <span>📍</span>
          )}
          <span>{geoLoading ? 'Detecting...' : 'Use My Location'}</span>
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className="h-56 sm:h-64 w-full rounded-2xl border border-surface-200 overflow-hidden shadow-inner z-0"
      />

      <div className="flex items-center justify-between text-xs text-surface-500 px-1">
        <span>Coordinates:</span>
        <span className="font-mono bg-surface-100 px-2 py-0.5 rounded text-surface-700">
          {lat ? lat.toFixed(5) : '0.00000'}, {lng ? lng.toFixed(5) : '0.00000'}
        </span>
      </div>
    </div>
  );
}
