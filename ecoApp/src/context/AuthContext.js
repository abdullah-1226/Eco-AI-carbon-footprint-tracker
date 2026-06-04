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
      const storedToken  = await storage.getItem('token');
      const cachedUser   = await storage.getItem('cached_user');

      if (!storedToken) return;

      setToken(storedToken);

      // Show cached user instantly — no waiting for network
      if (cachedUser) {
        try { setUser(JSON.parse(cachedUser)); } catch {}
      }

      // Verify token with backend in background
      try {
        const res          = await getMe();
        const currentToken = await storage.getItem('token');
        if (currentToken === storedToken) {
          const freshUser = res.data.data;
          setUser(freshUser);
          await storage.setItem('cached_user', JSON.stringify(freshUser));
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          // Token genuinely expired/invalid → force re-login
          await storage.removeItem('token');
          await storage.removeItem('cached_user');
          setToken(null);
          setUser(null);
        }
        // Any other error (network down, backend starting, timeout)
        // → keep cached user, don't log them out
      }
    } catch {
      // Storage read failure — ignore, don't log out
    } finally {
      setLoading(false);
    }
  };

  const _saveSession = async (token, user) => {
    await storage.setItem('token', token);
    await storage.setItem('cached_user', JSON.stringify(user));
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

  // Universal — backend OAuth flow returns token + user directly
  // Saves token first, then fetches fresh user data from MongoDB
  const loginWithGoogleToken = async (token, user) => {
    // Save token immediately so getMe() interceptor picks it up
    await storage.setItem('token', token);
    setToken(token);
    setUser(user); // show immediately from URL params for instant UX
    // Then fetch fresh, authoritative data from MongoDB
    try {
      const res = await getMe();
      setUser(res.data.data);
    } catch {
      // If getMe fails, URL-param user is still set — not a critical error
    }
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
    try { await storage.removeItem('token'); } catch {}
    try { await storage.removeItem('cached_user'); } catch {}
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await getMe();
    const freshUser = res.data.data;
    setUser(freshUser);
    await storage.setItem('cached_user', JSON.stringify(freshUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, loginWithGoogleUserInfo, loginWithGoogleToken, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
