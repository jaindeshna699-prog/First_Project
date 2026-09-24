import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const ROLES = [
  { id: 'donor', title: 'Food Donor', desc: 'Restaurants, events, bakeries' },
  { id: 'recipient', title: 'Recipient Org', desc: 'Shelters, NGOs, food banks' },
  { id: 'driver', title: 'Driver Dispatch', desc: 'Volunteer or courier transport' },
  { id: 'admin', title: 'Administrator', desc: 'System monitor and oversight' },
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('donor');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ name, email, password, role, phone: phone || undefined });
      toast('Account created successfully!', 'success');
      const rolePaths = { donor: '/donor', recipient: '/org', driver: '/driver', admin: '/admin' };
      navigate(rolePaths[role] || '/donor');
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-surface-200/80 p-6 sm:p-8">
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
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Join Surplus to Shelter</h1>
          <p className="text-sm text-surface-700 mt-1">Select your role and start rescuing surplus food</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">Select Your Role</label>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all min-h-[56px] ${
                    role === r.id
                      ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-sm'
                      : 'border-surface-200 hover:border-surface-300 text-surface-700 bg-white'
                  }`}
                >
                  <div className="font-semibold text-sm">{r.title}</div>
                  <div className="text-xs text-surface-500 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">Organization / Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Green Bakery or John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-800 mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@domain.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Min 6 chars"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-1.5">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="+1 555-0199"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-3">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-surface-700 mt-5">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
