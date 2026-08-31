import { createContext, useContext, useState, useEffect } from 'react';
import { getMeApi, loginApi, logoutApi } from '../services/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dl_token');
    if (token) {
      getMeApi()
        .then((res) => setUser(res.data.data))
        .catch(() => {
          localStorage.removeItem('dl_token');
          localStorage.removeItem('dl_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier, password) => {
    const res = await loginApi({ identifier, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('dl_token', token);
    localStorage.setItem('dl_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try { await logoutApi(); } catch (_) {}
    localStorage.removeItem('dl_token');
    localStorage.removeItem('dl_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
