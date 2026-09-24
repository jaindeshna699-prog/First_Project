import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from './Toast.jsx';

const ROLE_NAV = {
  donor: [
    { to: '/donor/new', label: 'Quick Post', icon: '⚡' },
    { to: '/donor/donations', label: 'My Donations', icon: '📋' },
    { to: '/impact', label: 'Impact Stats', icon: '📈' },
  ],
  recipient: [
    { to: '/org', label: 'Dashboard', icon: '🏢', end: true },
    { to: '/org/incoming', label: 'Incoming Food', icon: '📥' },
    { to: '/impact', label: 'Impact Stats', icon: '📈' },
  ],
  driver: [
    { to: '/driver', label: 'Available Jobs', icon: '🚗', end: true },
    { to: '/driver/active', label: 'Active Runs', icon: '📦' },
    { to: '/impact', label: 'Impact Stats', icon: '📈' },
  ],
  admin: [
    { to: '/admin', label: 'Impact Analytics', icon: '📈', end: true },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const onMatched = (data) => {
      toast(`Donation matched: "${data.title || 'Donation'}" matched with a recipient org!`, 'success');
    };

    const onStatus = (data) => {
      const formatted = (data.status || '').replace('_', ' ');
      toast(`Status update: "${data.title || 'Donation'}" is now ${formatted}`, 'info');
    };

    socket.on('donation:matched', onMatched);
    socket.on('donation:status', onStatus);

    return () => {
      socket.off('donation:matched', onMatched);
      socket.off('donation:status', onStatus);
    };
  }, [socket, toast]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = ROLE_NAV[user?.role] || [];

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-surface-200/80 p-5 shrink-0">
        <Link to="/" className="flex items-center gap-3 mb-8 px-2 hover:opacity-90 transition-opacity">
          <div className="h-10 w-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-brand-600/30">
            🌱
          </div>
          <div>
            <div className="font-bold text-base text-surface-900 leading-tight">Surplus to Shelter</div>
            <div className="text-xs text-surface-500 capitalize">{user?.role} Portal</div>
          </div>
        </Link>

        {/* Sidebar Nav */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-semibold text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-surface-100">
          <div className="px-2 py-1 mb-3">
            <div className="font-semibold text-sm text-surface-900 truncate">{user?.name}</div>
            <div className="text-xs text-surface-500 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full btn-secondary py-3 text-sm justify-start px-3 text-surface-700 min-h-[48px]"
          >
            <span className="text-base">🚪</span>
            <span className="font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-surface-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <div>
            <span className="font-bold text-surface-900 text-base block leading-tight">Surplus to Shelter</span>
            <span className="text-xs text-surface-500 capitalize">{user?.role}</span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface-100 text-surface-700 min-h-[44px]"
        >
          Sign Out
        </button>
      </header>

      {/* Mobile Bottom Navigation */}
      {navItems.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 px-3 py-2 flex justify-around z-40">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 rounded-xl text-xs font-semibold transition-colors min-h-[48px] justify-center ${isActive ? 'text-brand-600 bg-brand-50' : 'text-surface-600'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
