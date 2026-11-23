'use client';

import { Suspense, useState, useEffect } from 'react';
import type { SVGProps } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Lock, Copy } from 'lucide-react';
import { llcAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/layout/ThemeToggle';
import Modal from '@/components/ui/Modal';

// --- Custom Icons matching the screenshots ---

function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 21V5C6 4.46957 6.21071 3.96086 6.58579 3.58579C6.96086 3.21071 7.46957 3 8 3H16C16.5304 3 17.0391 3.21071 17.4142 3.58579C17.7893 3.96086 18 4.46957 18 5V21M3 21H21M10 7H14M10 11H14M10 15H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronDown({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6"/></svg>;
}

function InfoCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="10" fill="currentColor"/>
      <path d="M12 16v-4m0-4h.01" stroke="var(--cd-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TagIcon(props: SVGProps<SVGSVGElement>) {
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
  const searchParams = useSearchParams();
  const isExisting = searchParams.get('type') === 'existing';

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
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const TRC20_WALLET = 'TGtr9dCWPv7JigAktnHRsQb4hyYat1RaYg';

  useEffect(() => {
    // Check if body has dark class to render correct logo
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (user && isExisting) {
      llcAPI.list()
        .then(res => {
          const apps = res.data.applications;
          if (apps && apps.length > 0) {
            const lastApp = apps.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            setForm(prev => ({
              ...prev,
              companyName: lastApp.companyName || '',
              entityType: lastApp.entityType || 'llc',
              state: lastApp.state || 'Wyoming',
              businessEnding: lastApp.businessEnding || 'Prefer No Ending',
              firstName: lastApp.contactFirstName || user.firstName || '',
              lastName: lastApp.contactLastName || user.lastName || '',
              username: lastApp.contactUsername || user.username || '',
              email: lastApp.contactEmail || user.email || '',
              phone: lastApp.contactPhone || '',
              streetAddress: lastApp.streetAddress || '',
              unit: lastApp.unit || '',
              city: lastApp.city || '',
              country: lastApp.country || 'United States',
              postalCode: lastApp.postalCode || '',
              partnerCode: lastApp.partnerCode || ''
            }));
          } else {
            setForm(prev => ({
              ...prev,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              username: user.username || '',
              email: user.email || ''
            }));
          }
        })
        .catch(() => {
          setForm(prev => ({
            ...prev,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            username: user.username || '',
            email: user.email || ''
          }));
        });
    }
  }, [user, isExisting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    // Form is valid, open payment modal instead of immediate submission
    setShowPaymentModal(true);
  }

  async function confirmPayment() {
    setSubmitting(true);
    try {
      await llcAPI.create({
        companyName: form.companyName.trim(),
        entityType: form.entityType,
        state: form.state,
        companyType: isExisting ? 'existing' : 'new',
        businessEnding: form.businessEnding,
        contactFirstName: form.firstName.trim(),
        contactLastName: form.lastName.trim(),
        contactUsername: form.username.trim(),
        contactEmail: form.email.trim(),
        contactPhone: form.phone.trim(),
        streetAddress: form.streetAddress.trim(),
        unit: form.unit.trim(),
        city: form.city.trim(),
        country: form.country,
        postalCode: form.postalCode.trim(),
        partnerCode: form.partnerCode.trim(),
      });
      toast.success('LLC application submitted!');
      router.push('/dashboard/llc');
    } catch {
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
      setShowPaymentModal(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Wallet address copied!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cd-page text-cd-text font-sans">
      
      {/* Header */}
      <header className="bg-cd-card px-4 md:px-6 h-16 flex items-center justify-between border-b border-cd-line shrink-0">
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
            <FeedbackIcon className="text-cd-muted" />
            Feedback
          </button> */}
          <button onClick={() => router.push('/dashboard/business')} className="text-[15px] font-semibold text-cd-text hover:opacity-80">
            Login
          </button>
        </div>
      </header>

      {/* Banner */}
      {showBanner && (
        <div className="bg-cd-accent text-white px-4 py-3.5 relative text-center text-[15px] leading-relaxed shrink-0">
          Welcome to our new intake experience! Be the <strong className="font-semibold">first to report a validated bug</strong> and we&apos;ll refund your entire formation fee!
          <button onClick={() => setShowBanner(false)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8">
        
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <h1 className="text-[34px] md:text-[40px] font-semibold text-cd-text leading-[1.1] tracking-tight">
            {isExisting ? (
              <>Register Existing<br/>Company</>
            ) : (
              <>Company<br/>Formation</>
            )}
          </h1>
          {/* <div className="text-[15px] text-cd-accent-text flex flex-col md:text-right pb-1">
            <span className="font-medium">Existing company? Switch</span>
            <Link href="/dashboard/llc/new?type=existing" className="font-semibold underline underline-offset-4 decoration-2 hover:opacity-80">
              REGISTERED AGENTS to us →
            </Link>
          </div> */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Formation State */}
          <div className="space-y-3">
            <h2 className="text-[22px] font-semibold text-cd-text tracking-tight">Formation State</h2>
            <div className="relative">
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full appearance-none bg-cd-card border border-cd-line text-cd-text text-[16px] font-medium rounded-xl px-4 py-4 focus:outline-none focus:border-cd-accent focus:ring-1 focus:ring-cd-accent cursor-pointer pr-12 shadow-sm"
              >
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-cd-muted pointer-events-none" />
            </div>
          </div>

          {/* Entity Type Cards */}
          <div className="space-y-3">
            <h2 className="text-[22px] font-semibold text-cd-text tracking-tight">Entity Type</h2>
            <div className="grid gap-3.5">
              {ENTITY_TYPES.map((type) => {
                const isSelected = form.entityType === type.id;
                return (
                  <div 
                    key={type.id}
                    onClick={() => setForm({...form, entityType: type.id})}
                    className={`cursor-pointer rounded-xl p-5 border-2 transition-all ${isSelected ? 'border-cd-accent shadow-sm' : 'border-cd-line hover:border-cd-line-strong'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 shrink-0 bg-cd-accent rounded-xl flex items-center justify-center text-white">
                        <BuildingIcon />
                      </div>
                      <div className="pt-0.5">
                        <h3 className="text-[17px] font-semibold text-cd-text leading-tight mb-1">{type.name}</h3>
                        <p className="text-[14.5px] text-cd-muted leading-[1.4] font-medium">{type.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Company Name & Business Ending */}
          <div className="space-y-3 pt-2">
            <h2 className="text-[22px] font-semibold text-cd-text tracking-tight">Company Name</h2>
            <input
              type="text"
              placeholder="Enter your company name"
              value={form.companyName}
              onChange={(e) => setForm({...form, companyName: e.target.value})}
              className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] font-medium rounded-xl px-4 py-4 focus:outline-none focus:border-cd-accent focus:ring-1 focus:ring-cd-accent placeholder:text-cd-faint shadow-sm"
            />
          </div>
            
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-cd-text tracking-tight">Business Ending</h2>
            <div className="relative">
              <select
                value={form.businessEnding}
                onChange={(e) => setForm({ ...form, businessEnding: e.target.value })}
                className="w-full appearance-none bg-cd-card border border-cd-line text-cd-text text-[16px] font-medium rounded-xl px-4 py-4 focus:outline-none focus:border-cd-accent focus:ring-1 focus:ring-cd-accent cursor-pointer pr-12 shadow-sm"
              >
                <option>Prefer No Ending</option>
                <option>LLC</option>
                <option>L.L.C.</option>
                <option>Limited Liability Company</option>
              </select>
              <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-cd-muted pointer-events-none" />
            </div>
          </div>

          {/* Privacy Protection */}
          <div className="pt-2 space-y-3">
            <h2 className="text-[22px] font-semibold text-cd-text tracking-tight">Privacy Protection</h2>
            <div className="bg-cd-accent-soft rounded-xl p-5 flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-cd-accent-text"><InfoCircleIcon /></div>
              <p className="text-[15px] font-medium text-cd-accent-text leading-relaxed">
                Your registered agent address will appear on public records instead of your personal address.
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="pt-2 space-y-5">
            <h2 className="text-[22px] font-semibold text-cd-text tracking-tight">Contact Details</h2>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">First Name</label>
                <input type="text" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Username</label>
                <input type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent shadow-sm"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Phone</label>
                <div className="flex border border-cd-line rounded-xl bg-cd-card shadow-sm overflow-hidden focus-within:border-cd-accent">
                  <select className="bg-cd-raised border-r border-cd-line text-cd-text text-[15px] font-semibold px-3 py-3.5 focus:outline-none appearance-none pr-8 relative">
                    <option>🇺🇸 +1</option>
                  </select>
                  <input type="tel" autoComplete="tel" placeholder="(XXX) XXX-XXXX" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="flex-1 bg-cd-card text-cd-text text-[16px] px-4 py-3.5 focus:outline-none placeholder:text-cd-faint"/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Password</label>
                <input type="password" placeholder="Create a secure password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent shadow-sm placeholder:text-cd-faint"/>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Confirm Password</label>
                <input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent shadow-sm placeholder:text-cd-faint"/>
              </div>
              
              <div className="flex items-center gap-2 pt-1 pb-1">
                <Lock size={14} className="text-cd-muted" />
                <span className="text-[14px] font-semibold text-cd-text">This information will not be made public.</span>
              </div>
            </div>
          </div>

          {/* Contact Address */}
          <div className="pt-2 space-y-5">
            <h2 className="text-[22px] font-semibold text-cd-text tracking-tight">Contact Address</h2>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Street Address</label>
                <input
                  type="text"
                  placeholder="Start typing address for suggestions..."
                  value={form.streetAddress}
                  onChange={(e) => setForm({...form, streetAddress: e.target.value})}
                  className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent placeholder:text-cd-faint shadow-sm"
                />
                <p className="text-[13px] text-cd-muted mt-1 font-medium">Enter your street address including building number</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Unit/Apartment (Optional)</label>
                <input
                  type="text"
                  placeholder="Apt, Suite, Unit, etc."
                  value={form.unit}
                  onChange={(e) => setForm({...form, unit: e.target.value})}
                  className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent placeholder:text-cd-faint shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">City</label>
                <input
                  type="text"
                  placeholder="Enter city"
                  value={form.city}
                  onChange={(e) => setForm({...form, city: e.target.value})}
                  className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent placeholder:text-cd-faint shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Country <span className="text-cd-negative">*</span></label>
                <div className="relative">
                  <select
                    value={form.country}
                    onChange={(e) => setForm({...form, country: e.target.value})}
                    className="w-full appearance-none bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent shadow-sm pr-12 cursor-pointer"
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Australia">Australia</option>
                  </select>
                  <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-cd-muted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[14.5px] font-semibold text-cd-text">Postal Code</label>
                <input
                  type="text"
                  placeholder="Enter postal code"
                  value={form.postalCode}
                  onChange={(e) => setForm({...form, postalCode: e.target.value})}
                  className="w-full bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent placeholder:text-cd-faint shadow-sm"
                />
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Lock size={14} className="text-cd-muted shrink-0 mt-1" />
                <p className="text-[14px] font-semibold text-cd-muted leading-relaxed">
                  This address information is for our internal records only and will remain private. We use Google Places to help verify address accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* Partner Code */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <TagIcon className="text-cd-accent-text" />
              <span className="text-[15px] font-semibold text-cd-accent-text">Have a partner code?</span>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter your partner code"
                value={form.partnerCode}
                onChange={(e) => setForm({...form, partnerCode: e.target.value})}
                className="flex-1 bg-cd-card border border-cd-line text-cd-text text-[16px] rounded-xl px-4 py-3.5 focus:outline-none focus:border-cd-accent placeholder:text-cd-faint shadow-sm"
              />
              <button type="button" className="bg-cd-accent hover:bg-cd-accent-hover text-white font-semibold px-6 rounded-xl transition-colors">
                Apply
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 pb-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-cd-accent hover:bg-cd-accent-hover disabled:opacity-60 text-white font-semibold text-[17px] py-4 rounded-xl transition-colors shadow-sm"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                'Submit Application'
              )}
            </button>
          </div>

        </form>

        <Modal isOpen={showPaymentModal} onClose={() => !submitting && setShowPaymentModal(false)} title="Legal Fee Payment" size="md">
          <div className="space-y-6">
            <div className="text-[15px] text-cd-muted">
              To proceed with your LLC formation, please complete the payment for the legal and consultation fees.
            </div>
            
            <div className="bg-cd-raised border border-cd-line rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-cd-muted">Legal Filing Fee</span>
                <span className="font-semibold text-cd-text">$2,000</span>
              </div>
              {!isExisting && (
                <div className="flex justify-between items-center text-[15px]">
                  <span className="text-cd-muted">Consultation Fee</span>
                  <span className="font-semibold text-cd-text">$1,000</span>
                </div>
              )}
              <div className="border-t border-cd-line pt-3 flex justify-between items-center">
                <span className="font-semibold text-cd-text">Total Amount</span>
                <span className="text-lg font-bold text-cd-positive">{isExisting ? '$2,000' : '$3,000'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-cd-text text-[16px]">Payment Method</h3>
              <p className="text-[14px] text-cd-muted">
                Payment is only accepted via <strong className="text-cd-text">USDT</strong> on the <strong className="text-cd-text">TRC20 network</strong>. Sending any other coin or using a different network may result in loss of funds.
              </p>
              
              <div className="mt-2">
                <label className="block text-[13px] font-semibold text-cd-muted uppercase tracking-wider mb-1.5">Company USDT TRC20 Address</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={TRC20_WALLET}
                    className="flex-1 bg-cd-raised border border-cd-line text-cd-text text-[14px] rounded-lg px-4 py-3 focus:outline-none"
                  />
                  <button 
                    onClick={() => copyToClipboard(TRC20_WALLET)}
                    className="p-3 bg-cd-accent-soft text-cd-accent-text rounded-lg hover:opacity-80 transition-colors"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-cd-accent-soft border border-transparent rounded-xl p-4 flex gap-3">
              <div className="mt-0.5 text-cd-accent-text"><InfoCircleIcon /></div>
              <p className="text-[14px] text-cd-accent-text font-medium">
                Your legal filing will be processed within 24–48 hours after payment confirmation.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded-xl border border-cd-line font-semibold text-cd-text/85 hover:bg-cd-raised transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPayment}
                disabled={submitting}
                className="flex-[2] bg-cd-accent hover:bg-cd-accent-hover disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm Payment'
                )}
              </button>
            </div>
          </div>
        </Modal>

      </main>

      {/* Footer */}
      <footer className="bg-cd-card border-t border-cd-line py-10 mt-auto">
        <div className="max-w-2xl mx-auto px-5 flex flex-col items-center gap-6">
          <img 
            src={isDarkMode ? '/wyoming-dark.png' : '/wyoming-light.png'} 
            alt="Wyoming Attorney" 
            className="h-9 object-contain"
          />
          <div className="flex items-center justify-center gap-6 text-[14.5px] font-semibold text-cd-text">
            <a href="#" className="hover:text-cd-text transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-cd-text transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-cd-text transition-colors">Contact</a>
          </div>
          <p className="text-[13px] text-cd-muted font-medium mt-1">
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
      <div className="flex items-center justify-center min-h-screen bg-cd-page">
        <div className="w-8 h-8 border-2 border-cd-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewLLCForm />
    </Suspense>
  );
}
