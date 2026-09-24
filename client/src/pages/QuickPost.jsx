import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import LocationPicker from '../components/LocationPicker.jsx';

const CATEGORIES = [
  { id: 'cooked', label: '🍲 Cooked Meals' },
  { id: 'produce', label: '🥦 Produce' },
  { id: 'bakery', label: '🍞 Bakery' },
  { id: 'dairy', label: '🧀 Dairy' },
  { id: 'meat', label: '🥩 Meat' },
  { id: 'packaged', label: '📦 Packaged' },
  { id: 'beverages', label: '🧃 Beverages' },
];

function formatLocalDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function QuickPost() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // AI One-line description input
  const [oneLineText, setOneLineText] = useState('');
  const [parsing, setParsing] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cooked');
  const [quantityKg, setQuantityKg] = useState(10);
  const [description, setDescription] = useState('');
  const [expiryLocal, setExpiryLocal] = useState(() => {
    return formatLocalDateTime(new Date(Date.now() + 4 * 3600 * 1000));
  });

  // Location state prefilled from profile
  const [lat, setLat] = useState(() => {
    if (user?.location?.coordinates?.[1]) return user.location.coordinates[1];
    return 28.6139; // Default fallback
  });
  const [lng, setLng] = useState(() => {
    if (user?.location?.coordinates?.[0]) return user.location.coordinates[0];
    return 77.2090; // Default fallback
  });

  const [loading, setLoading] = useState(false);
  const [submittedDonation, setSubmittedDonation] = useState(null);

  // Auto-fill from AI parse endpoint
  const handleAutoFill = async (e) => {
    e?.preventDefault();
    if (!oneLineText.trim()) return;

    setParsing(true);
    try {
      const { data } = await api.post('/donations/parse', { text: oneLineText.trim() });
      if (data.title) setTitle(data.title);
      if (data.category && CATEGORIES.some((c) => c.id === data.category)) {
        setCategory(data.category);
      }
      if (data.quantityKg) setQuantityKg(data.quantityKg);
      if (data.expiresAt) {
        setExpiryLocal(formatLocalDateTime(new Date(data.expiresAt)));
      }
      toast('Fields auto-filled! You can review and edit below.', 'success');
    } catch {
      // Fallback: if the API fails, show the manual form
      toast('Auto-fill unavailable. Please fill in the details below.', 'info');
    } finally {
      setParsing(false);
    }
  };

  // Quick button helpers (+2h, +4h, +6h)
  const addHoursToExpiry = (hours) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setExpiryLocal(formatLocalDateTime(d));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Please enter a title for the surplus food', 'warning');
      return;
    }

    const expiryDate = new Date(expiryLocal);
    if (!expiryLocal || isNaN(expiryDate.getTime())) {
      toast('Please set a valid expiry date and time', 'warning');
      return;
    }

    if (expiryDate.getTime() <= Date.now()) {
      toast('Expiry time must be in the future', 'error');
      return;
    }

    const expiresAt = expiryDate.toISOString();

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        quantityKg: Number(quantityKg),
        description: description.trim() || undefined,
        expiresAt,
        pickupLocation: {
          coordinates: [lng, lat],
        },
      };

      const { data } = await api.post('/donations', payload);
      setSubmittedDonation(data);
      toast('Donation posted successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Failed to post donation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOneLineText('');
    setTitle('');
    setCategory('cooked');
    setQuantityKg(10);
    setDescription('');
    setExpiryLocal(formatLocalDateTime(new Date(Date.now() + 4 * 3600 * 1000)));
    setSubmittedDonation(null);
  };

  // If already submitted, show summary with Risk Score Badge
  if (submittedDonation) {
    const score = submittedDonation.riskScore ?? 0;
    let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    let riskLabel = 'Low Risk';
    if (score > 60) {
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-300';
      riskLabel = 'High Perishability Risk';
    } else if (score > 35) {
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-300';
      riskLabel = 'Moderate Risk';
    }

    return (
      <div className="max-w-2xl mx-auto py-4">
        <div className="card text-center p-8 bg-white border border-surface-200/90 shadow-xl rounded-3xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 mb-4 text-3xl">
            ✨
          </div>
          <h2 className="text-2xl font-bold text-surface-900 tracking-tight">Food Surplus Posted!</h2>
          <p className="text-surface-600 mt-1 text-sm">
            "{submittedDonation.title}" ({submittedDonation.quantityKg} kg)
          </p>

          <div className="my-6 p-4 rounded-2xl bg-surface-50 border border-surface-200 max-w-md mx-auto">
            <div className="text-xs uppercase font-bold tracking-wider text-surface-500 mb-2">
              Perishability Assessment
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-base font-bold ${badgeColor}`}>
              <span className="text-lg">⚡</span>
              <span>Risk Score: {score}/100</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60">
                {riskLabel}
              </span>
            </div>
            <div className="mt-3 text-xs text-surface-600">
              {submittedDonation.status === 'matched' ? (
                <span className="text-brand-700 font-semibold">
                  ✓ Automatically matched with a nearby recipient organization!
                </span>
              ) : (
                <span className="text-amber-700 font-semibold">
                  ⏳ Searching for nearby shelter with available capacity...
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button
              onClick={() => navigate('/donor/donations')}
              className="btn-primary"
            >
              View in My Donations
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary"
            >
              Post Another Item
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-2 space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <span>⚡ Quick Post</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
            &lt; 60 seconds
          </span>
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Post surplus food instantly to match nearby shelters
        </p>
      </div>

      {/* "Describe in one line" AI input */}
      <div className="card bg-gradient-to-r from-brand-50/60 to-emerald-50/60 border border-brand-200/80 shadow-sm p-4 sm:p-5 rounded-3xl">
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-900 mb-1.5 flex items-center gap-1.5">
          <span>✨</span>
          <span>Describe in one line (Smart Auto-Fill)</span>
        </label>
        <form onSubmit={handleAutoFill} className="flex gap-2">
          <input
            type="text"
            value={oneLineText}
            onChange={(e) => setOneLineText(e.target.value)}
            className="input bg-white flex-1 text-sm placeholder:text-surface-400"
            placeholder='e.g. "40 lbs veg biryani, ready till 9pm"'
          />
          <button
            type="submit"
            disabled={parsing || !oneLineText.trim()}
            className="btn-primary px-5 py-3 text-sm shrink-0 whitespace-nowrap"
          >
            {parsing ? 'Parsing...' : 'Auto-Fill'}
          </button>
        </form>
      </div>

      {/* Manual Editable Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 sm:p-7 rounded-3xl border border-surface-200/80 shadow-sm">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-surface-800 mb-1.5">
            Food Title / Item Description *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="e.g. 50 Trays of Fresh Rice & Curry, 30 Loaves of Sourdough"
          />
        </div>

        {/* Category Chips */}
        <div>
          <label className="block text-sm font-semibold text-surface-800 mb-2">
            Food Category *
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                  category === cat.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-2 ring-brand-600 ring-offset-1'
                    : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-surface-800">
              Estimated Quantity (kg) *
            </label>
            <div className="flex items-center gap-1.5 bg-brand-50 px-3 py-1 rounded-xl border border-brand-200">
              <input
                type="number"
                min="0.5"
                max="500"
                step="0.5"
                value={quantityKg}
                onChange={(e) => setQuantityKg(Math.max(0.5, Number(e.target.value)))}
                className="w-16 bg-transparent font-bold text-brand-800 text-right text-base focus:outline-none"
              />
              <span className="font-bold text-brand-800 text-sm">kg</span>
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="150"
            step="1"
            value={quantityKg}
            onChange={(e) => setQuantityKg(Number(e.target.value))}
            className="w-full h-2.5 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
          />

          <div className="flex justify-between gap-1 pt-1">
            {[5, 15, 30, 50, 100].map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setQuantityKg(preset)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  quantityKg === preset
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100'
                }`}
              >
                {preset} kg
              </button>
            ))}
          </div>
        </div>

        {/* Expiry Picker with Quick Buttons (+2h, +4h, +6h) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-surface-800">
              Safe Until (Expiry) *
            </label>
            <div className="flex gap-1.5">
              {[2, 4, 6].map((hours) => (
                <button
                  type="button"
                  key={hours}
                  onClick={() => addHoursToExpiry(hours)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-surface-100 text-surface-800 hover:bg-brand-50 hover:text-brand-700 transition-colors border border-surface-200"
                >
                  +{hours}h
                </button>
              ))}
            </div>
          </div>

          <input
            type="datetime-local"
            required
            value={expiryLocal}
            onChange={(e) => setExpiryLocal(e.target.value)}
            className="input font-medium"
          />
        </div>

        {/* Pickup Location Click-to-Pin with Leaflet */}
        <div>
          <label className="block text-sm font-semibold text-surface-800 mb-1.5">
            Pickup Location *
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

        {/* Optional Notes */}
        <div>
          <label className="block text-sm font-semibold text-surface-800 mb-1.5">
            Packaging / Pickup Instructions (Optional)
          </label>
          <textarea
            rows="2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[70px] resize-none"
            placeholder="e.g. Packed in catering containers, pickup from back entrance"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full text-lg py-4 shadow-xl"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Matching Shelters...</span>
            </div>
          ) : (
            '🚀 Post Surplus Food Now'
          )}
        </button>
      </form>
    </div>
  );
}
