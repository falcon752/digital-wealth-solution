import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'approved':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'pending':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'rejected':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'processing':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
}
