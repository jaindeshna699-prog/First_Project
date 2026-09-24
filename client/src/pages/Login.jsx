import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast('Signed in successfully', 'success');
      const rolePaths = { donor: '/donor', recipient: '/org', driver: '/driver', admin: '/admin' };
      navigate(rolePaths[user.role] || '/donor');
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-surface-200/80 p-6 sm:p-8">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-700 hover:text-brand-600 transition-colors">
            <span>←</span>
            <span>Back to Home</span>
          </Link>
        </div>
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3 text-2xl font-bold">
            🌱
          </div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Surplus to Shelter</h1>
          <p className="text-sm text-surface-700 mt-1">Sign in to manage and dispatch surplus food</p>
        </div>

        {/* Quick Demo Credentials */}
        <div className="mb-6 p-3 rounded-2xl bg-surface-50 border border-surface-200/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-surface-700 mb-2">
            🏆 Judge Quick Demo Fill:
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => { setEmail('donor1@example.com'); setPassword('password123'); }}
              className="text-xs py-1.5 px-2 bg-white rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50 text-surface-700 font-medium text-left"
            >
              🍲 Donor
            </button>
            <button
              type="button"
              onClick={() => { setEmail('org1@shelter.org'); setPassword('password123'); }}
              className="text-xs py-1.5 px-2 bg-white rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50 text-surface-700 font-medium text-left"
            >
              🏢 Shelter
            </button>
            <button
              type="button"
              onClick={() => { setEmail('driver1@dispatch.com'); setPassword('password123'); }}
              className="text-xs py-1.5 px-2 bg-white rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50 text-surface-700 font-medium text-left"
            >
              🚗 Driver
            </button>
            <button
              type="button"
              onClick={() => { setEmail('admin@shelter.org'); setPassword('password123'); }}
              className="text-xs py-1.5 px-2 bg-white rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50 text-surface-700 font-medium text-left"
            >
              📈 Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="donor@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-surface-700 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
