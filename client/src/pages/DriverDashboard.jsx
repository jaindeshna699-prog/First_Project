import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ExpiryCountdown from '../components/ExpiryCountdown.jsx';

// Custom icons
const driverIcon = L.divIcon({
  className: 'driver-pin',
  html: `<div style="background-color:#2563eb;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:16px;">🚗</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const createPickupIcon = (qty) =>
  L.divIcon({
    className: 'pickup-pin',
    html: `<div style="position:relative;left:-16px;top:-36px;cursor:pointer;">
      <div style="background-color:#16a34a;color:white;font-weight:bold;font-size:11px;padding:3px 7px;border-radius:12px;border:2px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.3);white-space:nowrap;display:inline-flex;align-items:center;gap:3px;">
        <span>📦</span>
        <span>${qty}kg</span>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #16a34a;margin:0 auto;"></div>
    </div>`,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });

const createNumberedStopIcon = (num) =>
  L.divIcon({
    className: 'numbered-stop-pin',
    html: `<div style="background-color:#4f46e5;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.35);">
      #${num}
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

// Haversine distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState({ lat: 28.6139, lng: 77.2090 });
  const [availableJobs, setAvailableJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Route Plan state
  const [routePlan, setRoutePlan] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const routeMarkersLayerRef = useRef(null);

  // 1. Check for existing active job
  const checkActiveJob = useCallback(async () => {
    try {
      const { data } = await api.get('/driver/active');
      if (data && (data.status === 'accepted' || data.status === 'picked_up')) {
        setCurrentJob(data);
      } else {
        setCurrentJob(null);
      }
    } catch {
      setCurrentJob(null);
    }
  }, []);

  // 2. Fetch available pickup runs based on driver geolocation
  const fetchAvailable = useCallback(async (lat, lng) => {
    try {
      const { data } = await api.get(`/driver/available?lat=${lat}&lng=${lng}`);
      // Sort nearest and most urgent first
      const sorted = [...data].sort((a, b) => {
        const distA = calculateDistanceKm(
          lat,
          lng,
          a.pickupLocation?.coordinates?.[1] ?? 0,
          a.pickupLocation?.coordinates?.[0] ?? 0
        );
        const distB = calculateDistanceKm(
          lat,
          lng,
          b.pickupLocation?.coordinates?.[1] ?? 0,
          b.pickupLocation?.coordinates?.[0] ?? 0
        );
        const expiryA = new Date(a.expiresAt).getTime();
        const expiryB = new Date(b.expiresAt).getTime();
        return (distA - distB) * 0.6 + ((expiryA - expiryB) / 3600000) * 0.4;
      });
      setAvailableJobs(sorted);
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch available pickups', 'error');
    }
  }, [toast]);

  // Initial load: geolocation + active check
  useEffect(() => {
    checkActiveJob().finally(() => setLoading(false));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDriverPos(coords);
          fetchAvailable(coords.lat, coords.lng);
        },
        () => {
          const fallbackLat = user?.location?.coordinates?.[1] || 28.6139;
          const fallbackLng = user?.location?.coordinates?.[0] || 77.2090;
          setDriverPos({ lat: fallbackLat, lng: fallbackLng });
          fetchAvailable(fallbackLat, fallbackLng);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      fetchAvailable(28.6139, 77.2090);
    }
  }, [checkActiveJob, fetchAvailable, user]);

  // (c) Realtime: donation:new adds a pin instantly
  useEffect(() => {
    if (!socket) return;

    const handleNewJob = (data) => {
      toast(`New pickup available: "${data.title || 'Food Surplus'}"`, 'info');
      fetchAvailable(driverPos.lat, driverPos.lng);
    };

    const handleStatusUpdate = () => {
      fetchAvailable(driverPos.lat, driverPos.lng);
    };

    socket.on('donation:new', handleNewJob);
    socket.on('donation:status', handleStatusUpdate);

    return () => {
      socket.off('donation:new', handleNewJob);
      socket.off('donation:status', handleStatusUpdate);
    };
  }, [socket, driverPos, fetchAvailable, toast]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (currentJob) return; // Only show map when on available view
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [driverPos.lat, driverPos.lng],
        zoom: 13,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Driver position marker
      L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('<strong>Your Location (Driver)</strong>');

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      const routeMarkersLayer = L.layerGroup().addTo(map);
      routeMarkersLayerRef.current = routeMarkersLayer;

      mapInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 200);
    }

    // Refresh markers for available pickup jobs
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      availableJobs.forEach((job) => {
        const [lng, lat] = job.pickupLocation.coordinates;
        const marker = L.marker([lat, lng], {
          icon: createPickupIcon(job.quantityKg),
        });

        marker.on('click', () => {
          setSelectedJobId(job._id);
        });

        marker.bindPopup(`
          <div style="min-width:160px;padding:2px;">
            <div style="font-weight:bold;font-size:13px;color:#111;">${job.title}</div>
            <div style="font-size:12px;color:#555;margin-top:2px;">Weight: <strong>${job.quantityKg} kg</strong></div>
            <div style="font-size:11px;color:#666;margin-top:2px;">Category: ${job.category}</div>
          </div>
        `);

        markersLayerRef.current.addLayer(marker);
      });
    }
  }, [availableJobs, driverPos, currentJob]);

  // Update Route Plan Polyline and Numbered Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clean up previous route polyline and markers
    if (routePolylineRef.current) {
      mapInstanceRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (routeMarkersLayerRef.current) {
      routeMarkersLayerRef.current.clearLayers();
    }

    if (!routePlan || !routePlan.polyline || routePlan.stops.length === 0) return;

    // Draw route polyline
    const polyline = L.polyline(routePlan.polyline, {
      color: '#4f46e5',
      weight: 5,
      dashArray: '8, 8',
      opacity: 0.85,
    }).addTo(mapInstanceRef.current);
    routePolylineRef.current = polyline;

    // Draw numbered markers for each stop
    routePlan.stops.forEach((stop) => {
      const marker = L.marker([stop.lat, stop.lng], {
        icon: createNumberedStopIcon(stop.stopNumber),
      });

      marker.bindPopup(`
        <div style="min-width:180px;padding:2px;">
          <div style="font-weight:bold;font-size:13px;color:#4f46e5;">Stop #${stop.stopNumber}: ${stop.title}</div>
          <div style="font-size:12px;color:#333;margin-top:2px;">Surplus: <strong>${stop.quantityKg} kg</strong> (${stop.category})</div>
          <div style="font-size:12px;color:#16a34a;margin-top:2px;font-weight:bold;">
            ETA: ${new Date(stop.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style="font-size:11px;color:#666;margin-top:2px;">
            Distance: +${stop.distanceFromPrevKm} km (~${stop.travelMinutes}m)
          </div>
          <div style="font-size:11px;color:#555;margin-top:2px;">
            Destination: <strong>${stop.dropoffOrg?.name || 'Shelter'}</strong>
          </div>
        </div>
      `);

      routeMarkersLayerRef.current.addLayer(marker);
    });

    // Fit map bounds to encompass the entire route
    const bounds = L.latLngBounds(routePlan.polyline);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [routePlan]);

  // Fetch Route Plan from Server
  const handleFetchRoutePlan = async () => {
    if (routePlan) {
      // Toggle off
      setRoutePlan(null);
      return;
    }

    setRouteLoading(true);
    try {
      const { data } = await api.get(
        `/driver/route-plan?lat=${driverPos.lat}&lng=${driverPos.lng}`
      );
      if (!data.stops || data.stops.length === 0) {
        toast('No accepted donations nearby available for route planning.', 'info');
      } else {
        setRoutePlan(data);
        toast(`Route plan generated with ${data.stops.length} stops!`, 'success');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate route plan', 'error');
    } finally {
      setRouteLoading(false);
    }
  };

  // Pan to selected job
  const handleSelectJob = (job) => {
    setSelectedJobId(job._id);
    if (mapInstanceRef.current) {
      const [lng, lat] = job.pickupLocation.coordinates;
      mapInstanceRef.current.setView([lat, lng], 15);
    }
  };

  // (b) Accept job action
  const handleAcceptJob = async (donationId) => {
    setStatusLoading(true);
    try {
      const { data } = await api.post(`/driver/${donationId}/accept`);
      setCurrentJob(data);
      setRoutePlan(null); // Clear active route plan if transitioning to current job
      toast('Delivery run accepted! Follow pickup route.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to accept delivery run', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  // Update status: picked_up -> delivered
  const handleUpdateStatus = async (newStatus) => {
    if (!currentJob) return;
    setStatusLoading(true);
    try {
      const { data } = await api.patch(`/driver/${currentJob._id}/status`, {
        status: newStatus,
      });
      setCurrentJob(data);
      if (newStatus === 'picked_up') {
        toast('Surplus picked up! Proceed to drop-off shelter.', 'success');
      } else if (newStatus === 'delivered') {
        toast('Food safely delivered to shelter! Great work.', 'success');
      }
    } catch (err) {
      toast(err.response?.data?.message || `Failed to update status to ${newStatus}`, 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // (b) "Current Job" Screen: showing pickup -> drop-off with big Picked Up / Delivered buttons
  if (currentJob) {
    const isPickedUp = currentJob.status === 'picked_up';
    const isDelivered = currentJob.status === 'delivered';
    const orgInfo = currentJob.matchedOrgId;

    return (
      <div className="max-w-2xl mx-auto py-2 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Active Dispatch Run
            </span>
            <h1 className="text-2xl font-bold text-surface-900 mt-2">
              {currentJob.title}
            </h1>
          </div>
          <span className="text-sm font-extrabold px-3 py-1.5 rounded-xl bg-surface-100 text-surface-800">
            {currentJob.quantityKg} kg
          </span>
        </div>

        {/* Route Card: Pickup -> Drop-off */}
        <div className="card bg-white border border-surface-200/90 shadow-md rounded-3xl p-6 space-y-6">
          {/* Step 1: Pickup */}
          <div className="flex items-start gap-4">
            <div
              className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                isPickedUp || isDelivered
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-100 text-brand-800 ring-4 ring-brand-50'
              }`}
            >
              {isPickedUp || isDelivered ? '✓' : '1'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-surface-500">
                  Pickup Location
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-100 text-surface-700 capitalize">
                  {currentJob.category}
                </span>
              </div>
              <h3 className="font-bold text-surface-900 text-base mt-0.5">
                Surplus Food: {currentJob.title}
              </h3>
              <p className="text-xs text-surface-600 font-mono mt-1">
                Lat: {currentJob.pickupLocation.coordinates[1].toFixed(5)}, Lng:{' '}
                {currentJob.pickupLocation.coordinates[0].toFixed(5)}
              </p>
              {currentJob.description && (
                <p className="text-xs bg-surface-50 text-surface-700 p-2.5 rounded-xl border border-surface-200 mt-2">
                  <strong>Pickup Instructions:</strong> {currentJob.description}
                </p>
              )}
            </div>
          </div>

          {/* Connecting Line */}
          <div className="ml-5 border-l-2 border-dashed border-surface-300 h-6 -my-2" />

          {/* Step 2: Drop-off */}
          <div className="flex items-start gap-4">
            <div
              className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                isDelivered
                  ? 'bg-brand-600 text-white'
                  : isPickedUp
                  ? 'bg-brand-100 text-brand-800 ring-4 ring-brand-50'
                  : 'bg-surface-100 text-surface-500'
              }`}
            >
              {isDelivered ? '✓' : '2'}
            </div>
            <div className="flex-1">
              <span className="text-xs uppercase font-bold tracking-wider text-surface-500">
                Drop-off Shelter
              </span>
              <h3 className="font-bold text-surface-900 text-base mt-0.5">
                {orgInfo?.name || 'Assigned Recipient Shelter'}
              </h3>
              {orgInfo?.openHours && (
                <p className="text-xs text-surface-600 mt-0.5">
                  Hours: <strong>{orgInfo.openHours}</strong>
                </p>
              )}
              {orgInfo?.location?.coordinates && (
                <p className="text-xs text-surface-500 font-mono mt-1">
                  Lat: {orgInfo.location.coordinates[1].toFixed(5)}, Lng:{' '}
                  {orgInfo.location.coordinates[0].toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Big Action Buttons */}
        <div className="space-y-3 pt-2">
          {!isPickedUp && !isDelivered && (
            <button
              type="button"
              disabled={statusLoading}
              onClick={() => handleUpdateStatus('picked_up')}
              className="btn-primary w-full py-5 text-xl font-bold rounded-2xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-3"
            >
              <span>📦</span>
              <span>{statusLoading ? 'Updating...' : 'Confirm Picked Up'}</span>
            </button>
          )}

          {isPickedUp && !isDelivered && (
            <button
              type="button"
              disabled={statusLoading}
              onClick={() => handleUpdateStatus('delivered')}
              className="w-full py-5 text-xl font-bold rounded-2xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              <span>✅</span>
              <span>{statusLoading ? 'Updating...' : 'Confirm Delivered'}</span>
            </button>
          )}

          {isDelivered && (
            <div className="card text-center p-6 bg-emerald-50 border border-emerald-200 rounded-3xl">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-lg font-bold text-emerald-900">Delivery Completed!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                You successfully rescued {currentJob.quantityKg} kg of surplus food.
              </p>
              <button
                type="button"
                onClick={() => setCurrentJob(null)}
                className="btn-primary mt-4 py-3"
              >
                Find Next Available Pickup
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // (a) Available Pickups View: Leaflet map + synced list
  return (
    <div className="max-w-5xl mx-auto py-2 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            Available Deliveries
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            Surplus food matched & accepted by shelters waiting for volunteer driver pickup
          </p>
        </div>

        {/* Route Optimization Button */}
        <button
          type="button"
          disabled={routeLoading}
          onClick={handleFetchRoutePlan}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all self-start sm:self-auto ${
            routePlan
              ? 'bg-surface-800 text-white hover:bg-surface-900'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/25'
          }`}
        >
          {routeLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Optimizing Route...</span>
            </>
          ) : routePlan ? (
            <>
              <span>✕</span>
              <span>Hide Route Plan</span>
            </>
          ) : (
            <>
              <span>🗺️</span>
              <span>Optimize Route (Up to 3 Pickups)</span>
            </>
          )}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-3xl overflow-hidden border border-surface-200/90 shadow-md">
        <div ref={mapContainerRef} className="h-64 sm:h-80 w-full z-0" />
        <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow text-xs font-bold text-surface-800 flex items-center gap-2 border border-surface-200">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600 animate-ping" />
          <span>{availableJobs.length} pickups available</span>
        </div>

        {/* Active Route Indicator Pill */}
        {routePlan && (
          <div className="absolute top-3 left-3 z-10 bg-indigo-600 text-white px-3.5 py-1.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
            <span>🗺️ Planned Route:</span>
            <span>
              {routePlan.totalStops} Stops • {routePlan.totalDistanceKm} km • ~
              {routePlan.totalDurationMinutes} min
            </span>
          </div>
        )}
      </div>

      {/* Route Plan Breakdown Card (Visible when active) */}
      {routePlan && routePlan.stops.length > 0 && (
        <div className="card bg-indigo-50/50 border-2 border-indigo-200 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-indigo-900">
                  ⚡ Ordered Multi-Stop Route Plan
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                  Nearest-Neighbor + Expiry Safe
                </span>
              </div>
              <p className="text-xs text-indigo-700 mt-0.5">
                Stops are ordered to minimize transit distance while ensuring all deliveries arrive before expiry deadlines.
              </p>
            </div>
            <div className="text-xs font-bold text-indigo-900 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shrink-0">
              Total: {routePlan.totalDistanceKm} km • ~{routePlan.totalDurationMinutes} min total run
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {routePlan.stops.map((stop) => (
              <div
                key={stop.donationId}
                className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white font-extrabold text-xs">
                      #{stop.stopNumber}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ETA: {new Date(stop.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="font-bold text-surface-900 text-sm mt-2">{stop.title}</h4>
                  <div className="text-xs text-surface-600 mt-0.5">
                    <strong>{stop.quantityKg} kg</strong> ({stop.category})
                  </div>
                  <div className="text-xs text-surface-500 mt-1">
                    Transit: +{stop.distanceFromPrevKm} km (~{stop.travelMinutes}m)
                  </div>
                  <div className="text-xs text-indigo-600 mt-1 font-semibold truncate">
                    Dropoff: {stop.dropoffOrg?.name || 'Shelter'}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={statusLoading}
                  onClick={() => handleAcceptJob(stop.donationId)}
                  className="btn-primary w-full mt-3 py-2 text-xs"
                >
                  Accept Stop #{stop.stopNumber}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synced List: Nearest and Most Urgent First */}
      <div>
        <h2 className="text-base font-bold text-surface-900 mb-3 flex items-center gap-2">
          <span>📋 Pickup Queue</span>
          <span className="text-xs font-normal text-surface-500">
            (Sorted: Nearest & most urgent first)
          </span>
        </h2>

        {availableJobs.length === 0 ? (
          <div className="card text-center py-12 bg-white border border-surface-200/80 rounded-3xl">
            <div className="text-4xl mb-2">🚗</div>
            <h3 className="text-base font-bold text-surface-800">No pickups waiting right now</h3>
            <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
              When a shelter accepts incoming food, new pickup pins will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableJobs.map((job) => {
              const [lng, lat] = job.pickupLocation.coordinates;
              const dist = calculateDistanceKm(driverPos.lat, driverPos.lng, lat, lng);
              const isSelected = selectedJobId === job._id;

              return (
                <div
                  key={job._id}
                  onClick={() => handleSelectJob(job)}
                  className={`card bg-white border-2 rounded-3xl p-5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-600 shadow-lg ring-2 ring-brand-100'
                      : 'border-surface-200/80 hover:border-surface-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-surface-100">
                    <div>
                      <h3 className="font-bold text-surface-900 text-base">{job.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700 capitalize">
                          {job.category}
                        </span>
                        <span className="text-xs font-bold text-surface-900">
                          {job.quantityKg} kg
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-surface-100 text-surface-700">
                        📍 {dist} km away
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs">
                    <ExpiryCountdown expiresAt={job.expiresAt} />
                    <span className="text-surface-500">
                      Destination: <strong>{job.matchedOrgId?.name || 'Nearby Shelter'}</strong>
                    </span>
                  </div>

                  {job.description && (
                    <p className="text-xs text-surface-600 bg-surface-50 p-2 rounded-xl border border-surface-100 mt-2 truncate">
                      {job.description}
                    </p>
                  )}

                  {/* Accept Button */}
                  <button
                    type="button"
                    disabled={statusLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptJob(job._id);
                    }}
                    className="btn-primary w-full mt-4 py-3 text-sm shadow-md"
                  >
                    Accept Delivery Run 🚗
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
