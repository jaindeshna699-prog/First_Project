import { useAuth } from '../context/AuthContext.jsx';

export default function PlaceholderDashboard({ title, description }) {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">{title}</h1>
        <p className="text-sm text-surface-600 mt-1">
          {description || `Logged in as ${user?.name} (${user?.role})`}
        </p>
      </div>

      <div className="card text-center py-12 px-6 bg-white border border-surface-200/80 rounded-3xl">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-600 mb-4 text-2xl">
          🏗️
        </div>
        <h2 className="text-lg font-bold text-surface-900">{title} Portal</h2>
        <p className="text-sm text-surface-500 mt-1 max-w-md mx-auto">
          This module is ready for workflow implementation. All role guards, socket connections, and layout navigation are configured.
        </p>
      </div>
    </div>
  );
}
