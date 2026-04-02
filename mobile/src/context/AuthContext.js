import React, { createContext, useState, useContext, useEffect } from 'react';
import storage from '../utils/storage';
import {
  login as apiLogin,
  register as apiRegister,
  googleLogin as apiGoogleLogin,
  googleUserInfoLogin as apiGoogleUserInfoLogin,
  getMe,
  logout as apiLogout,
} from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStoredAuth(); }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        const res = await getMe();
        setUser(res.data.data);
      }
    } catch {
      await storage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const _saveSession = async (token, user) => {
    await storage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    await _saveSession(res.data.token, res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await apiRegister({ name, email, password });
    await _saveSession(res.data.token, res.data.user);
    return res.data;
  };

  // Native (iOS/Android) — verify idToken on backend
  const loginWithGoogle = async (idToken) => {
    const res = await apiGoogleLogin(idToken);
    await _saveSession(res.data.token, res.data.user);
    return res.data;
  };

  // Web — send userInfo object fetched via accessToken
  const loginWithGoogleUserInfo = async (userInfo) => {
    const res = await apiGoogleUserInfoLogin(userInfo);
    await _saveSession(res.data.token, res.data.user);
    return res.data;
  };

  const logout = async () => {
    // Always clear local state regardless of backend/storage errors
    try { await apiLogout(); } catch { /* token may already be expired — that's fine */ }
    try { await storage.removeItem('token'); } catch { /* ignore storage errors */ }
    setToken(null);
    setUser(null);  // ← triggers AppNavigator to switch to AuthStack (login page)
  };

  const refreshUser = async () => {
    const res = await getMe();
    setUser(res.data.data);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, loginWithGoogleUserInfo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
