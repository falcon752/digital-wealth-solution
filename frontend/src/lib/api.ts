import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const apiBase = API_BASE.replace('/api', '');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
  register: (data: { email: string; password: string; firstName: string; lastName: string; referralCode?: string }) =>
    api.post('/auth/register', data),
  sendSignupOTP: (data: { email: string; password: string; firstName: string; lastName: string; referralCode?: string }) =>
    api.post('/auth/send-signup-otp', data),
  verifySignupOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-signup-otp', data),
  login: (data: { email: string; password: string; totpCode?: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  setup2FA: () => api.post('/auth/setup-2fa'),
  confirm2FA: (token: string) => api.post('/auth/confirm-2fa', { token }),
  disable2FA: (token: string) => api.post('/auth/disable-2fa', { token }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
};

// ─── Users ────────────────────────────────────────────────────────────────
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: FormData) =>
    api.put('/users/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/change-password', data),
  updateAntiPhishing: (phrase: string) => api.put('/users/anti-phishing', { phrase }),
  getBalance: () => api.get('/users/balance'),
  getDashboardStats: () => api.get('/users/dashboard-stats'),
  toggleAssetVisibility: (symbol: string, isHidden: boolean) => api.put('/users/assets/toggle', { symbol, isHidden }),
  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/users/transactions', { params }),
};

// ─── Assets ───────────────────────────────────────────────────────────────
export const assetsAPI = {
  list: () => api.get('/assets'),
  prices: () => api.get('/assets/prices'),
  get: (id: string) => api.get(`/assets/${id}`),
  swap: (data: { fromAssetId: string; toAssetId: string; fromAmount: number }) =>
    api.post('/assets/swap', data),
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
  create: (data: {
    assetId: string;
    amount: number;
    txHash?: string;
    usdValue?: number;
    sourceType?: 'wallet' | 'provider' | 'exchange';
    provider?: string;
    paymentMethod?: string;
    providerReference?: string;
  }) =>
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

// ─── LLC ─────────────────────────────────────────────────────────────────
export const llcAPI = {
  list: () => api.get('/llc'),
  stats: () => api.get('/llc/stats'),
  get: (id: string) => api.get(`/llc/${id}`),
  create: (data: {
    companyName: string;
    entityType: string;
    state: string;
    companyType?: 'new' | 'existing';
    stateFee?: number;
    businessEnding?: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactUsername?: string;
    contactEmail?: string;
    contactPhone?: string;
    streetAddress?: string;
    unit?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    partnerCode?: string;
  }) =>
    api.post('/llc', data),
  // admin
  adminList: () => api.get('/llc/admin'),
  adminUpdate: (id: string, data: { status?: string; stateFee?: number; adminNote?: string }) =>
    api.put(`/llc/admin/${id}`, data),
  updateLLCApplication: (id: string, data: Record<string, unknown>) => api.put(`/admin/llc/${id}`, data),
};

// ─── Contact / Consultation ─────────────────────────────────────────────────
export const contactAPI = {
  onboardingStatus: (email: string) => api.get('/contact/onboarding-status', { params: { email } }),
  // admin
  adminList: () => api.get('/contact/admin'),
  adminUpdate: (id: string, data: { status?: string; adminNote?: string }) =>
    api.put(`/contact/admin/${id}`, data),
};

// ─── Access Requests (site gate) ───────────────────────────────────────────
export const accessAPI = {
  request: (data: { name: string; email: string; reason?: string }) =>
    api.post('/access-requests', data),
  // admin
  adminList: () => api.get('/access-requests/admin'),
  approve: (id: string, data?: { adminNote?: string }) =>
    api.put(`/access-requests/admin/${id}/approve`, data),
  reject: (id: string, data?: { adminNote?: string }) =>
    api.put(`/access-requests/admin/${id}/reject`, data),
  revoke: (id: string) => api.put(`/access-requests/admin/${id}/revoke`),
};

// ─── Admin ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),
  getReferrals: (params?: { page?: number; limit?: number; search?: string }) => 
    api.get('/admin/referrals', { params }),
  createUser: (data: { email: string; password: string; firstName: string; lastName: string; sendWelcome?: boolean }) =>
    api.post('/admin/users', data),
  setUserStatus: (id: string, isActive: boolean) =>
    api.put(`/admin/users/${id}/status`, { isActive }),
  setUserBalance: (id: string, balance: number) =>
    api.put(`/admin/users/${id}/balance`, { balance }),
  adjustUserAssetBalance: (id: string, data: { assetId: string; action: 'credit' | 'deduct'; amount: number; usdValue?: number; adminNote?: string }) =>
    api.post(`/admin/users/${id}/asset-adjustment`, data),
  verifyUserPayment: (id: string, onboardingFeePaid: boolean) =>
    api.put(`/admin/users/${id}/verify-payment`, { onboardingFeePaid }),
  getActivityLogs: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/activity-logs', { params }),
};

// ─── Loans ─────────────────────────────────────────────────────────────────
export const loansAPI = {
  create: (data: {
    collateralAsset: string;
    collateralAmount: number;
    loanAsset: string;
    loanAmount: number;
    ltv: number;
    apr: number;
    monthlyInterest: number;
    originationFee: number;
    payoutAddress: string;
    contactEmail: string;
  }) => api.post('/loans', data),
  list: () => api.get('/loans'),
  // admin
  updateStatus: (id: string, data: { status: 'pending' | 'approved' | 'rejected'; adminNote?: string }) =>
    api.put(`/loans/${id}/status`, data),
};

// ─── Earns / Savings ───────────────────────────────────────────────────────
export const earnsAPI = {
  create: (data: {
    asset: string;
    amount: number;
    apy: number;
    monthlyReward: number;
    term: string;
    contactEmail: string;
  }) => api.post('/earns', data),
  list: () => api.get('/earns'),
  // admin
  updateStatus: (id: string, data: { status: 'pending' | 'active' | 'rejected'; adminNote?: string }) =>
    api.put(`/earns/${id}/status`, data),
};
