import axios from 'axios';
import storage from '../utils/storage';
import { Platform } from 'react-native';

const PROD_URL = 'https://eco-ai-carbon-footprint-tracker-backend.onrender.com/api';

const BASE_URL = Platform.OS === 'web'
  ? (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3000/api'
      : PROD_URL)
  : (__DEV__
      ? 'http://localhost:3000/api'
      : PROD_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────
export const register        = (data)        => api.post('/auth/register', data);
export const checkEmail      = (email)       => api.get('/auth/check-email', { params: { email } });
export const login           = (data)        => api.post('/auth/login', data);
export const googleLogin         = (idToken)   => api.post('/auth/google', { idToken });
export const googleUserInfoLogin = (userInfo)  => api.post('/auth/google/userinfo', { userInfo });
export const forgotPassword  = (email)       => api.post('/auth/forgotpassword', { email });
export const resetPassword   = (token, password) => api.put(`/auth/resetpassword/${token}`, { password });
export const logout          = ()            => api.get('/auth/logout');
export const getMe           = ()            => api.get('/auth/me');
export const updateDetails   = (data)        => api.put('/auth/updatedetails', data);
export const updatePassword  = (data)        => api.put('/auth/updatepassword', data);

// ─── Posts ───────────────────────────────────────────────────────────────────
export const getPosts        = (params)      => api.get('/posts', { params });
export const getPost         = (id)          => api.get(`/posts/${id}`);
export const createPost      = (data)        => api.post('/posts', data);
export const updatePost      = (id, data)    => api.put(`/posts/${id}`, data);
export const deletePost      = (id)          => api.delete(`/posts/${id}`);
export const likePost        = (id)          => api.put(`/posts/${id}/like`);
export const getPostsByUser  = (userId)      => api.get(`/posts/user/${userId}`);

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard      = ()          => api.get('/dashboard');
export const getDashboardStats = ()          => api.get('/dashboard/stats');
export const getAdminDashboard = ()          => api.get('/dashboard/admin');

// ─── Activities ───────────────────────────────────────────────────────────────
export const logActivity        = (data)         => api.post('/activities', data);
export const analyzeScenario    = (data)         => api.post('/activities/analyze-scenario', data);
export const getActivities      = (params)       => api.get('/activities', { params });
export const getActivitySummary = ()             => api.get('/activities/summary');
export const deleteActivity     = (id)           => api.delete(`/activities/${id}`);
export const getLeaderboard     = ()             => api.get('/activities/leaderboard');
export const getEmissionFactors = ()             => api.get('/activities/emission-factors');
export const getAISuggestions   = ()             => api.get('/activities/suggestions');

// ─── Maps ─────────────────────────────────────────────────────────────────────
export const getDistance        = (data)         => api.post('/maps/distance', data);
export const getAutocomplete    = (input)        => api.get('/maps/autocomplete', { params: { input } });
export const geocodeSearch      = (input)        => api.get('/maps/autocomplete', { params: { input } });
export const getNearbyPlaces    = (lat, lng, type, query = '') => api.get('/maps/nearby',      { params: { lat, lng, type, query } });
export const getRealNearbyPlaces= (lat, lng, type, query = '') => api.get('/maps/real-nearby', { params: { lat, lng, type, query } });
export const textSearchPlaces   = (q, lat, lng)             => api.get('/maps/text-search',  { params: { q, lat, lng } });

// ─── Chatbot ──────────────────────────────────────────────────────────────────
export const sendChatMessage    = (message, history) => api.post('/chatbot', { message, history });

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const getAlerts          = (params)       => api.get('/alerts', { params });
export const getUnreadCount     = ()             => api.get('/alerts/unread-count');
export const markAlertRead      = (id)           => api.put(`/alerts/${id}/read`);
export const markAllAlertsRead  = ()             => api.put('/alerts/read-all');
export const deleteAlert        = (id)           => api.delete(`/alerts/${id}`);

// ─── Carbon Offset ────────────────────────────────────────────────────────────
export const getOffsetPrograms  = ()             => api.get('/offset/programs');
export const contributeOffset   = (data)         => api.post('/offset/contribute', data);
export const getOffsetBalance   = ()             => api.get('/offset/balance');
export const getOffsetHistory   = ()             => api.get('/offset/history');

// ─── Rejuvenate / Real-time Patch API offset ──────────────────────────────────
export const checkEmissionLimit = ()             => api.get('/offset/check-limit');
export const getCommunityGoal   = ()             => api.get('/offset/community-goal');
export const getPatchProjects   = ()             => api.get('/offset/patch/projects');
export const getPatchEstimate   = (mass_kg)      => api.get('/offset/patch/estimate', { params: { mass_kg } });
export const createPatchOrder   = (data)         => api.post('/offset/patch/order', data);

// ─── Challenges ───────────────────────────────────────────────────────────────
export const getChallenges     = ()         => api.get('/challenges');
export const searchChallengeUser = (email)  => api.get('/challenges/search-user', { params: { email } });
export const sendChallenge     = (data)     => api.post('/challenges/send', data);
export const acceptChallenge   = (id)       => api.put(`/challenges/${id}/accept`);
export const declineChallenge  = (id)       => api.put(`/challenges/${id}/decline`);
export const completeChallenge = (id)       => api.post(`/challenges/${id}/complete`);

// ─── Eco Island ───────────────────────────────────────────────────────────────
export const getIsland    = ()           => api.get('/island');
export const earnCredits  = (data)       => api.post('/island/earn', data);
export const placeItem    = (data)       => api.post('/island/place', data);
export const removeItem   = (x, y)      => api.delete(`/island/remove/${x}/${y}`);

export default api;
