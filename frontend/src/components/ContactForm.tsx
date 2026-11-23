'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { CONSULTATION_CONTINUATION_KEY } from '@/lib/consultationContinuation';
import { getApiError } from '@/lib/apiError';
import MultiSelect from '@/components/MultiSelect';
import { SupportedWalletLists } from '@/types';
import { COUNTRIES } from '@/lib/countries';

const radioStyle = `
  .custom-radio {
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border: 2px solid #9ca3af;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
    position: relative;
    transition: border-color 0.15s;
  }
  .custom-radio:checked {
    border-color: #2563eb;
    background: transparent;
  }
  /* Light grey form fields, same look as DirectStay's forms in light mode. */
  .dwp-contact-form .dwp-field {
    background-color: #F3F3F3A1;
    border: 1px solid #FFFFFF;
    border-radius: 6px;
    color: #2C3236;
    min-height: 40px;
  }
  .dwp-contact-form .dwp-field::placeholder {
    color: #606060;
  }
  .dwp-contact-form .dwp-field:focus {
    outline: none;
    border-color: #cfd3dc;
    box-shadow: 0 0 0 3px rgba(23, 32, 92, 0.08);
  }
  .dwp-contact-form .dwp-field.dwp-field-error {
    border-color: #e5a3a3;
    box-shadow: 0 0 0 3px rgba(197, 48, 48, 0.08);
  }
  .custom-radio:checked::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #2563eb;
  }
`;

const CLIENT_TYPES = ['Individual', 'Family Office', 'RIA Firm', 'TAMP', 'Trust', 'Corporation'];
const AREAS_OF_INTEREST = [
  'Trading and financing', 'Wealth management', 'Stablecoin issuance', 'Stablecoin rewards',
  'Stablecoin correspondent banking', 'Tokenized deposits', 'Agentic banking', 'Atlas settlement network',
  'Self-custody (Defi)', 'Staking', 'Custody', 'Token generation events', 'Token management',
];
const AREA_OPTIONS = AREAS_OF_INTEREST.map((area) => ({ value: area, label: area }));

const REFERRAL_SOURCES = ['None', 'Search engine', 'Social media', 'Friend, family or colleague', 'Existing DWP client', 'A DWP official or advisor', 'Advertisement', 'Event or conference', 'Other'];

const OFFICIAL_SOURCE = 'A DWP official or advisor';
const NOT_SURE_OFFICIAL = "I'm not sure";

interface DwpOfficial {
  name: string;
  role: string;
  group: 'Leadership' | 'Advisors';
}

const OTHER_CHOICE = 'Other';

// "I don't use a wallet/exchange" can't be combined with real choices: picking it clears the others,
// and picking anything else clears it.
function withExclusiveNone(previous: string[], next: string[], noneValue?: string) {
  if (!noneValue) return next;
  const added = next.filter((value) => !previous.includes(value));
  if (added.includes(noneValue)) return [noneValue];
  return next.length > 1 ? next.filter((value) => value !== noneValue) : next;
}

interface PlatformAsset {
  name: string;
  symbol: string;
}

/* ─── Guided steps ──────────────────────────────────────────────────────── */

const STEPS = [
  { title: 'About you', intro: 'How we can reach you.' },
  { title: 'Your situation', intro: 'A little about you and your household.' },
  { title: 'Assets & accounts', intro: 'What you hold today and where you keep it.' },
  { title: 'Interests', intro: 'What you would like to talk about.' },
  { title: 'Review & submit', intro: 'Check your answers before you send them.' },
] as const;
const REVIEW_STEP = STEPS.length - 1;

const ACCENT = '#AD7F4E';
const LABEL_COLOR = '#1a202c';
const MUTED = '#718096';
const BODY = '#4a5568';
const ERROR = '#c53030';

type Errors = Record<string, string>;

function Label({ children, optional, htmlFor, spaced = false }: { children: React.ReactNode; optional?: boolean; htmlFor?: string; spaced?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium ${spaced ? 'mb-2' : 'mb-1'}`} style={{ color: LABEL_COLOR }}>
      {children}
      {optional && <> <span className="font-normal" style={{ color: MUTED }}>(optional)</span></>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs" style={{ color: ERROR }} role="alert">{message}</p>;
}

function YesNo({ name, value, onChange, vertical = false, options = ['Yes', 'No'] }: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  vertical?: boolean;
  options?: string[];
}) {
  return (
    <div className={vertical ? 'space-y-1' : 'flex gap-6'}>
      {options.map((v) => (
        <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: BODY }}>
          <input
            type="radio"
            name={name}
            value={v}
            className="custom-radio"
            checked={value === v}
            onChange={(e) => onChange(e.target.value)}
          />
          {v}
        </label>
      ))}
    </div>
  );
}

/** One "question: answer" line on the review screen. */
function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  const empty = !value || !value.trim();
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[minmax(0,44%)_1fr] sm:gap-4">
      <dt className="text-xs sm:text-sm" style={{ color: MUTED }}>{label}</dt>
      <dd className="min-w-0 break-words text-sm" style={{ color: empty ? MUTED : LABEL_COLOR }}>{empty ? 'Not provided' : value}</dd>
    </div>
  );
}

const fieldClass = (error?: string, extra = '') => `dwp-field w-full px-3 py-2 text-sm ${error ? 'dwp-field-error' : ''} ${extra}`.trim();
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function ContactForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const router = useRouter();
  const [topic, setTopic] = useState('General Question');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [married, setMarried] = useState('No');
  const [children, setChildren] = useState('No');
  const [investableAssets, setInvestableAssets] = useState('');
  const [digitalAllocation, setDigitalAllocation] = useState('');
  const [holdsXRP, setHoldsXRP] = useState('No');
  const [existingClient, setExistingClient] = useState('Not Currently a DWP Client');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [clientType, setClientType] = useState('');
  const [hasEntity, setHasEntity] = useState('No');
  const [entityName, setEntityName] = useState('');
  const [hasCryptoIRA, setHasCryptoIRA] = useState('No');
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [custodyAssets, setCustodyAssets] = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState('');
  const [walletsUsed, setWalletsUsed] = useState<string[]>([]);
  const [walletOther, setWalletOther] = useState('');
  const [exchangesUsed, setExchangesUsed] = useState<string[]>([]);
  const [exchangeOther, setExchangeOther] = useState('');
  const [walletLists, setWalletLists] = useState<SupportedWalletLists | null>(null);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [referralOfficial, setReferralOfficial] = useState('');
  const [officials, setOfficials] = useState<DwpOfficial[]>([]);
  const [officialsLoading, setOfficialsLoading] = useState(false);
  const [platformAssets, setPlatformAssets] = useState<PlatformAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guided flow: the current step, the furthest step reached, and the steps whose errors are shown.
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [direction, setDirection] = useState(1);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [ackAttempted, setAckAttempted] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const assetOptions = [
    ...platformAssets.map((asset) => ({ value: asset.symbol, label: `${asset.name} (${asset.symbol})` })),
    { value: 'Other', label: 'Other (describe in your message)' },
  ];
  const walletOptions = walletLists
    ? [...walletLists.wallets, walletLists.other, walletLists.noWallet].map((name) => ({ value: name, label: name === walletLists.other ? 'Other (type the name)' : name }))
    : [];
  const exchangeOptions = walletLists
    ? [...walletLists.exchanges, walletLists.other, walletLists.noExchange].map((name) => ({ value: name, label: name === walletLists.other ? 'Other (type the name)' : name }))
    : [];

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/assets/public`)
      .then((response) => { if (!cancelled) setPlatformAssets(response.data.assets || []); })
      .catch(() => { /* The "Other" option stays available if the list cannot load. */ })
      .finally(() => { if (!cancelled) setAssetsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contact/wallets`)
      .then((response) => { if (!cancelled) setWalletLists(response.data); })
      .catch(() => { /* The question stays visible; the step explains the problem if the list cannot load. */ })
      .finally(() => { if (!cancelled) setWalletsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (referralSource !== OFFICIAL_SOURCE || officials.length > 0) return;
    let cancelled = false;
    setOfficialsLoading(true);
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contact/officials`)
      .then((response) => { if (!cancelled) setOfficials(response.data.officials || []); })
      .catch(() => { /* "I'm not sure" stays available if the list cannot load. */ })
      .finally(() => { if (!cancelled) setOfficialsLoading(false); });
    return () => { cancelled = true; };
  }, [referralSource, officials.length]);

  /** The same rules the fields' "required" marks stood for, checked one step at a time. */
  const validateStep = (index: number): Errors => {
    const errors: Errors = {};
    const listMissing = (loading: boolean) => (!loading && !walletLists ? 'This list could not load. Refresh the page and try again.' : 'Select at least one option');
    if (index === 0) {
      if (!firstName.trim()) errors.firstName = 'Enter your first name';
      if (!lastName.trim()) errors.lastName = 'Enter your last name';
      if (!email.trim()) errors.email = 'Enter your email address';
      else if (!looksLikeEmail(email)) errors.email = 'Enter a valid email address';
      if (!confirmEmail.trim()) errors.confirmEmail = 'Confirm your email address';
      else if (email.toLowerCase() !== confirmEmail.toLowerCase()) errors.confirmEmail = 'Email addresses do not match';
      if (!phone.trim()) errors.phone = 'Enter your phone number';
      if (!streetAddress.trim()) errors.streetAddress = 'Enter your street address';
      if (!city.trim()) errors.city = 'Enter your city';
      if (!country) errors.country = 'Select your country';
    }
    if (index === 1) {
      if (!clientType) errors.clientType = 'Select a client type';
    }
    if (index === 2) {
      if (!investableAssets) errors.investableAssets = 'Select a range';
      if (!digitalAllocation) errors.digitalAllocation = 'Select an allocation';
      if (custodyAssets.length === 0) errors.custodyAssets = 'Select at least one asset (or "Other")';
      if (walletsUsed.length === 0) errors.walletsUsed = listMissing(walletsLoading);
      else if (walletsUsed.includes(OTHER_CHOICE) && !walletOther.trim()) errors.walletOther = 'Type the name of the other wallet(s)';
      if (exchangesUsed.length === 0) errors.exchangesUsed = listMissing(walletsLoading);
      else if (exchangesUsed.includes(OTHER_CHOICE) && !exchangeOther.trim()) errors.exchangeOther = 'Type the name of the other exchange(s)';
    }
    if (index === 3) {
      if (!referralSource) errors.referralSource = 'Please make a selection';
      if (referralSource === OFFICIAL_SOURCE && !referralOfficial) errors.referralOfficial = 'Please make a selection';
      if (!message.trim()) errors.message = 'Write a short message';
    }
    return errors;
  };

  const errors = attempted[step] ? validateStep(step) : {};

  const scrollToTop = () => {
    const el = topRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 80 || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - 110, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  const goTo = (index: number) => {
    setDirection(index > step ? 1 : -1);
    setStep(index);
    setFurthest((current) => Math.max(current, index));
    requestAnimationFrame(scrollToTop);
  };

  const focusFirstError = (found: Errors) => {
    const first = Object.keys(found)[0];
    requestAnimationFrame(() => {
      const el = document.getElementById(`cf-${first}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      const focusable = el.matches('input,select,textarea,button') ? el : el.querySelector<HTMLElement>('input:not([aria-hidden]),select,textarea,button');
      (focusable as HTMLElement | null)?.focus({ preventScroll: true });
    });
  };

  const next = () => {
    const found = validateStep(step);
    if (Object.keys(found).length > 0) {
      setAttempted((current) => ({ ...current, [step]: true }));
      focusFirstError(found);
      return;
    }
    goTo(step + 1);
  };

  const back = () => { if (step > 0) goTo(step - 1); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Every step is checked again before sending; the first one with a problem is reopened.
    for (let index = 0; index < REVIEW_STEP; index += 1) {
      const found = validateStep(index);
      if (Object.keys(found).length > 0) {
        setAttempted((current) => ({ ...current, [index]: true }));
        goTo(index);
        focusFirstError(found);
        toast.error(`Please check "${STEPS[index].title}"`);
        return;
      }
    }

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      toast.error('Email addresses do not match!');
      return;
    }

    if (!acknowledged) {
      setAckAttempted(true);
      toast.error('Please acknowledge the disclaimer by checking "I understand"');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contact/general`, {
        topic,
        firstName,
        lastName,
        email,
        phone,
        married,
        children,
        investableAssets,
        digitalAllocation,
        holdsXRP,
        existingClient,
        streetAddress,
        city,
        stateProvince,
        postalCode,
        country,
        clientType,
        hasEntity,
        entityName: hasEntity === 'Yes' ? entityName.trim() : undefined,
        hasCryptoIRA,
        areasOfInterest,
        custodyAssets,
        walletsUsed,
        walletOther: walletsUsed.includes(OTHER_CHOICE) ? walletOther.trim() : undefined,
        exchangesUsed,
        exchangeOther: exchangesUsed.includes(OTHER_CHOICE) ? exchangeOther.trim() : undefined,
        referralSource,
        referralOfficial: referralSource === OFFICIAL_SOURCE ? referralOfficial : undefined,
        message,
      });

      if (response.data.continuation) {
        sessionStorage.setItem(CONSULTATION_CONTINUATION_KEY, JSON.stringify({
          ...response.data.continuation,
          firstName,
          lastName,
        }));
      }

      onSubmitted?.();
      // Next step is the onboarding page. The confirmation email is sent once the account is created.
      router.push('/pay-onboarding?from=consultation');
    } catch (error: unknown) {
      console.error('Submit contact form error:', error);
      toast.error(getApiError(error, 'Failed to submit contact form. Please try again later.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Enter in a field moves on a step instead of sending the form early. */
  const onFormSubmit = (e: React.FormEvent) => {
    if (step < REVIEW_STEP) {
      e.preventDefault();
      next();
      return;
    }
    handleSubmit(e);
  };

  const labelFor = (options: { value: string; label: string }[], values: string[]) =>
    values.map((value) => options.find((option) => option.value === value)?.label ?? value).join(', ');
  const officialLabel = (() => {
    const found = officials.find((official) => official.name === referralOfficial);
    return found?.role ? `${found.name} (${found.role})` : referralOfficial;
  })();

  const reviewSections: { step: number; rows: [string, string | null | undefined][] }[] = [
    { step: 0, rows: [
      ['What brings you here today?', topic],
      ['Name', `${firstName} ${lastName}`.trim()],
      ['Email', email],
      ['Phone Number', phone],
      ['Address', [streetAddress, city, stateProvince, postalCode, country].filter((part) => part.trim()).join(', ')],
    ] },
    { step: 1, rows: [
      ['Are you married?', married],
      ['Do you have children?', children],
      ['Client Type', clientType],
      ['Do you have an LLC, Trust, or Corporation?', hasEntity],
      ...(hasEntity === 'Yes' ? [['Name of LLC/Trust/Corp', entityName] as [string, string]] : []),
      ['Do you have a Crypto IRA?', hasCryptoIRA],
      ['Existing client of Digital Wealth Partners?', existingClient],
    ] },
    { step: 2, rows: [
      ['Investable Assets', investableAssets],
      ['Current Allocation to Digital Assets', digitalAllocation],
      ['Hold 50,000 or more XRP Tokens?', holdsXRP],
      ['Digital assets to move to custody', labelFor(assetOptions, custodyAssets)],
      ['Digital wallets used', [labelFor(walletOptions, walletsUsed.filter((v) => v !== OTHER_CHOICE)), walletsUsed.includes(OTHER_CHOICE) ? `Other: ${walletOther}` : ''].filter(Boolean).join(', ')],
      ['Exchanges used', [labelFor(exchangeOptions, exchangesUsed.filter((v) => v !== OTHER_CHOICE)), exchangesUsed.includes(OTHER_CHOICE) ? `Other: ${exchangeOther}` : ''].filter(Boolean).join(', ')],
    ] },
    { step: 3, rows: [
      ['Areas of interest', areasOfInterest.join(', ')],
      ['Referral source', referralSource],
      ...(referralSource === OFFICIAL_SOURCE ? [['Referred by', officialLabel] as [string, string]] : []),
      ['Message', message],
    ] },
  ];

  const variants = {
    enter: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * -32 }),
  };

  return (
    <>
      <style>{radioStyle}</style>
      <form onSubmit={onFormSubmit} noValidate className="dwp-contact-form">
        {/* Progress */}
        <div ref={topRef} className="mb-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-xs" style={{ color: MUTED }}>{Math.round(((step + 1) / STEPS.length) * 100)}% complete</p>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: '#edeff3' }}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-label="Form progress"
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: ACCENT, transition: reduceMotion ? 'none' : 'width 300ms ease' }}
            />
          </div>
          <ol className="mt-3 hidden gap-1 sm:grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
            {STEPS.map((s, index) => {
              const reachable = index <= furthest && index !== step;
              const done = index < step || (index <= furthest && index !== step);
              return (
                <li key={s.title} className="min-w-0">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => goTo(index)}
                    className="flex w-full min-w-0 items-start gap-1.5 text-left text-[11.5px] leading-tight disabled:cursor-default"
                    style={{ color: index === step ? LABEL_COLOR : done ? BODY : '#a0aec0', fontWeight: index === step ? 600 : 400 }}
                    aria-current={index === step ? 'step' : undefined}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                      style={index === step
                        ? { backgroundColor: ACCENT, color: '#fff' }
                        : done ? { backgroundColor: '#f3ebe2', color: ACCENT } : { backgroundColor: '#edeff3', color: '#a0aec0' }}
                    >
                      {done ? <Check size={10} strokeWidth={3} /> : index + 1}
                    </span>
                    <span className={reachable ? 'min-w-0 hover:underline' : 'min-w-0'}>{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <h3 className="text-lg font-semibold" style={{ color: LABEL_COLOR }}>{STEPS[step].title}</h3>
        <p className="mt-0.5 text-sm" style={{ color: MUTED }}>
          {STEPS[step].intro}
          {step < REVIEW_STEP && ' All fields are required unless marked (optional).'}
        </p>

        <div className="relative mt-6">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: 'easeOut' }}
              className="space-y-6"
            >
              {step === 0 && (
                <>
                  {/* What brings you here */}
                  <div>
                    <Label htmlFor="cf-topic">What brings you here today?</Label>
                    <select
                      id="cf-topic"
                      className={fieldClass(undefined, 'font-medium')}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                    >
                      <option>General Question</option>
                      <option>Become a Client</option>
                      <option>Existing Client Support</option>
                      <option>Other</option>
                    </select>
                  </div>

                  {/* Name */}
                  <div>
                    <Label htmlFor="cf-firstName">Name</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input id="cf-firstName" type="text" autoComplete="given-name" className={fieldClass(errors.firstName)} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        <p className="text-xs mt-1" style={{ color: MUTED }}>First</p>
                        <FieldError message={errors.firstName} />
                      </div>
                      <div>
                        <input id="cf-lastName" type="text" autoComplete="family-name" aria-label="Last name" className={fieldClass(errors.lastName)} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                        <p className="text-xs mt-1" style={{ color: MUTED }}>Last</p>
                        <FieldError message={errors.lastName} />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="cf-email">Email</Label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <input id="cf-email" type="email" autoComplete="email" inputMode="email" className={fieldClass(errors.email)} value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <p className="text-xs mt-1" style={{ color: MUTED }}>Email Address</p>
                        <FieldError message={errors.email} />
                      </div>
                      <div>
                        <input id="cf-confirmEmail" type="email" autoComplete="email" inputMode="email" aria-label="Confirm Email Address" className={fieldClass(errors.confirmEmail)} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required />
                        <p className="text-xs mt-1" style={{ color: MUTED }}>Confirm Email Address</p>
                        <FieldError message={errors.confirmEmail} />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="cf-phone">Phone Number</Label>
                    <input id="cf-phone" type="tel" autoComplete="tel" className={fieldClass(errors.phone)} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    <FieldError message={errors.phone} />
                  </div>

                  {/* Address */}
                  <div>
                    <Label htmlFor="cf-streetAddress">Address</Label>
                    <div className="space-y-3">
                      <div>
                        <input id="cf-streetAddress" type="text" className={fieldClass(errors.streetAddress)} placeholder="Street Address" aria-label="Street Address" autoComplete="street-address" maxLength={120} value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} required />
                        <FieldError message={errors.streetAddress} />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <div>
                          <input id="cf-city" type="text" className={fieldClass(errors.city)} placeholder="City" aria-label="City" autoComplete="address-level2" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} required />
                          <FieldError message={errors.city} />
                        </div>
                        <input type="text" className={fieldClass()} placeholder="State/Province (optional)" aria-label="State/Province" autoComplete="address-level1" maxLength={80} value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <input type="text" className={fieldClass()} placeholder="ZIP/Postal (optional)" aria-label="ZIP/Postal" autoComplete="postal-code" maxLength={20} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                        <div>
                          <select id="cf-country" className={fieldClass(errors.country)} aria-label="Country" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} required>
                            <option value="">Select Country</option>
                            {COUNTRIES.map((name) => <option key={name} value={name}>{name}</option>)}
                          </select>
                          <FieldError message={errors.country} />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  {/* Family Status */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                    <div>
                      <Label spaced>Family Status: Are you married?</Label>
                      <YesNo name="married" value={married} onChange={setMarried} vertical />
                    </div>
                    <div>
                      <Label spaced>Family Status: Do you have children?</Label>
                      <YesNo name="children" value={children} onChange={setChildren} vertical />
                    </div>
                  </div>

                  {/* Client type, entity and IRA, in the same order as the DWP application form */}
                  <div>
                    <Label htmlFor="cf-clientType">Client Type</Label>
                    <select id="cf-clientType" className={fieldClass(errors.clientType)} value={clientType} onChange={(e) => setClientType(e.target.value)} required>
                      <option value="">Select One</option>
                      {CLIENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                    <FieldError message={errors.clientType} />
                  </div>

                  <div>
                    <Label spaced>Do you have an LLC, Trust, or Corporation?</Label>
                    <YesNo name="hasEntity" value={hasEntity} onChange={setHasEntity} />
                  </div>

                  {hasEntity === 'Yes' && (
                    <div>
                      <Label htmlFor="cf-entityName" optional>Name of LLC/Trust/Corp?</Label>
                      <input id="cf-entityName" type="text" className={fieldClass()} aria-label="Name of LLC/Trust/Corp" maxLength={120} value={entityName} onChange={(e) => setEntityName(e.target.value)} />
                    </div>
                  )}

                  <div>
                    <Label spaced optional>Do you have a Crypto IRA?</Label>
                    <YesNo name="cryptoIra" value={hasCryptoIRA} onChange={setHasCryptoIRA} />
                  </div>

                  {/* Existing client */}
                  <div>
                    <Label spaced>Are you an existing client of Digital Wealth Partners?</Label>
                    <YesNo name="existing" value={existingClient} onChange={setExistingClient} vertical options={['Existing DWP Client', 'Not Currently a DWP Client']} />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Investable Assets */}
                  <div>
                    <Label htmlFor="cf-investableAssets">Investable Assets</Label>
                    <select id="cf-investableAssets" className={fieldClass(errors.investableAssets)} value={investableAssets} onChange={(e) => setInvestableAssets(e.target.value)} required>
                      <option value="">Select One</option>
                      <option>Under $100K</option>
                      <option>$100K – $500K</option>
                      <option>$500K – $1M</option>
                      <option>$1M+</option>
                    </select>
                    <FieldError message={errors.investableAssets} />
                  </div>

                  {/* Current Allocation & XRP */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                    <div>
                      <Label htmlFor="cf-digitalAllocation">Current Allocation to Digital Assets</Label>
                      <select id="cf-digitalAllocation" className={fieldClass(errors.digitalAllocation)} value={digitalAllocation} onChange={(e) => setDigitalAllocation(e.target.value)} required>
                        <option value="">Select One</option>
                        <option>0%</option>
                        <option>1–10%</option>
                        <option>11–25%</option>
                        <option>26–50%</option>
                        <option>50%+</option>
                      </select>
                      <FieldError message={errors.digitalAllocation} />
                    </div>
                    <div>
                      <Label spaced>Do you currently hold 50,000 or more XRP Tokens?</Label>
                      <YesNo name="xrp" value={holdsXRP} onChange={setHoldsXRP} vertical />
                    </div>
                  </div>

                  {/* Asset to move to custody */}
                  <div id="cf-custodyAssets">
                    <Label>List digital assets you want to move to custody</Label>
                    <MultiSelect options={assetOptions} values={custodyAssets} onChange={setCustodyAssets} loading={assetsLoading} required />
                    <FieldError message={errors.custodyAssets} />
                  </div>

                  {/* Wallets the visitor uses */}
                  <div id="cf-walletsUsed">
                    <Label>Which digital wallets do you currently use?</Label>
                    <MultiSelect
                      options={walletOptions}
                      values={walletsUsed}
                      onChange={(next) => setWalletsUsed(withExclusiveNone(walletsUsed, next, walletLists?.noWallet))}
                      loading={walletsLoading}
                      loadingText="Loading wallets…"
                      searchPlaceholder="Search wallets"
                      placeholder="Select all that apply"
                      required
                    />
                    <FieldError message={errors.walletsUsed} />
                    {walletsUsed.includes(OTHER_CHOICE) && (
                      <>
                        <input id="cf-walletOther" className={fieldClass(errors.walletOther, 'mt-2')} placeholder="Name of the other wallet(s)" aria-label="Name of the other wallet(s)" maxLength={100} value={walletOther} onChange={(e) => setWalletOther(e.target.value)} required />
                        <FieldError message={errors.walletOther} />
                      </>
                    )}
                  </div>

                  {/* Exchanges the visitor uses */}
                  <div id="cf-exchangesUsed">
                    <Label>Which cryptocurrency exchanges do you currently use?</Label>
                    <MultiSelect
                      options={exchangeOptions}
                      values={exchangesUsed}
                      onChange={(next) => setExchangesUsed(withExclusiveNone(exchangesUsed, next, walletLists?.noExchange))}
                      loading={walletsLoading}
                      loadingText="Loading exchanges…"
                      searchPlaceholder="Search exchanges"
                      placeholder="Select all that apply"
                      required
                    />
                    <FieldError message={errors.exchangesUsed} />
                    {exchangesUsed.includes(OTHER_CHOICE) && (
                      <>
                        <input id="cf-exchangeOther" className={fieldClass(errors.exchangeOther, 'mt-2')} placeholder="Name of the other exchange(s)" aria-label="Name of the other exchange(s)" maxLength={100} value={exchangeOther} onChange={(e) => setExchangeOther(e.target.value)} required />
                        <FieldError message={errors.exchangeOther} />
                      </>
                    )}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  {/* Areas of interest (optional) */}
                  <div>
                    <Label optional>Areas of interest</Label>
                    <MultiSelect
                      options={AREA_OPTIONS}
                      values={areasOfInterest}
                      onChange={setAreasOfInterest}
                      placeholder="Select all that apply"
                      searchPlaceholder="Search areas of interest"
                    />
                  </div>

                  {/* Referral source */}
                  <div>
                    <Label htmlFor="cf-referralSource">Referral source (if any):</Label>
                    <select
                      id="cf-referralSource"
                      className={fieldClass(errors.referralSource)}
                      value={referralSource}
                      onChange={(e) => {
                        setReferralSource(e.target.value);
                        if (e.target.value !== OFFICIAL_SOURCE) setReferralOfficial('');
                      }}
                      required
                    >
                      <option value="">Please make a selection</option>
                      {REFERRAL_SOURCES.map((source) => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                    <FieldError message={errors.referralSource} />
                  </div>

                  {/* Which DWP official referred the visitor */}
                  {referralSource === OFFICIAL_SOURCE && (
                    <div>
                      <Label htmlFor="cf-referralOfficial">Which DWP official referred you?</Label>
                      <select id="cf-referralOfficial" className={fieldClass(errors.referralOfficial)} value={referralOfficial} onChange={(e) => setReferralOfficial(e.target.value)} required>
                        <option value="">{officialsLoading ? 'Loading names…' : 'Please make a selection'}</option>
                        {(['Leadership', 'Advisors'] as const).map((group) => {
                          const people = officials.filter((official) => official.group === group);
                          return people.length > 0 ? (
                            <optgroup key={group} label={group}>
                              {people.map((official) => (
                                <option key={official.name} value={official.name}>{official.role ? `${official.name} (${official.role})` : official.name}</option>
                              ))}
                            </optgroup>
                          ) : null;
                        })}
                        <option value={NOT_SURE_OFFICIAL}>{NOT_SURE_OFFICIAL}</option>
                      </select>
                      <FieldError message={errors.referralOfficial} />
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <Label htmlFor="cf-message">Message</Label>
                    <textarea id="cf-message" rows={5} maxLength={750} value={message} onChange={(e) => setMessage(e.target.value)} className={fieldClass(errors.message, 'resize-y')} required />
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <FieldError message={errors.message} />
                      <p className="ml-auto text-xs" style={{ color: MUTED }}>{message.length} of 750 max characters</p>
                    </div>
                  </div>
                </>
              )}

              {step === REVIEW_STEP && (
                <>
                  {reviewSections.map((section) => (
                    <section key={section.step} className="rounded-md border px-4 py-3" style={{ borderColor: '#e6e8ec' }}>
                      <div className="flex items-center justify-between gap-3 border-b pb-2" style={{ borderColor: '#eef0f3' }}>
                        <h4 className="text-sm font-semibold" style={{ color: LABEL_COLOR }}>{STEPS[section.step].title}</h4>
                        <button
                          type="button"
                          onClick={() => goTo(section.step)}
                          className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                          style={{ color: ACCENT }}
                          aria-label={`Edit ${STEPS[section.step].title}`}
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      </div>
                      <dl className="divide-y" style={{ borderColor: '#f1f2f4' }}>
                        {section.rows.map(([label, value]) => <ReviewRow key={label} label={label} value={value} />)}
                      </dl>
                    </section>
                  ))}

                  {/* Disclaimer */}
                  <div>
                    <p className="text-sm mb-3" style={{ color: BODY, lineHeight: '1.7' }}>
                      If you receive any communication outside of our official channels, please report it to
                      DWP immediately. We will never request your seed phrase or ask you to send
                      cryptocurrency via email, Discord, Telegram, or any other informal platform.
                      Cryptocurrency should only be sent to wallet addresses inside your Onramp portal.
                    </p>
                    <label className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: BODY }}>
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="cursor-pointer"
                      />
                      I understand
                    </label>
                    <FieldError message={ackAttempted && !acknowledged ? 'Please confirm you have read this notice' : undefined} />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Back / Next / Submit */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5" style={{ borderColor: '#eef0f3' }}>
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors hover:bg-gray-50"
              style={{ color: BODY, border: '1px solid #d9dde3' }}
            >
              <ArrowLeft size={15} />
              Back
            </button>
          ) : <span />}

          {step < REVIEW_STEP ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              {step === REVIEW_STEP - 1 ? 'Review answers' : 'Next'}
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 flex items-center gap-2 disabled:opacity-75"
              style={{ backgroundColor: ACCENT }}
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
