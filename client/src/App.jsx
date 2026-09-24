import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Landing from './pages/Landing.jsx';
import QuickPost from './pages/QuickPost.jsx';
import MyDonations from './pages/MyDonations.jsx';
import OrgDashboard from './pages/OrgDashboard.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import ImpactDashboard from './pages/ImpactDashboard.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Donor Routes */}
              <Route
                path="/donor"
                element={
                  <ProtectedRoute allowedRoles={['donor']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/donor/new" replace />} />
                <Route path="new" element={<QuickPost />} />
                <Route path="donations" element={<MyDonations />} />
              </Route>

              {/* Recipient / Org Routes */}
              <Route
                path="/org"
                element={
                  <ProtectedRoute allowedRoles={['recipient']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<OrgDashboard />} />
                <Route path="incoming" element={<OrgDashboard />} />
                <Route path="settings" element={<OrgDashboard />} />
              </Route>

              {/* Driver Routes */}
              <Route
                path="/driver"
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DriverDashboard />} />
                <Route path="active" element={<DriverDashboard />} />
              </Route>

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ImpactDashboard />} />
                <Route path="impact" element={<ImpactDashboard />} />
              </Route>

              {/* Shared Impact Page for Authenticated Users */}
              <Route
                path="/impact"
                element={
                  <ProtectedRoute allowedRoles={['donor', 'recipient', 'driver', 'admin']}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ImpactDashboard />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
