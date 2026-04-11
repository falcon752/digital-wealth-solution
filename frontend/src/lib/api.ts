import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dws_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('dws_token');
      localStorage.removeItem('dws_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string; totpCode?: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  setup2FA: () => api.post('/auth/setup-2fa'),
  confirm2FA: (token: string) => api.post('/auth/confirm-2fa', { token }),
  disable2FA: (token: string) => api.post('/auth/disable-2fa', { token }),
};

// ─── Users ────────────────────────────────────────────────────────────────
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { firstName?: string; lastName?: string }) =>
    api.put('/users/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/change-password', data),
  updateAntiPhishing: (phrase: string) => api.put('/users/anti-phishing', { phrase }),
  getBalance: () => api.get('/users/balance'),
  getDashboardStats: () => api.get('/users/dashboard-stats'),
  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/users/transactions', { params }),
};

// ─── Assets ───────────────────────────────────────────────────────────────
export const assetsAPI = {
  list: () => api.get('/assets'),
  get: (id: string) => api.get(`/assets/${id}`),
  // admin
  adminList: () => api.get('/admin/assets'),
  create: (formData: FormData) =>
    api.post('/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, formData: FormData) =>
    api.put(`/assets/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/assets/${id}`),
};

// ─── Deposits ────────────────────────────────────────────────────────────
export const depositsAPI = {
  create: (data: { assetId: string; amount: number; txHash?: string; usdValue?: number }) =>
    api.post('/deposits', data),
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/deposits', { params }),
  get: (id: string) => api.get(`/deposits/${id}`),
  // admin
  adminList: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/deposits', { params }),
  confirm: (id: string, data?: { usdValue?: number; adminNote?: string }) =>
    api.put(`/admin/deposits/${id}/confirm`, data),
  reject: (id: string, data?: { adminNote?: string }) =>
    api.put(`/admin/deposits/${id}/reject`, data),
};

// ─── Withdrawals ─────────────────────────────────────────────────────────
export const withdrawalsAPI = {
  create: (data: {
    assetId: string;
    amount: number;
    destinationAddress: string;
    usdValue?: number;
  }) => api.post('/withdrawals', data),
  verifyOTP: (id: string, data: { otp: string; totpCode?: string }) =>
    api.post(`/withdrawals/${id}/verify-otp`, data),
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/withdrawals', { params }),
  get: (id: string) => api.get(`/withdrawals/${id}`),
  // admin
  adminList: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/withdrawals', { params }),
  approve: (id: string, data?: { adminNote?: string }) =>
    api.put(`/admin/withdrawals/${id}/approve`, data),
  complete: (id: string, data?: { adminNote?: string }) =>
    api.put(`/admin/withdrawals/${id}/complete`, data),
  reject: (id: string, data?: { adminNote?: string }) =>
    api.put(`/admin/withdrawals/${id}/reject`, data),
};

// ─── Admin ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),
  setUserStatus: (id: string, isActive: boolean) =>
    api.put(`/admin/users/${id}/status`, { isActive }),
  setUserBalance: (id: string, balance: number) =>
    api.put(`/admin/users/${id}/balance`, { balance }),
  getActivityLogs: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/activity-logs', { params }),
};
