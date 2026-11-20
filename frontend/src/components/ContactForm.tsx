'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      .catch(() => { /* The question stays visible; submission explains the problem if the list cannot load. */ })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      toast.error('Email addresses do not match!');
      return;
    }

    if (!acknowledged) {
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

  return (
    <>
      <style>{radioStyle}</style>
      <form onSubmit={handleSubmit} className="dwp-contact-form space-y-6">
        <p className="text-sm" style={{ color: '#718096' }}>All fields are required unless marked (optional).</p>

        {/* What brings you here */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            What brings you here today?
          </label>
          <select
            className="dwp-field w-full px-3 py-2 text-sm font-medium"
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
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Name
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                className="dwp-field w-full px-3 py-2 text-sm"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <p className="text-xs mt-1" style={{ color: '#718096' }}>First</p>
            </div>
            <div>
              <input
                type="text"
                className="dwp-field w-full px-3 py-2 text-sm"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <p className="text-xs mt-1" style={{ color: '#718096' }}>Last</p>
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Email
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="email"
                className="dwp-field w-full px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs mt-1" style={{ color: '#718096' }}>Email Address</p>
            </div>
            <div>
              <input
                type="email"
                className="dwp-field w-full px-3 py-2 text-sm"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                required
              />
              <p className="text-xs mt-1" style={{ color: '#718096' }}>Confirm Email Address</p>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Phone Number
          </label>
          <input
            type="tel"
            className="dwp-field w-full px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Address
          </label>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                className="dwp-field w-full px-3 py-2 text-sm"
                placeholder="Street Address"
                aria-label="Street Address"
                autoComplete="street-address"
                maxLength={120}
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <input
                type="text"
                className="dwp-field w-full px-3 py-2 text-sm"
                placeholder="City"
                aria-label="City"
                autoComplete="address-level2"
                maxLength={80}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <input
                type="text"
                className="dwp-field w-full px-3 py-2 text-sm"
                placeholder="State/Province (optional)"
                aria-label="State/Province"
                autoComplete="address-level1"
                maxLength={80}
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <input
                type="text"
                className="dwp-field w-full px-3 py-2 text-sm"
                placeholder="ZIP/Postal (optional)"
                aria-label="ZIP/Postal"
                autoComplete="postal-code"
                maxLength={20}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
              <select
                className="dwp-field w-full px-3 py-2 text-sm"
                aria-label="Country"
                autoComplete="country-name"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              >
                <option value="">Select Country</option>
                {COUNTRIES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Family Status */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
              Family Status: Are you married?
            </label>
            <div className="space-y-1">
              {['Yes', 'No'].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                  <input 
                    type="radio" 
                    name="married" 
                    value={v} 
                    className="custom-radio" 
                    checked={married === v}
                    onChange={(e) => setMarried(e.target.value)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
              Family Status: Do you have children?
            </label>
            <div className="space-y-1">
              {['Yes', 'No'].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                  <input 
                    type="radio" 
                    name="children" 
                    value={v} 
                    className="custom-radio" 
                    checked={children === v}
                    onChange={(e) => setChildren(e.target.value)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Investable Assets */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Investable Assets
          </label>
          <select
            className="dwp-field w-full px-3 py-2 text-sm"
            value={investableAssets}
            onChange={(e) => setInvestableAssets(e.target.value)}
            required
          >
            <option value="">Select One</option>
            <option>Under $100K</option>
            <option>$100K – $500K</option>
            <option>$500K – $1M</option>
            <option>$1M+</option>
          </select>
        </div>

        {/* Client type, entity and IRA, in the same order as the DWP application form */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Client Type
          </label>
          <select
            className="dwp-field w-full px-3 py-2 text-sm"
            value={clientType}
            onChange={(e) => setClientType(e.target.value)}
            required
          >
            <option value="">Select One</option>
            {CLIENT_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
            Do you have an LLC, Trust, or Corporation?
          </label>
          <div className="flex gap-6">
            {['Yes', 'No'].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                <input
                  type="radio"
                  name="hasEntity"
                  value={v}
                  className="custom-radio"
                  checked={hasEntity === v}
                  onChange={(e) => setHasEntity(e.target.value)}
                />
                {v}
              </label>
            ))}
          </div>
        </div>

        {hasEntity === 'Yes' && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
              Name of LLC/Trust/Corp? <span className="font-normal" style={{ color: '#718096' }}>(optional)</span>
            </label>
            <input
              type="text"
              className="dwp-field w-full px-3 py-2 text-sm"
              aria-label="Name of LLC/Trust/Corp"
              maxLength={120}
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
            Do you have a Crypto IRA? <span className="font-normal" style={{ color: '#718096' }}>(optional)</span>
          </label>
          <div className="flex gap-6">
            {['Yes', 'No'].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                <input
                  type="radio"
                  name="cryptoIra"
                  value={v}
                  className="custom-radio"
                  checked={hasCryptoIRA === v}
                  onChange={(e) => setHasCryptoIRA(e.target.value)}
                />
                {v}
              </label>
            ))}
          </div>
        </div>

        {/* Current Allocation & XRP */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
              Current Allocation to Digital Assets
            </label>
            <select
              className="dwp-field w-full px-3 py-2 text-sm"
              value={digitalAllocation}
              onChange={(e) => setDigitalAllocation(e.target.value)}
              required
            >
              <option value="">Select One</option>
              <option>0%</option>
              <option>1–10%</option>
              <option>11–25%</option>
              <option>26–50%</option>
              <option>50%+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
              Do you currently hold 50,000 or more XRP Tokens?
            </label>
            <div className="space-y-1">
              {['Yes', 'No'].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                  <input 
                    type="radio" 
                    name="xrp" 
                    value={v} 
                    className="custom-radio" 
                    checked={holdsXRP === v}
                    onChange={(e) => setHoldsXRP(e.target.value)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Existing client */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
            Are you an existing client of Digital Wealth Partners?
          </label>
          <div className="space-y-1">
            {['Existing DWP Client', 'Not Currently a DWP Client'].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                <input 
                  type="radio" 
                  name="existing" 
                  value={v} 
                  className="custom-radio" 
                  checked={existingClient === v}
                  onChange={(e) => setExistingClient(e.target.value)}
                />
                {v}
              </label>
            ))}
          </div>
        </div>

        {/* Areas of interest (optional) */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Areas of interest <span className="font-normal" style={{ color: '#718096' }}>(optional)</span>
          </label>
          <MultiSelect
            options={AREA_OPTIONS}
            values={areasOfInterest}
            onChange={setAreasOfInterest}
            placeholder="Select all that apply"
            searchPlaceholder="Search areas of interest"
          />
        </div>

        {/* Asset to move to custody */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            List digital assets you want to move to custody
          </label>
          <MultiSelect
            options={assetOptions}
            values={custodyAssets}
            onChange={setCustodyAssets}
            loading={assetsLoading}
            required
          />
        </div>

        {/* Wallets the visitor uses */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Which digital wallets do you currently use?
          </label>
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
          {walletsUsed.includes(OTHER_CHOICE) && (
            <input
              className="dwp-field mt-2 w-full px-3 py-2 text-sm"
              placeholder="Name of the other wallet(s)"
              aria-label="Name of the other wallet(s)"
              maxLength={100}
              value={walletOther}
              onChange={(e) => setWalletOther(e.target.value)}
              required
            />
          )}
        </div>

        {/* Exchanges the visitor uses */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Which cryptocurrency exchanges do you currently use?
          </label>
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
          {exchangesUsed.includes(OTHER_CHOICE) && (
            <input
              className="dwp-field mt-2 w-full px-3 py-2 text-sm"
              placeholder="Name of the other exchange(s)"
              aria-label="Name of the other exchange(s)"
              maxLength={100}
              value={exchangeOther}
              onChange={(e) => setExchangeOther(e.target.value)}
              required
            />
          )}
        </div>

        {/* Referral source */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Referral source (if any):
          </label>
          <select
            className="dwp-field w-full px-3 py-2 text-sm"
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
        </div>

        {/* Which DWP official referred the visitor */}
        {referralSource === OFFICIAL_SOURCE && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
              Which DWP official referred you?
            </label>
            <select
              className="dwp-field w-full px-3 py-2 text-sm"
              value={referralOfficial}
              onChange={(e) => setReferralOfficial(e.target.value)}
              required
            >
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
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Message
          </label>
          <textarea
            rows={5}
            maxLength={750}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="dwp-field w-full px-3 py-2 text-sm resize-y"
            required
          />
          <p className="text-xs mt-1" style={{ color: '#718096' }}>
            {message.length} of 750 max characters
          </p>
        </div>

        {/* Disclaimer */}
        <div>
          <p className="text-sm mb-3" style={{ color: '#4a5568', lineHeight: '1.7' }}>
            If you receive any communication outside of our official channels, please report it to
            DWP immediately. We will never request your seed phrase or ask you to send
            cryptocurrency via email, Discord, Telegram, or any other informal platform.
            Cryptocurrency should only be sent to wallet addresses inside your Onramp portal.
          </p>
          <label className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="cursor-pointer"
            />
            I understand
          </label>
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 flex items-center gap-2 disabled:opacity-75"
            style={{ backgroundColor: '#AD7F4E' }}
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </>
  );
}
