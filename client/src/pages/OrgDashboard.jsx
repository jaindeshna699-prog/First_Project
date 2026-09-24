import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ExpiryCountdown from '../components/ExpiryCountdown.jsx';
import LocationPicker from '../components/LocationPicker.jsx';

const ALL_CATEGORIES = [
  { id: 'cooked', label: '🍲 Cooked Meals' },
  { id: 'produce', label: '🥦 Produce' },
  { id: 'bakery', label: '🍞 Bakery' },
  { id: 'dairy', label: '🧀 Dairy' },
  { id: 'meat', label: '🥩 Meat' },
  { id: 'packaged', label: '📦 Packaged' },
  { id: 'beverages', label: '🧃 Beverages' },
];

export default function OrgDashboard() {
  const socket = useSocket();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'settings'
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  // Org data
  const [org, setOrg] = useState(null);
  const [incoming, setIncoming] = useState([]);

  // Settings form states
  const [capacityKgPerDay, setCapacityKgPerDay] = useState(100);
  const [acceptedCategories, setAcceptedCategories] = useState([]);
  const [openHours, setOpenHours] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2090);

  const fetchOrg = useCallback(async () => {
    try {
      const { data } = await api.get('/orgs/me');
      setOrg(data);
      setCapacityKgPerDay(data.capacityKgPerDay ?? 100);
      setAcceptedCategories(data.acceptedCategories ?? []);
      setOpenHours(data.openHours ?? '');
      if (data.location?.coordinates?.[1] && data.location?.coordinates?.[0]) {
        setLat(data.location.coordinates[1]);
        setLng(data.location.coordinates[0]);
      }
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Failed to load org profile', 'error');
    }
  }, [toast]);

  const fetchIncoming = useCallback(async () => {
    try {
      const { data } = await api.get('/orgs/incoming');
      setIncoming(data);
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Failed to load incoming offers', 'error');
    }
  }, [toast]);

  useEffect(() => {
    Promise.all([fetchOrg(), fetchIncoming()]).finally(() => setLoading(false));
  }, [fetchOrg, fetchIncoming]);

  // Real-time socket updates on donation:matched and donation:status
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchIncoming();
      fetchOrg();
    };

    socket.on('donation:matched', handleUpdate);
    socket.on('donation:status', handleUpdate);

    return () => {
      socket.off('donation:matched', handleUpdate);
      socket.off('donation:status', handleUpdate);
    };
  }, [socket, fetchIncoming, fetchOrg]);

  const handleRespond = async (donationId, accept) => {
    setRespondingId(donationId);
    try {
      await api.post(`/orgs/donations/${donationId}/respond`, { accept });
      toast(
        accept
          ? 'Surplus accepted! Drivers are being notified for dispatch.'
          : 'Offer declined. Donation will cascade to next ranked recipient.',
        accept ? 'success' : 'info'
      );
      // Refresh offers & updated used capacity
      fetchIncoming();
      fetchOrg();
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Error responding to offer', 'error');
    } finally {
      setRespondingId(null);
    }
  };

  const handleCategoryToggle = (catId) => {
    setAcceptedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        capacityKgPerDay: Number(capacityKgPerDay),
        acceptedCategories,
        openHours: openHours.trim(),
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      };
      const { data } = await api.put('/orgs/me', payload);
      setOrg(data);
      toast('Organization settings updated successfully', 'success');
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // Capacity calculations
  const totalCap = org?.capacityKgPerDay || 100;
  const usedCap = org?.usedKgToday || 0;
  const remainingCap = Math.max(0, totalCap - usedCap);
  const usedPercent = Math.min(100, Math.round((usedCap / totalCap) * 100));

  let barColor = 'bg-brand-600';
  if (usedPercent >= 90) barColor = 'bg-rose-600';
  else if (usedPercent >= 70) barColor = 'bg-amber-500';

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Header & Title */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
          {org?.name || 'Recipient Organization'}
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Intake management, real-time donation matching, and capacity settings
        </p>
      </div>

      {/* (c) Capacity Bar Showing Used vs Total Today */}
      <div className="card bg-white border border-surface-200/90 shadow-sm p-5 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-surface-500">
              Today's Daily Intake Capacity
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-surface-900">{usedCap} kg</span>
              <span className="text-sm text-surface-500 font-medium">used of {totalCap} kg capacity</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-100 text-surface-700">
              {remainingCap} kg remaining today
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-100 rounded-full h-4 overflow-hidden p-0.5 border border-surface-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-surface-500 mt-2 font-medium">
          <span>0 kg</span>
          <span>{usedPercent}% full</span>
          <span>{totalCap} kg / day</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-surface-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all min-h-[48px] ${
            activeTab === 'incoming'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white text-surface-700 hover:bg-surface-100 border border-surface-200'
          }`}
        >
          <span>📥 Incoming Offers</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'incoming'
                ? 'bg-white/20 text-white'
                : 'bg-brand-100 text-brand-800'
            }`}
          >
            {incoming.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all min-h-[48px] ${
            activeTab === 'settings'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-white text-surface-700 hover:bg-surface-100 border border-surface-200'
          }`}
        >
          <span>⚙️ Intake Settings</span>
        </button>
      </div>

      {/* (a) Incoming Offers Tab */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {incoming.length === 0 ? (
            <div className="card text-center py-14 bg-white border border-surface-200/80 rounded-3xl">
              <div className="text-4xl mb-3">🔔</div>
              <h3 className="text-lg font-bold text-surface-800">No incoming offers right now</h3>
              <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
                When a donor posts surplus food that matches your capacity, safe expiry, and accepted categories, it will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {incoming.map((item) => {
                const score = item.riskScore ?? 0;
                return (
                  <div
                    key={item._id}
                    className="card bg-white border-2 border-brand-200/80 shadow-md rounded-3xl p-5 sm:p-6 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-surface-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-surface-900">{item.title}</h2>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 capitalize">
                            {item.category}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-surface-600">
                          <span>
                            Quantity: <strong className="text-surface-900 text-sm">{item.quantityKg} kg</strong>
                          </span>
                          <span>•</span>
                          <ExpiryCountdown expiresAt={item.expiresAt} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-100 text-surface-700 border border-surface-200">
                          Risk: {score}/100
                        </span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-surface-600 mt-3 bg-surface-50 p-2.5 rounded-xl border border-surface-100">
                        <strong className="text-surface-700">Donor Notes:</strong> {item.description}
                      </p>
                    )}

                    {/* Accept / Decline Action Buttons */}
                    <div className="mt-4 pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        disabled={respondingId === item._id}
                        onClick={() => handleRespond(item._id, true)}
                        className="btn-primary flex-1 py-3 text-base shadow-lg shadow-brand-600/20"
                      >
                        {respondingId === item._id ? 'Processing...' : '✓ Accept Offer (+ Reserve Capacity)'}
                      </button>
                      <button
                        type="button"
                        disabled={respondingId === item._id}
                        onClick={() => handleRespond(item._id, false)}
                        className="btn-secondary sm:w-36 py-3 text-base text-surface-600 hover:text-rose-600 hover:bg-rose-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* (b) Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="card bg-white border border-surface-200/90 shadow-sm p-6 sm:p-8 rounded-3xl space-y-6">
          <div className="border-b border-surface-100 pb-4">
            <h2 className="text-lg font-bold text-surface-900">Shelter Intake Profile & Settings</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              These parameters determine auto-matching safety, distance, and daily food intake limits.
            </p>
          </div>

          {/* Capacity kg/day */}
          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">
              Max Daily Capacity (kg / day) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="5000"
                step="5"
                required
                value={capacityKgPerDay}
                onChange={(e) => setCapacityKgPerDay(e.target.value)}
                className="input max-w-xs font-bold text-surface-900"
              />
              <span className="text-sm font-bold text-surface-600">kg / day</span>
            </div>
          </div>

          {/* Accepted Categories */}
          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-2">
              Accepted Food Categories (Leave empty to accept all)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const selected = acceptedCategories.includes(cat.id);
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                      selected
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 ring-2 ring-brand-600'
                        : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                    }`}
                  >
                    {selected ? '✓ ' : ''}{cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Open Hours */}
          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">
              Operating / Open Hours
            </label>
            <input
              type="text"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
              className="input max-w-md"
              placeholder="e.g. 08:00 - 20:00 or 24/7"
            />
          </div>

          {/* Location Pin */}
          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">
              Shelter Location (Click map to pin) *
            </label>
            <LocationPicker
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={savingSettings}
            className="btn-primary w-full py-4 text-base shadow-lg"
          >
            {savingSettings ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
}
