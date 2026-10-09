import { contactAPI } from './api';

export const CONSULTATION_CONTINUATION_KEY = 'dwp_consultation_continuation';

export interface ConsultationContinuation {
  submissionId: string;
  token: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export function getPendingConsultation(): ConsultationContinuation | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(CONSULTATION_CONTINUATION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function continuePendingConsultation() {
  const pending = getPendingConsultation();
  if (!pending) return false;
  await contactAPI.continueConsultation(pending.submissionId, pending.token);
  sessionStorage.removeItem(CONSULTATION_CONTINUATION_KEY);
  return true;
}
