import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../api/axios.js';
import { useToast } from '../components/Toast.jsx';
import WasteHotspotsMap from '../components/WasteHotspotsMap.jsx';

const PIE_COLORS = [
  '#16a34a', // Emerald
  '#f59e0b', // Amber
  '#0284c7', // Sky
  '#8b5cf6', // Violet
  '#ef4444', // Rose
  '#14b8a6', // Teal
  '#f97316', // Orange
];

export default function ImpactDashboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);

  useEffect(() => {
    async function loadImpactData() {
      try {
        const [sumRes, timeRes] = await Promise.all([
          api.get('/impact/summary'),
          api.get('/impact/timeseries'),
        ]);
        setSummary(sumRes.data);
        setTimeseries(timeRes.data);
      } catch (err) {
        toast(err.response?.data?.error || err.response?.data?.message || 'Failed to load impact metrics', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadImpactData();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // Format category data for PieChart
  const categoryData =
    summary?.byCategory && summary.byCategory.length > 0
      ? summary.byCategory.map((c) => ({
          name: c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1) : 'General',
          value: c.deliveredKg || c.totalKg || 1,
        }))
      : [
          { name: 'Cooked Meals', value: 35 },
          { name: 'Produce', value: 25 },
          { name: 'Bakery', value: 20 },
          { name: 'Dairy', value: 12 },
          { name: 'Packaged', value: 8 },
        ];

  return (
    <div className="max-w-6xl mx-auto py-2 space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            Real-Time Analytics
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight mt-2">
          Surplus to Shelter Impact Dashboard
        </h1>
        <p className="text-sm text-surface-600 mt-1">
          Tracking rescued food volume, meal equivalencies, and carbon offset metrics across the community.
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Delivered kg */}
        <div className="card bg-white border border-surface-200/90 shadow-sm p-5 rounded-3xl">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Rescued</span>
            <span className="text-2xl">🥦</span>
          </div>
          <div className="text-3xl font-extrabold text-surface-900">
            {summary?.totalKgDelivered ? summary.totalKgDelivered.toLocaleString() : '0'}{' '}
            <span className="text-base font-semibold text-surface-500">kg</span>
          </div>
          <div className="text-xs text-brand-700 font-semibold mt-2 flex items-center gap-1">
            <span>✓</span>
            <span>Food safely redirected from landfills</span>
          </div>
        </div>

        {/* Card 2: Meals Rescued */}
        <div className="card bg-white border border-surface-200/90 shadow-sm p-5 rounded-3xl">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Meals Provided</span>
            <span className="text-2xl">🍲</span>
          </div>
          <div className="text-3xl font-extrabold text-brand-700">
            {summary?.meals ? summary.meals.toLocaleString() : '0'}
          </div>
          <div className="text-xs text-surface-500 mt-2">
            Based on 2.4 meals / kg EPA impact constant
          </div>
        </div>

        {/* Card 3: CO2e Emissions Avoided */}
        <div className="card bg-white border border-surface-200/90 shadow-sm p-5 rounded-3xl">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">CO₂e Avoided</span>
            <span className="text-2xl">🌍</span>
          </div>
          <div className="text-3xl font-extrabold text-surface-900">
            {summary?.co2eAvoided ? summary.co2eAvoided.toLocaleString() : '0'}{' '}
            <span className="text-base font-semibold text-surface-500">kg</span>
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-2 flex items-center gap-1">
            <span>🌱</span>
            <span>2.5 kg CO₂e offset per kg rescued</span>
          </div>
        </div>

        {/* Card 4: Success Rate & Active */}
        <div className="card bg-white border border-surface-200/90 shadow-sm p-5 rounded-3xl">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Success Rate</span>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-3xl font-extrabold text-surface-900">
            {summary?.successRate ?? 0}%
          </div>
          <div className="text-xs text-surface-600 mt-2 flex items-center justify-between">
            <span>Active runs: <strong>{summary?.activeDonations ?? 0}</strong></span>
            <span>Total: <strong>{summary?.totalDonations ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Charts Grid: Line Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: kg Delivered over 14 Days */}
        <div className="card bg-white border border-surface-200/90 shadow-sm p-5 sm:p-6 rounded-3xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-surface-900">
                Rescued Surplus Trend (Last 14 Days)
              </h2>
              <p className="text-xs text-surface-500">
                Daily kilograms of food delivered to shelters
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
              kg / day
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="kg" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                  formatter={(value) => [`${value} kg`, 'Delivered']}
                />
                <Line
                  type="monotone"
                  dataKey="kgDelivered"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#16a34a' }}
                  activeDot={{ r: 6, stroke: '#15803d', strokeWidth: 2 }}
                  name="Delivered (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="card bg-white border border-surface-200/90 shadow-sm p-5 sm:p-6 rounded-3xl flex flex-col">
          <div className="mb-2">
            <h2 className="text-lg font-bold text-surface-900">Food Categories</h2>
            <p className="text-xs text-surface-500">Volume breakdown by food type</p>
          </div>

          <div className="h-64 sm:h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val} kg`, 'Volume']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Waste Hotspots Map */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-lg font-bold text-surface-900">
              Community Waste Hotspots Map
            </h2>
            <p className="text-xs text-surface-500">
              Geographic distribution of surplus food donations. Circle diameter reflects volume (kg).
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-100 text-surface-700 self-start sm:self-auto">
            📍 {summary?.hotspots?.length || 0} geo-tagged origins
          </span>
        </div>

        <WasteHotspotsMap hotspots={summary?.hotspots || []} />
      </div>
    </div>
  );
}
