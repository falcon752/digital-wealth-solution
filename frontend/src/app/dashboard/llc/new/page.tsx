'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Building2, RefreshCw } from 'lucide-react';
import { llcAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

function NewLLCForm() {
  const router = useRouter();
  const params = useSearchParams();
  const companyType = (params.get('type') === 'existing' ? 'existing' : 'new') as 'new' | 'existing';

  const [form, setForm] = useState({
    companyName: '',
    entityType: 'llc',
    state: 'Wyoming',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await llcAPI.create({
        companyName: form.companyName.trim(),
        entityType: form.entityType,
        state: form.state,
        companyType,
      });
      toast.success('LLC application submitted!');
      router.push('/dashboard/llc');
    } catch {
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isExisting = companyType === 'existing';

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 h-14 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            {isExisting ? 'Existing Company' : 'New Company'} Registration
          </h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Type badge */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          <div className="w-12 h-12 bg-[#2d5be3] rounded-xl flex items-center justify-center shrink-0">
            {isExisting
              ? <RefreshCw size={22} className="text-white" />
              : <Building2 size={22} className="text-white" />
            }
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {isExisting ? 'Existing Company' : 'New Company'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isExisting
                ? 'Switch to our registered agent service for enhanced protection and support.'
                : 'Perfect for starting a standalone business or individual venture.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-5"
        >
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isExisting ? 'Company Details' : 'Formation Details'}
          </h2>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder={isExisting ? 'Your existing company name' : 'e.g. Acme Holdings LLC'}
              className={`w-full px-4 py-3 rounded-xl border ${errors.companyName ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d5be3]/40`}
            />
            {errors.companyName && (
              <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>
            )}
          </div>

          {/* Entity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Entity Type
            </label>
            <select
              value={form.entityType}
              onChange={(e) => setForm({ ...form, entityType: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2d5be3]/40"
            >
              <option value="llc">LLC</option>
              <option value="corporation">Corporation</option>
              <option value="s-corp">S-Corp</option>
              <option value="partnership">Partnership</option>
              <option value="sole-proprietorship">Sole Proprietorship</option>
              <option value="series-llc">Series LLC</option>
              <option value="holding-company">Holding Company</option>
            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              State of Formation
            </label>
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2d5be3]/40"
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1 pl-1">Wyoming is recommended for its favorable business laws.</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#2d5be3] hover:bg-[#2450c8] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors mt-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NewLLCPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-full">
        <div className="w-7 h-7 border-2 border-[#2d5be3] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewLLCForm />
    </Suspense>
  );
}
