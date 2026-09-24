import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../components/Toast.jsx';
import StatusStepper from '../components/StatusStepper.jsx';

export default function MyDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const socket = useSocket();
  const toast = useToast();

  const fetchDonations = useCallback(async () => {
    try {
      const { data } = await api.get('/donations/mine');
      setDonations(data);
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Failed to load donations', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  // Socket listener for live status updates and stepper progression
  useEffect(() => {
    if (!socket) return;

    const handleStatus = (data) => {
      setDonations((prev) =>
        prev.map((d) => {
          if (d._id === data.donationId) {
            const updatedTimeline = d.timeline ? [...d.timeline] : [];
            updatedTimeline.push({ status: data.status, at: new Date().toISOString() });
            return { ...d, status: data.status, timeline: updatedTimeline };
          }
          return d;
        })
      );
    };

    const handleMatched = (data) => {
      setDonations((prev) =>
        prev.map((d) => {
          if (d._id === data.donationId) {
            const updatedTimeline = d.timeline ? [...d.timeline] : [];
            updatedTimeline.push({ status: 'matched', at: new Date().toISOString() });
            return { ...d, status: 'matched', timeline: updatedTimeline };
          }
          return d;
        })
      );
    };

    socket.on('donation:status', handleStatus);
    socket.on('donation:matched', handleMatched);

    return () => {
      socket.off('donation:status', handleStatus);
      socket.off('donation:matched', handleMatched);
    };
  }, [socket]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this surplus donation?')) return;
    setCancellingId(id);
    try {
      const { data } = await api.patch(`/donations/${id}/cancel`);
      setDonations((prev) => prev.map((d) => (d._id === id ? data : d)));
      toast('Donation cancelled successfully', 'info');
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Could not cancel donation', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const canCancel = (status) => !['picked_up', 'delivered', 'cancelled', 'expired'].includes(status);

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">My Donations</h1>
          <p className="text-sm text-surface-600 mt-0.5">Live tracking for all dispatched food surplus</p>
        </div>
        <Link to="/donor/new" className="btn-primary py-2.5 px-4 text-sm">
          + Quick Post
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : donations.length === 0 ? (
        <div className="card text-center py-14 bg-white border border-surface-200/80 rounded-3xl">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-bold text-surface-800">No surplus donations yet</h3>
          <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
            Ready to help? Post your surplus food in under 60 seconds and we will auto-match nearby shelters.
          </p>
          <Link to="/donor/new" className="btn-primary inline-flex mt-5">
            Post First Donation
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((item) => {
            const cancellable = canCancel(item.status);
            const score = item.riskScore ?? 0;
            const isUrgent = score > 60;

            return (
              <div
                key={item._id}
                className="bg-white rounded-3xl border border-surface-200/90 shadow-sm p-5 sm:p-6 transition-all hover:shadow-md"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-surface-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-surface-900">{item.title}</h2>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-100 text-surface-700 capitalize">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-surface-500">
                      <span>Weight: <strong className="text-surface-700">{item.quantityKg} kg</strong></span>
                      <span>Expires: <strong className="text-surface-700">{new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</strong></span>
                      <span>Posted: {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    {/* Risk Score Pill */}
                    <div
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        isUrgent
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : score > 35
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      Risk: {score}/100
                    </div>

                    {/* Cancel Button */}
                    {cancellable && (
                      <button
                        type="button"
                        disabled={cancellingId === item._id}
                        onClick={() => handleCancel(item._id)}
                        className="text-xs font-semibold px-3 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-50"
                      >
                        {cancellingId === item._id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Description if present */}
                {item.description && (
                  <p className="text-xs text-surface-600 mt-2 bg-surface-50 p-2.5 rounded-xl border border-surface-100">
                    <strong className="text-surface-700">Notes:</strong> {item.description}
                  </p>
                )}

                {/* Live Status Stepper */}
                <div className="mt-4 pt-1">
                  <StatusStepper status={item.status} timeline={item.timeline} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
