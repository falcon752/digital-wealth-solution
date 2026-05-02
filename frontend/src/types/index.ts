export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  isActive: boolean;
  twoFactorEnabled: boolean;
  antiPhishingPhrase?: string | null;
  balance?: number;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  walletAddress: string;
  qrCodeImage?: string | null;
  network?: string;
  minDeposit?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface Deposit {
  id: string;
  userId?: string;
  assetId?: string;
  assetName: string;
  assetSymbol: string;
  amount: number;
  usdValue?: number | null;
  txHash?: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  adminNote?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  walletAddress?: string;
  // admin view extras
  userEmail?: string;
  firstName?: string;
  lastName?: string;
}

export interface Withdrawal {
  id: string;
  userId?: string;
  assetId?: string;
  assetName: string;
  assetSymbol: string;
  amount: number;
  usdValue?: number | null;
  destinationAddress: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  adminNote?: string | null;
  twoFactorVerified?: boolean;
  otpCode?: string | null;
  createdAt: string;
  processedAt?: string | null;
  // admin view extras
  userEmail?: string;
  firstName?: string;
  lastName?: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  assetName: string;
  assetSymbol: string;
  amount: number;
  usdValue?: number | null;
  status: string;
  createdAt: string;
  confirmedAt?: string | null;
  txHash?: string | null;
  destinationAddress?: string;
  adminNote?: string | null;
}

export interface ActivityLog {
  id: string;
  userId?: number | string;
  action: string;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface DashboardStats {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  recentTransactions: Transaction[];
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalAssets: number;
  totalDepositedUSD: number;
  totalWithdrawnUSD: number;
  recentActivity: ActivityLog[];
}

export interface LLCApplication {
  id: string;
  userId?: string;
  companyName: string;
  entityType: string;
  companyType: 'new' | 'existing';
  state: string;
  status: 'pending' | 'approved' | 'processing' | 'rejected';
  stateFee: number;
  adminNote?: string | null;
  createdAt: string;
  processedAt?: string | null;
  // admin extras
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface LLCStats {
  approved: number;
  pending: number;
  processing: number;
  rejected: number;
}
