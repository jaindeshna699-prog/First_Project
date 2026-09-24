import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((res) => {
        const u = {
          id: res.data._id || res.data.id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role,
          phone: res.data.phone,
          location: res.data.location,
        };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    try {
      const meRes = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.token}` } });
      const u = {
        id: meRes.data._id || meRes.data.id,
        name: meRes.data.name,
        email: meRes.data.email,
        role: meRes.data.role,
        phone: meRes.data.phone,
        location: meRes.data.location,
      };
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    }
  }, []);

  const register = useCallback(async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
