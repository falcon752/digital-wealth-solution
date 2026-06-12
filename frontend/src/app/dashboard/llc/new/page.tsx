'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Lock } from 'lucide-react';
import { llcAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import ThemeToggle from '@/components/layout/ThemeToggle';

// --- Custom Icons matching the screenshots ---

function BuildingIcon(props: any) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 21V5C6 4.46957 6.21071 3.96086 6.58579 3.58579C6.96086 3.21071 7.46957 3 8 3H16C16.5304 3 17.0391 3.21071 17.4142 3.58579C17.7893 3.96086 18 4.46957 18 5V21M3 21H21M10 7H14M10 11H14M10 15H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronDown(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6"/></svg>;
}

function FeedbackIcon(props: any) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function InfoCircleIcon(props: any) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="10" fill="#3b82f6"/>
      <path d="M12 16v-4m0-4h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TagIcon(props: any) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
      <line x1="7" y1="7" x2="7.01" y2="7"></line>
    </svg>
  );
}

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

const ENTITY_TYPES = [
  {
    id: 'llc',
    name: 'Limited Liability Company (LLC)',
    desc: 'Flexible business structure with simplified management and tax benefits. Perfect for small to medium businesses.'
  },
  {
    id: 'corporation',
    name: 'Corporation (C-CORP)',
    desc: 'Traditional business structure ideal for raising capital, going public, and issuing shares.'
  },
  {
    id: 'close-llc',
    name: 'Close LLC',
    desc: 'Unique to Wyoming and provides the same asset protection, tax and privacy benefits as a regular LLC. If you are the only owner, or this is a family business, then we generally recommend a Close LLC since they have reduced requirements.'
  },
  {
    id: 'close-corporation',
    name: 'Close Corporation',
    desc: 'Same asset protection, privacy and tax features as a Corporation, but with less maintenance.'
  }
];

function NewLLCForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    companyName: '',
    entityType: 'llc',
    state: 'Wyoming',
    businessEnding: 'Prefer No Ending',
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    streetAddress: '',
    unit: '',
    city: '',
    country: 'United States',
    postalCode: '',
    partnerCode: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if body has dark class to render correct logo
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSubmitting(true);
    try {
      await llcAPI.create({
        companyName: form.companyName.trim(),
        entityType: form.entityType,
        state: form.state,
        companyType: 'new',
      });
      toast.success('LLC application submitted!');
      router.push('/dashboard/llc');
    } catch {
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#181818] text-black dark:text-white font-sans">
      
      {/* Header */}
      <header className="bg-white dark:bg-[#2c2c2c] px-4 md:px-6 h-16 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center">
          <img 
            src={isDarkMode ? '/wyoming-dark.png' : '/wyoming-light.png'} 
            alt="Wyoming Attorney" 
            className="h-8 object-contain"
          />
        </div>
        <div className="flex items-center gap-6">
          <ThemeToggle />
          {/* <button className="flex items-center gap-2 text-[15px] font-medium text-gray-700 hover:text-black">
            <FeedbackIcon className="text-gray-500" />
            Feedback
          </button> */}
          <button onClick={() => router.push('/dashboard')} className="text-[15px] font-semibold text-black dark:text-white hover:opacity-80">
            Login
          </button>
        </div>
      </header>

      {/* Banner */}
      {showBanner && (
        <div className="bg-[#5c50f6] text-white px-4 py-3.5 relative text-center text-[15px] leading-relaxed shrink-0">
          Welcome to our new intake experience! Be the <strong className="font-semibold">first to report a validated bug</strong> and we'll refund your entire formation fee!
          <button onClick={() => setShowBanner(false)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
        
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <h1 className="text-[34px] md:text-[40px] font-semibold text-black dark:text-white leading-[1.1] tracking-tight">
            Company<br/>Formation
          </h1>
          {/* <div className="text-[15px] text-[#2563eb] flex flex-col md:text-right pb-1">
            <span className="font-medium">Existing company? Switch</span>
            <Link href="/dashboard/llc/new?type=existing" className="font-semibold underline underline-offset-4 decoration-2 hover:opacity-80">
              REGISTERED AGENTS to us →
            </Link>
          </div> */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Formation State */}
          <div className="space-y-3">
            <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight">Formation State</h2>
            <div className="relative">
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full appearance-none bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] font-medium rounded-xl px-4 py-4 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 cursor-pointer pr-12 shadow-sm"
              >
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Entity Type Cards */}
          <div className="space-y-3">
            <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight">Entity Type</h2>
            <div className="grid gap-3.5">
              {ENTITY_TYPES.map((type) => {
                const isSelected = form.entityType === type.id;
                return (
                  <div 
                    key={type.id}
                    onClick={() => setForm({...form, entityType: type.id})}
                    className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${isSelected ? 'border-[#3b82f6] shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 shrink-0 bg-[#3b82f6] rounded-xl flex items-center justify-center text-white">
                        <BuildingIcon />
                      </div>
                      <div className="pt-0.5">
                        <h3 className="text-[17px] font-semibold text-black dark:text-white leading-tight mb-1">{type.name}</h3>
                        <p className="text-[14.5px] text-gray-600 dark:text-gray-400 leading-[1.4] font-medium">{type.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Company Name & Business Ending */}
          <div className="space-y-3 pt-2">
            <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight">Company Name</h2>
            <input
              type="text"
              placeholder="Enter your company name"
              value={form.companyName}
              onChange={(e) => setForm({...form, companyName: e.target.value})}
              className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] font-medium rounded-xl px-4 py-4 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 placeholder:text-gray-400 shadow-sm"
            />
          </div>
            
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-black dark:text-white tracking-tight">Business Ending</h2>
            <div className="relative">
              <select
                value={form.businessEnding}
                onChange={(e) => setForm({ ...form, businessEnding: e.target.value })}
                className="w-full appearance-none bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] font-medium rounded-xl px-4 py-4 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 cursor-pointer pr-12 shadow-sm"
              >
                <option>Prefer No Ending</option>
                <option>LLC</option>
                <option>L.L.C.</option>
                <option>Limited Liability Company</option>
              </select>
              <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Privacy Protection */}
          <div className="pt-2 space-y-3">
            <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight">Privacy Protection</h2>
            <div className="bg-[#f0f5ff] rounded-[16px] p-5 flex items-start gap-3">
              <div className="mt-0.5 shrink-0"><InfoCircleIcon /></div>
              <p className="text-[15px] font-medium text-[#1e40af] leading-relaxed">
                Your registered agent address will appear on public records instead of your personal address.
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="pt-2 space-y-5">
            <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight">Contact Details</h2>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">First Name</label>
                <input type="text" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Username</label>
                <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Phone</label>
                <div className="flex border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#2c2c2c] shadow-sm overflow-hidden focus-within:border-gray-400">
                  <select className="bg-gray-50 dark:bg-[#2c2c2c] border-r border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-[15px] font-semibold px-3 py-3.5 focus:outline-none appearance-none pr-8 relative">
                    <option>🇺🇸 +1</option>
                  </select>
                  <input type="text" placeholder="(XXX) XXX-XXXX" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="flex-1 bg-white dark:bg-[#2c2c2c] text-black dark:text-white text-[16px] px-4 py-3.5 focus:outline-none placeholder:text-gray-400"/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Password</label>
                <input type="password" placeholder="Create a secure password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 shadow-sm placeholder:text-gray-400"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Confirm Password</label>
                <input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 shadow-sm placeholder:text-gray-400"/>
              </div>
              
              <div className="flex items-center gap-2 pt-1 pb-1">
                <Lock size={14} className="text-gray-600" />
                <span className="text-[14px] font-semibold text-gray-800">This information will not be made public.</span>
              </div>
            </div>
          </div>

          {/* Contact Address */}
          <div className="pt-2 space-y-5">
            <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight">Contact Address</h2>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Street Address</label>
                <input
                  type="text"
                  placeholder="Start typing address for suggestions..."
                  value={form.streetAddress}
                  onChange={(e) => setForm({...form, streetAddress: e.target.value})}
                  className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 shadow-sm"
                />
                <p className="text-[13px] text-gray-500 mt-1 font-medium">Enter your street address including building number</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Unit/Apartment (Optional)</label>
                <input
                  type="text"
                  placeholder="Apt, Suite, Unit, etc."
                  value={form.unit}
                  onChange={(e) => setForm({...form, unit: e.target.value})}
                  className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">City</label>
                <input
                  type="text"
                  placeholder="Enter city"
                  value={form.city}
                  onChange={(e) => setForm({...form, city: e.target.value})}
                  className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Country <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    value={form.country}
                    onChange={(e) => setForm({...form, country: e.target.value})}
                    className="w-full appearance-none bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 shadow-sm pr-12 cursor-pointer"
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Australia">Australia</option>
                  </select>
                  <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-gray-800">Postal Code</label>
                <input
                  type="text"
                  placeholder="Enter postal code"
                  value={form.postalCode}
                  onChange={(e) => setForm({...form, postalCode: e.target.value})}
                  className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 shadow-sm"
                />
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Lock size={14} className="text-gray-500 shrink-0 mt-1" />
                <p className="text-[14px] font-semibold text-gray-600 leading-relaxed">
                  This address information is for our internal records only and will remain private. We use Google Places to help verify address accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* Partner Code */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <TagIcon className="text-[#3b82f6]" />
              <span className="text-[15px] font-semibold text-[#3b82f6]">Have a partner code?</span>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter your partner code"
                value={form.partnerCode}
                onChange={(e) => setForm({...form, partnerCode: e.target.value})}
                className="flex-1 bg-white dark:bg-[#2c2c2c] border border-gray-300 dark:border-gray-700 text-black dark:text-white text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 shadow-sm"
              />
              <button type="button" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold px-6 rounded-xl transition-colors">
                Apply
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 pb-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 text-white font-semibold text-[17px] py-4 rounded-xl transition-colors shadow-sm"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                'Submit Application'
              )}
            </button>
          </div>

        </form>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#2c2c2c] border-t border-gray-200 dark:border-gray-800 py-10 mt-auto">
        <div className="max-w-2xl mx-auto px-5 flex flex-col items-center gap-6">
          <img 
            src={isDarkMode ? '/wyoming-dark.png' : '/wyoming-light.png'} 
            alt="Wyoming Attorney" 
            className="h-9 object-contain"
          />
          <div className="flex items-center justify-center gap-6 text-[14.5px] font-semibold text-gray-800 dark:text-gray-300">
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-[13px] text-gray-500 font-medium mt-1">
            © 2025 Wyoming LLC Attorney. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function NewLLCPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#181818]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewLLCForm />
    </Suspense>
  );
}
