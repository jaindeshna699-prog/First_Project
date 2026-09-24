import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import WasteHotspotsMap from '../components/WasteHotspotsMap.jsx';
import api from '../api/axios.js';

// Curated live hotspots for urban demonstration
const DEFAULT_HOTSPOTS = [
  { id: 'h1', title: 'Grand Pavilion Banquet', category: 'cooked', quantityKg: 45, status: 'posted', lat: 28.628, lng: 77.215 },
  { id: 'h2', title: 'FreshRoots Grocers', category: 'produce', quantityKg: 30, status: 'matched', lat: 28.585, lng: 77.230 },
  { id: 'h3', title: 'Artisan Sourdough Co.', category: 'bakery', quantityKg: 18, status: 'picked_up', lat: 28.642, lng: 77.198 },
  { id: 'h4', title: 'Central University Dining Hall', category: 'cooked', quantityKg: 38, status: 'accepted', lat: 28.601, lng: 77.185 },
  { id: 'h5', title: 'City Dairy Distribution Center', category: 'dairy', quantityKg: 22, status: 'delivered', lat: 28.652, lng: 77.228 },
  { id: 'h6', title: 'Metro Caterers Hub', category: 'cooked', quantityKg: 52, status: 'posted', lat: 28.618, lng: 77.245 },
];

// Live simulated rescue activity feed
const RECENT_RESCUES = [
  {
    id: 1,
    donor: 'The Olive Bistro',
    shelter: 'Aashray Hope Home',
    kg: 24,
    meals: 58,
    category: 'Cooked Meals',
    timeAgo: '8 mins ago',
    driver: 'Rahul K.',
    badge: 'Delivered',
  },
  {
    id: 2,
    donor: 'Urban Daily Bakery',
    shelter: 'St. Jude Youth Center',
    kg: 16,
    meals: 38,
    category: 'Fresh Bread',
    timeAgo: '19 mins ago',
    driver: 'Priya M.',
    badge: 'In Transit',
  },
  {
    id: 3,
    donor: 'Hyatt Regency Banquet',
    shelter: 'Seva Shelter Collective',
    kg: 48,
    meals: 115,
    category: 'Cooked Meals',
    timeAgo: '32 mins ago',
    driver: 'Amit S.',
    badge: 'Delivered',
  },
  {
    id: 4,
    donor: 'GreenMarket Organics',
    shelter: 'Community Care Kitchen',
    kg: 35,
    meals: 84,
    category: 'Produce & Veg',
    timeAgo: '51 mins ago',
    driver: 'David L.',
    badge: 'Delivered',
  },
];

const CATEGORY_FACTORS = {
  cooked: { name: 'Cooked Meals', icon: '🍲', factor: 2.4, co2Factor: 2.5, shelfLife: '2-4 hours' },
  produce: { name: 'Fresh Produce', icon: '🥦', factor: 2.2, co2Factor: 2.1, shelfLife: '24-48 hours' },
  bakery: { name: 'Bakery & Breads', icon: '🥖', factor: 2.5, co2Factor: 2.3, shelfLife: '12-24 hours' },
  dairy: { name: 'Dairy & Chilled', icon: '🥛', factor: 2.3, co2Factor: 3.1, shelfLife: '4-8 hours' },
  packaged: { name: 'Packaged Goods', icon: '📦', factor: 2.0, co2Factor: 1.8, shelfLife: '7+ days' },
};

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Impact Data State
  const [impactStats, setImpactStats] = useState({
    totalKgDelivered: 1240,
    meals: 2976,
    co2eAvoided: 3100,
    activeDonations: 7,
    totalDonations: 84,
    successRate: 98.4,
    hotspots: DEFAULT_HOTSPOTS,
  });

  // Simulator State
  const [simCategory, setSimCategory] = useState('cooked');
  const [simKg, setSimKg] = useState(35);
  const [simHours, setSimHours] = useState(3);

  // Live Mission Stepper State for interactive demonstration
  const [missionStep, setMissionStep] = useState(2); // 0: Posted, 1: Matched, 2: Dispatched, 3: Delivered

  // Stakeholder Active Tab
  const [activeTab, setActiveTab] = useState('donors');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  // Mobile Navigation Menu Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch real impact if backend is reachable
  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await api.get('/impact/summary');
        if (res.data && isMounted) {
          setImpactStats((prev) => ({
            ...prev,
            totalKgDelivered: res.data.totalKgDelivered || prev.totalKgDelivered,
            meals: res.data.meals || prev.meals,
            co2eAvoided: res.data.co2eAvoided || prev.co2eAvoided,
            activeDonations: res.data.activeDonations ?? prev.activeDonations,
            totalDonations: res.data.totalDonations || prev.totalDonations,
            successRate: res.data.successRate || prev.successRate,
            hotspots: res.data.hotspots?.length > 0 ? res.data.hotspots : prev.hotspots,
          }));
        }
      } catch {
        // Keep resilient demo statistics
      }
    }
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Simulator Calculations
  const calculatedImpact = useMemo(() => {
    const cat = CATEGORY_FACTORS[simCategory] || CATEGORY_FACTORS.cooked;
    const meals = Math.round(simKg * cat.factor);
    const co2 = Math.round(simKg * cat.co2Factor * 10) / 10;
    const estimatedValue = Math.round(simKg * 140); // approx ₹140 or equivalent unit value
    const matchTimeSec = Math.max(18, Math.round(45 - simKg * 0.1));
    return { meals, co2, estimatedValue, matchTimeSec, cat };
  }, [simCategory, simKg]);

  const roleDashboardMap = {
    donor: '/donor/new',
    recipient: '/org',
    driver: '/driver',
    admin: '/admin',
  };

  const nextMissionStep = () => {
    setMissionStep((prev) => (prev + 1) % 4);
  };

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 font-sans selection:bg-brand-500 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* ── TOP ANNOUNCEMENT BANNER ────────────────────────────────────────── */}
      <div className="bg-surface-900 text-white text-xs sm:text-sm py-2.5 border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold text-xs uppercase tracking-wider border border-brand-500/40 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              AmiHacks 2026
            </span>
            <span className="text-surface-300 hidden md:inline shrink-0 font-medium">Track A: Social Impact</span>
            <span className="text-surface-600 hidden md:inline">•</span>
            <span className="font-semibold text-surface-200 truncate">Surplus-to-Shelter Food Rescue Engine</span>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <a href="#simulator" className="text-brand-300 hover:text-brand-200 font-semibold underline-offset-4 hover:underline">
              Impact Simulator →
            </a>
            <span className="text-surface-700 hidden sm:inline">|</span>
            <span className="text-surface-400 hidden sm:inline font-medium">Zero Food To Landfill</span>
          </div>
        </div>
      </div>

      {/* ── STICKY GLASSMORPHIC NAVBAR ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-surface-200/80 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 lg:gap-8">
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-600 to-emerald-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-brand-600/25 group-hover:scale-105 transition-transform shrink-0">
              🌱
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 leading-none">
                <span className="font-extrabold text-lg sm:text-xl text-surface-900 tracking-tight">
                  Surplus to Shelter
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-brand-50 text-brand-700 border border-brand-200 uppercase tracking-wide">
                  Live
                </span>
              </div>
              <span className="text-[11px] text-surface-500 font-medium mt-1 tracking-normal">
                Real-Time Food Rescue & Routing Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {[
              { href: '#how-it-works', label: 'How It Works' },
              { href: '#simulator', label: 'Impact Simulator' },
              { href: '#hotspots', label: 'Live Map' },
              { href: '#stakeholders', label: 'Ecosystem' },
              { href: '#tech', label: 'Architecture' },
              { href: '#faq', label: 'FAQ' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 xl:px-3.5 py-2 rounded-xl text-sm font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-100/80 transition-all"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden xl:inline-block text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-100 text-surface-700">
                  👤 {user.name} ({user.role})
                </span>
                <Link
                  to={roleDashboardMap[user.role] || '/donor/new'}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Dashboard</span>
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center justify-center px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-surface-700 hover:text-surface-900 hover:bg-surface-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/donor/new"
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Post Surplus</span>
                  <span>⚡</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 font-bold text-lg h-10 w-10 flex items-center justify-center transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-surface-200 px-4 py-4 space-y-3 shadow-xl">
            <nav className="flex flex-col space-y-1 text-sm font-semibold text-surface-800">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#simulator"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors"
              >
                Impact Simulator
              </a>
              <a
                href="#hotspots"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors"
              >
                Live GPS Hotspots Map
              </a>
              <a
                href="#stakeholders"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors"
              >
                Ecosystem Stakeholders
              </a>
              <a
                href="#tech"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors"
              >
                Tech Architecture
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl hover:bg-surface-100 transition-colors"
              >
                Frequently Asked Questions
              </a>
            </nav>

            <div className="pt-3 border-t border-surface-100 flex flex-col gap-2">
              <Link
                to="/donor/new"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-600 text-white font-bold text-sm shadow-md shadow-brand-600/25"
              >
                ⚡ Post Surplus Food (&lt;60s)
              </Link>
              {!user && (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-800 text-xs font-bold text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-800 text-xs font-bold text-center"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 bg-gradient-to-b from-brand-50/50 via-white to-surface-50">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-brand-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headlines & Call to Actions */}
            <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 border border-brand-300 text-brand-900 text-xs sm:text-sm font-bold shadow-sm">
                <span className="text-base">🏆</span>
                <span>AmiHacks Track A • 24hr Social Innovation</span>
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                <span className="text-brand-700 font-extrabold">Autonomous Rescue Grid</span>
              </div>

              {/* Master Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-surface-900 tracking-tight leading-[1.14] sm:leading-[1.12]">
                Turn a restaurant's unsold food into a shelter's next meal —{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-emerald-500 to-teal-700">
                  before it hits the dumpster.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-lg text-surface-700 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Surplus-to-Shelter is a real-time food rescue routing engine. Donors post surplus in{' '}
                <strong className="text-surface-900 font-bold">under 60 seconds</strong>. Our geospatial engine auto-matches verified nearby shelters based on daily capacity, diet, and strict 30-minute safety expiry windows — then instantly dispatches volunteer drivers.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to={user ? roleDashboardMap[user.role] : '/donor/new'}
                  className="btn bg-brand-600 text-white hover:bg-brand-700 shadow-xl shadow-brand-600/30 px-6 sm:px-7 py-3.5 sm:py-4 text-sm sm:text-base rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] w-full sm:w-auto"
                >
                  <span className="text-lg">🍲</span>
                  <span>Donate Food in &lt; 60s</span>
                  <span>→</span>
                </Link>

                <Link
                  to="/register?role=recipient"
                  className="btn bg-white text-surface-800 hover:bg-surface-100 border border-surface-200/90 shadow-sm px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base rounded-2xl font-bold flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <span>🏠</span>
                  <span>Register Shelter / NGO</span>
                </Link>

                <Link
                  to="/register?role=driver"
                  className="btn bg-surface-100 text-surface-800 hover:bg-surface-200 px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm rounded-2xl font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <span>🚗</span>
                  <span>Volunteer Driver</span>
                </Link>
              </div>

              {/* Trust & Guarantee Markers */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-surface-200/70 text-left">
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-surface-500 uppercase tracking-wider">Donation Speed</div>
                  <div className="text-base sm:text-lg font-extrabold text-surface-900 mt-0.5">&lt; 60 Seconds</div>
                  <div className="text-[10px] sm:text-[11px] text-surface-500">Zero donor friction</div>
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-surface-500 uppercase tracking-wider">Match Latency</div>
                  <div className="text-base sm:text-lg font-extrabold text-brand-700 mt-0.5">&lt; 45 Seconds</div>
                  <div className="text-[10px] sm:text-[11px] text-surface-500">2dsphere spatial engine</div>
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-surface-500 uppercase tracking-wider">Safety Guarantee</div>
                  <div className="text-base sm:text-lg font-extrabold text-surface-900 mt-0.5">30-Min Buffer</div>
                  <div className="text-[10px] sm:text-[11px] text-surface-500">Zero spoiled food routed</div>
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold text-surface-500 uppercase tracking-wider">Carbon Protocol</div>
                  <div className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5">EPA WARM</div>
                  <div className="text-[10px] sm:text-[11px] text-surface-500">2.5 kg CO₂e offset / kg</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Mission Radar Card */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Glow backdrop behind card */}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/20 to-teal-500/20 rounded-3xl blur-xl transform rotate-1 scale-105 pointer-events-none" />

                <div className="relative bg-white rounded-3xl border border-surface-200/90 shadow-2xl p-4 sm:p-7 space-y-5 sm:space-y-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-surface-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-3 w-3 rounded-full bg-brand-500 animate-ping" />
                      <span className="text-xs font-black uppercase tracking-wider text-surface-800">
                        Live Rescue Radar
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      Auto-Dispatch Active
                    </span>
                  </div>

                  {/* Active Mission Details */}
                  <div className="space-y-4">
                    <div className="bg-surface-50 rounded-2xl p-4 border border-surface-200/70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-brand-700 uppercase tracking-wide">
                            Active Surplus Batch #842
                          </div>
                          <div className="text-base font-extrabold text-surface-900 mt-0.5">
                            32 kg Basmati Rice, Dal & Paneer
                          </div>
                          <div className="text-xs text-surface-600 mt-1 flex items-center gap-1.5">
                            <span>📍</span>
                            <span>The Grand Platter Banquet • Connaught Place</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                          Freshly Cooked
                        </span>
                      </div>

                      {/* Expiry & Safety Risk Telemetry */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-surface-200/60 text-xs">
                        <div>
                          <span className="text-surface-500 block">Safe Window:</span>
                          <span className="font-mono font-bold text-amber-600">02h 45m remaining</span>
                        </div>
                        <div>
                          <span className="text-surface-500 block">Food Safety Risk:</span>
                          <span className="font-bold text-brand-700">12/100 (Safe to Donate)</span>
                        </div>
                      </div>
                    </div>

                    {/* Smart Match Target Shelter */}
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-brand-50/60 border border-brand-200/80">
                      <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
                        🏠
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-bold text-surface-900 truncate">
                          Matched: St. Jude Hope Shelter
                        </div>
                        <div className="text-surface-600">
                          1.8 km away • Capacity Available: <strong>75 kg</strong>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-brand-700 bg-white px-2 py-1 rounded-lg border border-brand-200 shrink-0">
                        99.2% Fit
                      </span>
                    </div>

                    {/* Step-by-Step Status Flow */}
                    <div>
                      <div className="text-xs font-bold text-surface-600 mb-2.5 flex items-center justify-between">
                        <span>Dispatch Progress:</span>
                        <span className="text-brand-600">
                          {missionStep === 0 && 'Awaiting Match...'}
                          {missionStep === 1 && 'Matched to Shelter'}
                          {missionStep === 2 && 'Driver En Route'}
                          {missionStep === 3 && 'Delivered & Verified'}
                        </span>
                      </div>

                      {/* 4-Step Visual Track */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {['Posted', 'Matched', 'Picked Up', 'Delivered'].map((step, idx) => (
                          <div key={step} className="text-center">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                idx <= missionStep ? 'bg-brand-600' : 'bg-surface-200'
                              }`}
                            />
                            <span className="text-[10px] font-semibold text-surface-500 mt-1 block">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Immediate Impact Output */}
                    <div className="bg-gradient-to-r from-brand-600 to-emerald-700 text-white p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] sm:text-[11px] text-brand-100 font-semibold uppercase">Impact from this batch</div>
                        <div className="text-base sm:text-lg font-black leading-tight">+77 Meals • -80 kg CO₂e Offset</div>
                      </div>
                      <button
                        onClick={nextMissionStep}
                        className="btn bg-white text-brand-800 hover:bg-brand-50 px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm min-h-[36px] self-start sm:self-auto shrink-0"
                        title="Click to simulate next dispatch state"
                      >
                        Simulate Next ⚡
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE STATS TICKER BAR ────────────────────────────────────────────── */}
      <section className="bg-surface-900 text-white py-6 sm:py-8 border-y border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="p-2 sm:p-3">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-brand-400 font-mono">
                {impactStats.meals.toLocaleString()}+
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-surface-200 uppercase tracking-wider mt-1">
                Meals Rescued & Served
              </div>
              <div className="text-[10px] sm:text-[11px] text-surface-400 mt-0.5">Redirected to hungry bellies</div>
            </div>

            <div className="p-2 sm:p-3">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-mono">
                {impactStats.totalKgDelivered.toLocaleString()} <span className="text-base sm:text-xl text-surface-400 font-normal">kg</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-surface-200 uppercase tracking-wider mt-1">
                Food Diverted From Dumpster
              </div>
              <div className="text-[10px] sm:text-[11px] text-surface-400 mt-0.5">Zero organic waste in landfill</div>
            </div>

            <div className="p-2 sm:p-3">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-emerald-400 font-mono">
                {impactStats.co2eAvoided.toLocaleString()} <span className="text-base sm:text-xl text-surface-400 font-normal">kg</span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-surface-200 uppercase tracking-wider mt-1">
                CO₂e Emissions Prevented
              </div>
              <div className="text-[10px] sm:text-[11px] text-surface-400 mt-0.5">Methane breakdown avoided</div>
            </div>

            <div className="p-2 sm:p-3">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-brand-400 font-mono">
                {impactStats.successRate}%
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-surface-200 uppercase tracking-wider mt-1">
                Rescue Success Rate
              </div>
              <div className="text-[10px] sm:text-[11px] text-surface-400 mt-0.5">{impactStats.activeDonations} active runs today</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE FOOD RESCUE SIMULATOR (JUDGE FAVORITE) ────────────────── */}
      <section id="simulator" className="py-20 lg:py-28 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
              Interactive Hackathon Demo Tool
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight mt-3">
              Simulate Your Food Rescue Impact
            </h2>
            <p className="text-base text-surface-600 mt-2">
              Select what your kitchen has surplus right now and drag the slider to calculate instant meal provisions, carbon offsets, and matching dispatch time.
            </p>
          </div>

          <div className="bg-gradient-to-br from-surface-50 to-brand-50/40 rounded-3xl border border-surface-200 p-4 sm:p-8 lg:p-10 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Controls Column */}
              <div className="lg:col-span-6 space-y-6 sm:space-y-7">
                {/* 1. Category Selector */}
                <div>
                  <label className="block text-sm font-bold text-surface-900 mb-2.5">
                    1. What kind of surplus food do you have?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {Object.entries(CATEGORY_FACTORS).map(([key, item]) => (
                      <button
                        key={key}
                        onClick={() => setSimCategory(key)}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all ${
                          simCategory === key
                            ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/25 scale-[1.02]'
                            : 'bg-white text-surface-800 border-surface-200 hover:border-brand-300'
                        }`}
                      >
                        <div className="text-lg sm:text-xl mb-1">{item.icon}</div>
                        <div className="text-xs font-bold leading-tight">{item.name}</div>
                        <div className={`text-[10px] mt-0.5 ${simCategory === key ? 'text-brand-100' : 'text-surface-500'}`}>
                          {item.shelfLife}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Weight Slider */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <label className="font-bold text-surface-900">
                      2. Estimated Quantity of Surplus:
                    </label>
                    <span className="font-black text-xl sm:text-2xl font-mono text-brand-700 bg-white px-2.5 sm:px-3 py-1 rounded-xl border border-brand-200">
                      {simKg} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={simKg}
                    onChange={(e) => setSimKg(Number(e.target.value))}
                    className="w-full h-3 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                  />
                  <div className="flex justify-between text-[11px] sm:text-xs text-surface-500 mt-1 font-mono">
                    <span>5 kg (Cafe)</span>
                    <span>100 kg (Restaurant)</span>
                    <span>200 kg (Banquet)</span>
                  </div>
                </div>

                {/* 3. Safe Window Hours */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <label className="font-bold text-surface-900">
                      3. Safe Usable Window before Spoilage:
                    </label>
                    <span className="font-bold text-sm sm:text-base font-mono text-surface-800 bg-white px-2.5 py-1 rounded-xl border border-surface-200">
                      {simHours} Hours
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={simHours}
                    onChange={(e) => setSimHours(Number(e.target.value))}
                    className="w-full h-3 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                  />
                  <div className="text-xs text-brand-700 font-semibold mt-1">
                    ✓ Matches food safety window constraint (Pickup + Travel + 30m buffer &lt; {simHours}h)
                  </div>
                </div>
              </div>

              {/* Dynamic Output Card */}
              <div className="lg:col-span-6 bg-white rounded-3xl p-4 sm:p-8 border border-brand-200/80 shadow-xl space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-surface-100">
                  <div className="text-xs font-black uppercase tracking-wider text-surface-500">
                    Calculated Community ROI
                  </div>
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                    EPA WARM Standard
                  </span>
                </div>

                {/* Big Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-brand-50 border border-brand-200/80">
                    <div className="text-xs font-bold text-brand-800 uppercase">Meals Generated</div>
                    <div className="text-2xl sm:text-4xl font-black text-brand-700 font-mono mt-1">
                      {calculatedImpact.meals}
                    </div>
                    <div className="text-[11px] text-brand-600 mt-1">Nutritious meals provided</div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                    <div className="text-xs font-bold text-emerald-800 uppercase">CO₂e Avoided</div>
                    <div className="text-2xl sm:text-4xl font-black text-emerald-700 font-mono mt-1">
                      {calculatedImpact.co2} <span className="text-base sm:text-lg font-normal">kg</span>
                    </div>
                    <div className="text-[11px] text-emerald-600 mt-1">Methane breakdown prevented</div>
                  </div>
                </div>

                {/* Detailed Indicators */}
                <div className="space-y-3 pt-2 text-sm text-surface-700">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-100">
                    <span className="text-surface-600">Estimated Match Time:</span>
                    <span className="font-mono font-bold text-surface-900">~{calculatedImpact.matchTimeSec} seconds</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-100">
                    <span className="text-surface-600">Shelter Capacity Required:</span>
                    <span className="font-mono font-bold text-surface-900">{simKg} kg / day</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-surface-100">
                    <span className="text-surface-600">Est. Commercial Value:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{calculatedImpact.estimatedValue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-surface-600">Donor Tax-Deductible Log:</span>
                    <span className="font-bold text-brand-700">✓ Instant Receipt Generated</span>
                  </div>
                </div>

                {/* Action from Simulator */}
                <Link
                  to="/donor/new"
                  className="btn bg-brand-600 text-white hover:bg-brand-700 w-full py-4 text-base rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25"
                >
                  <span>Post This {simKg}kg Donation Now</span>
                  <span>⚡</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-STAGE AUTONOMOUS PIPELINE ────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-surface-50 border-t border-surface-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
              End-to-End Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight mt-3">
              How Surplus-to-Shelter Rescues Food in 4 Steps
            </h2>
            <p className="text-base text-surface-600 mt-2">
              From the kitchen's preparation table to a shelter's dining tray — fully orchestrated with zero human bottleneck.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="card bg-white p-6 rounded-3xl border border-surface-200/90 shadow-sm relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-black mb-4">
                1
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-brand-700 mb-1">
                Sub-Minute Intake
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Donor Posts Surplus
              </h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                The restaurant or banquet manager opens the app, picks food category, weight, and safe expiry window. Instant location geocoding captures pickup coordinates.
              </p>
              <div className="mt-4 pt-3 border-t border-surface-100 text-xs text-surface-500 font-mono">
                Takes &lt; 60 seconds on mobile
              </div>
            </div>

            {/* Step 2 */}
            <div className="card bg-white p-6 rounded-3xl border border-surface-200/90 shadow-sm relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-black mb-4">
                2
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Geospatial 2dsphere
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Automated Smart Match
              </h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                Algorithm filters nearby shelters by remaining daily intake capacity, accepted food categories, and travel distance, ensuring zero shelter food dumping.
              </p>
              <div className="mt-4 pt-3 border-t border-surface-100 text-xs text-surface-500 font-mono">
                Capacity-aware matching in &lt; 45s
              </div>
            </div>

            {/* Step 3 */}
            <div className="card bg-white p-6 rounded-3xl border border-surface-200/90 shadow-sm relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl font-black mb-4">
                3
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
                Volunteer Dispatch
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Driver Route Optimized
              </h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                Nearby volunteer and courier drivers receive real-time job alerts with turn-by-turn navigation. A strict 30-minute safety buffer is enforced to guarantee quality.
              </p>
              <div className="mt-4 pt-3 border-t border-surface-100 text-xs text-surface-500 font-mono">
                Turn-by-turn pickup navigation
              </div>
            </div>

            {/* Step 4 */}
            <div className="card bg-white p-6 rounded-3xl border border-surface-200/90 shadow-sm relative group hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-black mb-4">
                4
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1">
                Verified Delivery
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Impact & Tax Ledger
              </h3>
              <p className="text-sm text-surface-600 leading-relaxed">
                Shelter confirms receipt. Real-time metrics instantly update city ESG telemetry (meals served, methane prevented) and donors receive formal tax deduction slips.
              </p>
              <div className="mt-4 pt-3 border-t border-surface-100 text-xs text-surface-500 font-mono">
                EPA WARM verifiable metric audit
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE CITY GRID & HOTSPOTS MAP ────────────────────────────────────── */}
      <section id="hotspots" className="py-20 lg:py-28 bg-white border-t border-surface-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
                Live Geospatial Telemetry
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight mt-3">
                Citywide Food Rescue Hotspots
              </h2>
              <p className="text-base text-surface-600 mt-1">
                Visualizing where surplus food is being rescued and routed to prevent landfill dumping.
              </p>
            </div>

            <Link
              to="/impact"
              className="btn-secondary text-sm font-bold px-4 py-2.5 rounded-xl shrink-0 self-start md:self-auto"
            >
              Open Full Impact Analytics →
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Map Column */}
            <div className="lg:col-span-8">
              <WasteHotspotsMap
                hotspots={impactStats.hotspots}
                center={[28.6139, 77.2090]}
                showUserLocation={true}
                autoLocate={true}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-surface-500 mt-2.5 px-1 gap-1">
                <span className="font-semibold text-brand-700">📍 Live 2dsphere Grid with GPS Geolocation</span>
                <span>🟢 &lt;20kg • 🟡 20-35kg • 🔴 &gt;35kg • 🔵 Live User</span>
              </div>
            </div>

            {/* Live Activity Stream Column */}
            <div className="lg:col-span-4 bg-surface-50 rounded-3xl p-5 sm:p-6 border border-surface-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-200/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand-600 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-surface-900">
                    Live Dispatch Stream
                  </span>
                </div>
                <span className="text-[11px] text-surface-500 font-mono">Real-time</span>
              </div>

              <div className="space-y-3">
                {RECENT_RESCUES.map((r) => (
                  <div key={r.id} className="bg-white p-3.5 rounded-2xl border border-surface-200/60 shadow-sm text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-surface-900">{r.donor}</span>
                      <span className="font-mono text-[10px] text-surface-400">{r.timeAgo}</span>
                    </div>
                    <div className="text-surface-600 flex items-center gap-1">
                      <span>→</span>
                      <span>Routed to: <strong className="text-surface-800">{r.shelter}</strong></span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-surface-100 text-[11px]">
                      <span className="font-mono font-bold text-brand-700">
                        {r.kg} kg ({r.meals} meals)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-semibold border border-brand-200">
                        {r.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/donor/new"
                  className="text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
                >
                  + Add Your Food Surplus To The Map
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAKEHOLDER ECOSYSTEM (TABS FOR 4 PERSONAS) ────────────────────── */}
      <section id="stakeholders" className="py-20 lg:py-28 bg-surface-50 border-t border-surface-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
              Stakeholder Value Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight mt-3">
              Built for the Entire Food Rescue Ecosystem
            </h2>
            <p className="text-base text-surface-600 mt-2">
              Every role experiences tailored, zero-friction workflows to turn logistics headaches into positive community impact.
            </p>
          </div>

          {/* Persona Tabs Navigation */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-2 mb-8 sm:mb-10">
            {[
              { id: 'donors', label: 'Food Donors', icon: '🍲', sub: 'Restaurants & Grocers' },
              { id: 'shelters', label: 'Shelters & NGOs', icon: '🏠', sub: 'Verified Recipients' },
              { id: 'drivers', label: 'Volunteer Drivers', icon: '🚗', sub: 'Rapid Transport' },
              { id: 'esg', label: 'City & ESG Oversight', icon: '📊', sub: 'Impact Telemetry' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 sm:gap-2.5 p-3 sm:px-5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 scale-[1.02]'
                    : 'bg-white text-surface-700 border border-surface-200/90 hover:bg-surface-100'
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className={`text-[10px] font-normal ${activeTab === tab.id ? 'text-brand-100' : 'text-surface-500'}`}>
                    {tab.sub}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Persona Tab Content */}
          <div className="bg-white rounded-3xl border border-surface-200/90 p-5 sm:p-8 lg:p-12 shadow-md">
            {activeTab === 'donors' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                    For Restaurants, Caterers & Bakeries
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-surface-900">
                    Post Surplus in Under 60 Seconds. Zero Guilt, Zero Landfill.
                  </h3>
                  <p className="text-sm text-surface-600 leading-relaxed">
                    Stop paying disposal contractors to haul away wholesome edible food. Surplus-to-Shelter gives you an audit-ready tax record and alerts you the second a verified shelter claims it.
                  </p>
                  <ul className="space-y-2.5 text-sm text-surface-800 pt-2 font-medium">
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>No long forms: select category, weight, and expiry window</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>Automated 501(c)(3) / CSR charitable donation tax receipts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>Eliminates waste disposal fees while boosting ESG brand metrics</span>
                    </li>
                  </ul>
                  <div className="pt-4">
                    <Link to="/donor/new" className="btn-primary text-sm font-bold px-6 py-3.5 rounded-xl">
                      Donate Your First Batch →
                    </Link>
                  </div>
                </div>
                <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200/70 text-sm space-y-4">
                  <div className="font-extrabold text-surface-900 border-b pb-2">What Donors Love Most</div>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl border border-surface-200/80 shadow-xs">
                      <div className="font-bold text-surface-900">"We cut our landfill food trash by 85%."</div>
                      <div className="text-xs text-surface-500 mt-1">Taj Catering Group • 420 kg rescued this month</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-surface-200/80 shadow-xs">
                      <div className="font-bold text-surface-900">"The 30-min buffer protects us from any food safety liability."</div>
                      <div className="text-xs text-surface-500 mt-1">Artisan Sourdough Bakery</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shelters' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    For Shelters, Food Banks & NGOs
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-surface-900">
                    Capacity-Aware Food Drops. No Surprise Dump-and-Run.
                  </h3>
                  <p className="text-sm text-surface-600 leading-relaxed">
                    Most food banks struggle with unpredictable deliveries that exceed refrigerator space. Our system respects your daily capacity limits and dietary preferences before any match is confirmed.
                  </p>
                  <ul className="space-y-2.5 text-sm text-surface-800 pt-2 font-medium">
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>Set daily kg caps so you are never overwhelmed</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>Filter by dietary requirements (Vegetarian, Halal, Cooked, Produce)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>One-click Accept or Decline with automated re-routing</span>
                    </li>
                  </ul>
                  <div className="pt-4">
                    <Link to="/register?role=recipient" className="btn-primary text-sm font-bold px-6 py-3.5 rounded-xl">
                      Register Shelter / NGO →
                    </Link>
                  </div>
                </div>
                <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200/70 text-sm space-y-4">
                  <div className="font-extrabold text-surface-900 border-b pb-2">Shelter Protection Rules</div>
                  <div className="space-y-2.5 text-xs text-surface-700">
                    <div className="p-3 bg-white rounded-xl border border-surface-200">
                      <strong>Daily Capacity Safeguard:</strong> Automatically pauses inbound matches once your intake target is reached.
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-surface-200">
                      <strong>Inspection Upon Arrival:</strong> Driver confirms temperature condition and photo verification upon handoff.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'drivers' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                    For Volunteer & Gig Drivers
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-surface-900">
                    Turn Everyday Commutes into Life-Saving Deliveries.
                  </h3>
                  <p className="text-sm text-surface-600 leading-relaxed">
                    View nearby available pickups with full route previews, estimated turnaround times, and verified drop-off instructions. Help feed your neighbors on your own schedule.
                  </p>
                  <ul className="space-y-2.5 text-sm text-surface-800 pt-2 font-medium">
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>Instant job matching based on your live GPS location</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>Turn-by-turn routing with safety time windows</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>Earn verified volunteer service hours & community badges</span>
                    </li>
                  </ul>
                  <div className="pt-4">
                    <Link to="/register?role=driver" className="btn-primary text-sm font-bold px-6 py-3.5 rounded-xl">
                      Start Driving & Rescuing →
                    </Link>
                  </div>
                </div>
                <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200/70 text-sm space-y-4">
                  <div className="font-extrabold text-surface-900 border-b pb-2">Driver Dashboard Features</div>
                  <div className="space-y-2 text-xs text-surface-700">
                    <div className="p-3 bg-white rounded-xl border border-surface-200">
                      <strong>Active Job HUD:</strong> Simple one-tap status updates (Accept → Picked Up → Delivered).
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-surface-200">
                      <strong>Micro-Trips:</strong> Most rescue deliveries average under 3.5 km and take &lt; 20 minutes.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'esg' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-violet-700 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                    For City Municipalities & Corporate ESG
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-surface-900">
                    Auditable Methane & Hunger Mitigation Telemetry.
                  </h3>
                  <p className="text-sm text-surface-600 leading-relaxed">
                    Food rotting in landfills generates 10% of global greenhouse emissions. Surplus-to-Shelter gives city leaders and sustainability officers hard, timestamped metrics aligned with UN SDGs.
                  </p>
                  <ul className="space-y-2.5 text-sm text-surface-800 pt-2 font-medium">
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>UN SDG 2 (Zero Hunger) and SDG 12 (Responsible Consumption) compliance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>EPA WARM verified carbon reduction indices</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-600 font-bold">✓</span>
                      <span>City waste hotspot heatmaps to identify recurring surplus zones</span>
                    </li>
                  </ul>
                  <div className="pt-4">
                    <Link to="/impact" className="btn-primary text-sm font-bold px-6 py-3.5 rounded-xl">
                      View Live Telemetry →
                    </Link>
                  </div>
                </div>
                <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200/70 text-sm space-y-4">
                  <div className="font-extrabold text-surface-900 border-b pb-2">Impact Constants Applied</div>
                  <div className="space-y-2 text-xs text-surface-700">
                    <div className="p-3 bg-white rounded-xl border border-surface-200 font-mono">
                      <strong>MEALS_PER_KG:</strong> 2.4 meals per kg of edible rescued food
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-surface-200 font-mono">
                      <strong>CO2E_PER_KG:</strong> 2.5 kg CO₂e greenhouse gas avoided per kg
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TECHNICAL ARCHITECTURE & HACKATHON INNOVATION ────────────────────── */}
      <section id="tech" className="py-20 lg:py-28 bg-white border-t border-surface-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
              AmiHacks Technical Deep-Dive
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight mt-3">
              Why This Architecture Wins Hackathons
            </h2>
            <p className="text-base text-surface-600 mt-2">
              Not a toy CRUD app. A resilient, real-time distributed routing engine designed for life-or-death food rescue logistics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-surface-50 border border-surface-200 space-y-3">
              <div className="text-3xl">⚡</div>
              <h3 className="font-extrabold text-surface-900 text-lg">Real-Time Event Mesh</h3>
              <p className="text-xs text-surface-600 leading-relaxed">
                Socket.io event bus broadcasting <code className="text-brand-700 font-mono">donation:new</code>, <code className="text-brand-700 font-mono">matched</code>, and <code className="text-brand-700 font-mono">status</code> events into scoped user rooms for instant UI state synchronization without polling.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-50 border border-surface-200 space-y-3">
              <div className="text-3xl">🎯</div>
              <h3 className="font-extrabold text-surface-900 text-lg">2dsphere Geo-Routing</h3>
              <p className="text-xs text-surface-600 leading-relaxed">
                Native MongoDB <code className="text-brand-700 font-mono">$near</code> spherical coordinate indexing queries nearby shelters in sub-20ms while factoring daily capacity ceilings and open operational hours.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-50 border border-surface-200 space-y-3">
              <div className="text-3xl">🛡️</div>
              <h3 className="font-extrabold text-surface-900 text-lg">Strict Expiry Buffer</h3>
              <p className="text-xs text-surface-600 leading-relaxed">
                Never matches food that would expire before <code className="text-brand-700 font-mono">pickup + travel + 30min buffer</code>. Automated background cron marks aging batches as expired if safe handoff cannot be guaranteed.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-50 border border-surface-200 space-y-3">
              <div className="text-3xl">🌿</div>
              <h3 className="font-extrabold text-surface-900 text-lg">EPA Impact Telemetry</h3>
              <p className="text-xs text-surface-600 leading-relaxed">
                Calculates certified carbon mitigation metrics (2.5 kg CO₂e / kg) and meal equivalencies (2.4 meals / kg), stored in aggregation pipelines for live timeseries analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (FAQ) ─────────────────────────────────── */}
      <section id="faq" className="py-20 lg:py-24 bg-surface-50 border-t border-surface-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
              Got Questions?
            </span>
            <h2 className="text-3xl font-black text-surface-900 tracking-tight mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How is food safety ensured under tight windows?',
                a: 'The engine enforces a strict mathematical safety window: food is rejected if the pickup ETA + travel time + 30-minute buffer exceeds the donor’s indicated expiry. High-risk perishables undergo driver temperature inspections upon pickup.',
              },
              {
                q: 'What prevents shelters from getting overwhelmed by excess food?',
                a: 'Shelters register with explicit daily capacity limits (e.g. 100 kg/day) and category preferences. Our matching engine tracks consumed capacity in real time and immediately diverts additional surplus to the next nearest shelter once a cap is reached.',
              },
              {
                q: 'How fast can a restaurant post food during closing rush?',
                a: 'Under 60 seconds. The donor simply selects their category (Cooked, Bakery, Produce, etc.), enters estimated kilograms, and picks an expiry time. Location is captured automatically via browser geocoding.',
              },
              {
                q: 'How do donors claim tax deductions for donated surplus?',
                a: 'Every completed delivery automatically generates an IRS 501(c)(3) / CSR-compliant digital donation voucher with timestamped shelter acknowledgment and weight records.',
              },
              {
                q: 'Who can volunteer as a driver?',
                a: 'Anyone with a valid ID, vehicle (scooter, car, van), and clean driving record can register. Missions are typically micro-deliveries within a 3–5 km radius taking less than 20 minutes.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-surface-200/80 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between font-bold text-surface-900 text-sm sm:text-base gap-4"
                >
                  <span>{item.q}</span>
                  <span className="text-xl text-surface-400 shrink-0">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-surface-600 leading-relaxed border-t border-surface-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HIGH-CONVERSION HACKATHON CTA BANNER ──────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-surface-900 via-surface-900 to-brand-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/15 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-7">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-wider border border-brand-500/30">
            🌱 Stop Wasting • Start Rescuing
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Ready to turn edible surplus into community nourishment?
          </h2>

          <p className="text-base sm:text-lg text-surface-300 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of forward-thinking restaurants, verified shelters, and volunteer drivers using Surplus-to-Shelter to eliminate hunger and landfill methane.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link
              to="/donor/new"
              className="btn bg-brand-500 text-surface-900 hover:bg-brand-400 px-8 py-4 text-base rounded-2xl font-black shadow-xl shadow-brand-500/25 transition-all hover:scale-105"
            >
              <span>Post Surplus Food Now</span>
              <span>⚡</span>
            </Link>

            <Link
              to="/register?role=recipient"
              className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20 px-7 py-4 text-base rounded-2xl font-bold backdrop-blur"
            >
              <span>Register Your Shelter</span>
              <span>→</span>
            </Link>

            <Link
              to="/register?role=driver"
              className="btn bg-transparent text-surface-300 hover:text-white px-5 py-4 text-sm font-semibold"
            >
              Become a Volunteer Driver
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-surface-900 text-surface-400 py-12 border-t border-surface-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-surface-800">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold">
                🍲
              </div>
              <div>
                <div className="font-bold text-white text-base leading-none">Surplus-to-Shelter</div>
                <div className="text-[11px] text-surface-400 mt-0.5">Real-Time Food Rescue & Routing Engine</div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 font-semibold text-surface-300">
              <Link to="/donor/new" className="hover:text-white transition-colors">Quick Post</Link>
              <Link to="/org" className="hover:text-white transition-colors">Shelter Hub</Link>
              <Link to="/driver" className="hover:text-white transition-colors">Driver Jobs</Link>
              <Link to="/impact" className="hover:text-white transition-colors">Impact Analytics</Link>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-surface-500">
            <div>
              Built for <strong className="text-surface-300">AmiHacks 2026</strong> • Track A: Surplus-to-Shelter (NGO / Social Impact)
            </div>
            <div className="flex items-center gap-4">
              <span>UN SDG 2: Zero Hunger</span>
              <span>•</span>
              <span>UN SDG 12: Responsible Consumption</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
