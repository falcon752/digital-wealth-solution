'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

// ─── Team data ─────────────────────────────────────────────────────────────
const leadership = [
  {
    name: 'Max Kahn',
    role: 'CEO',
    photo: '/team/max-kahn.jpg',
    bio: 'Max Kahn is the Chief Executive Officer of Digital Wealth Partner, overseeing strategy and operations across the platform.',
    linkedin: '#',
    showBadge: true,
  },
  {
    name: 'Erin Friez',
    role: 'Chairman and President',
    photo: '/team/erin-friez.jpg',
    bio: 'Erin Friez is the President and Chairman of Digital Wealth Partner, a SEC-registered investment firm.',
    linkedin: '#',
    showBadge: true,
  },
  {
    name: 'Anthony Dixon',
    role: 'Director of Fund Operations',
    photo: '/team/anthony-dixon.png',
    bio: 'Anthony Dixon serves as Director of Fund Operations, managing institutional client portfolios and fund logistics.',
    linkedin: '#',
    showBadge: true,
  },
  {
    name: 'Ted Bean',
    role: 'Head of Operations',
    photo: '/team/ted-bean.jpg',
    bio: "Ted Bean's role at Digital Wealth Partner centers around internal processes, compliance infrastructure and team coordination.",
    linkedin: '#',
    showBadge: true,
  },
];

const advisors = [
  { name: 'Ashley Papa', role: 'Director of Wealth Management', photo: '/team/ashley-papa.jpg', bio: 'Ashley values becoming part of the family when she joins a client relationship.', linkedin: '#', showBadge: true },
  { name: 'Tom Teal', role: 'Head of Financial Planning', photo: '/team/tom-teal.jpg', bio: 'After graduating from Virginia Tech with a degree in Electrical Engineering, Tom built a career in financial services.', linkedin: '#', showBadge: true },
  { name: 'Stefan Griess', role: 'Technology Advisor', photo: '/team/stefan-griess.jpg', bio: 'Stefan Griess spent twelve years working as an IT Engineer before moving into investment advisory.', linkedin: '#' },
  { name: 'Jose Amaro', role: 'Investment Advisor', photo: '/team/jose-amaro.png', bio: 'Jose Amaro is an Investment Advisor at Digital Wealth Partner, specialising in digital asset allocation.', linkedin: '#' },
  { name: 'Josh Tessar', role: 'Investment Advisor', photo: '/team/josh-tessar.jpg', bio: 'Josh Tessar brings deep knowledge in structured products and alternative investments.', linkedin: '#' },
  { name: 'Andrew Carnes', role: 'Financial Advisor', photo: '/team/andrew-carnes.jpg', bio: 'Andrew Carnes is a financial advisor at Digital Wealth Partner, focused on client portfolio growth.', linkedin: '#' },
  { name: "Jen O'Hara", role: 'Investment Advisor', photo: '/team/jen-ohara.png', bio: "Jennifer O'Hara is an Investment Advisor at Digital Wealth Partner.", linkedin: '#' },
  { name: 'Matt VanBussum', role: 'Financial Advisor', photo: '/team/matt-vanbussum.png', bio: 'Matt VanBussum specialises in retirement planning and crypto portfolio construction.', linkedin: '#' },
  { name: 'Daniela Pernia', role: 'Financial Advisor', photo: '/team/daniela-pernia.jpg', bio: 'Daniela Pernia grew up watching her parents rebuild a life through disciplined investing.', linkedin: '#' },
  { name: 'Nick Barnett', role: 'Financial Professional', photo: '/team/nick-barnett.jpg', bio: 'Nicholas Barnett is a financial professional at Digital Wealth Partner.', linkedin: '#' },
  { name: 'PJ Braccia', role: 'Financial Advisor', photo: '/team/pj-braccia.jpg', bio: 'PJ Braccia is a financial advisor at Digital Wealth Partner.', linkedin: '#' },
  { name: 'Connor McLaughlin', role: 'Financial Advisor', photo: '/team/connor-mclaughlin.jpg', bio: 'Connor McLaughlin is a financial advisor at Digital Wealth Partner.', linkedin: '#' },
  { name: 'Sebastian Jennings', role: 'Financial Advisor', photo: '/team/sebastian-jennings.jpg', bio: 'Sebastian Jennings came to be a financial advisor by joining a client-first culture.', linkedin: '#' },
  { name: 'Fred Weisbrod', role: 'Financial Advisor', photo: '/team/fred-weisbrod.png', bio: 'Fred Weisbrod spent the early part of his career as a senior analyst before moving to advisory.', linkedin: '#' },
  { name: 'Brian Cobb', role: 'Investment Advisor', photo: '/team/brian-cobb.png', bio: 'Brian Cobb is an Investment Advisor at Digital Wealth Partner.', linkedin: '#' },
  { name: 'Tim Githens', role: 'Investment Advisor', photo: '/team/tim-githens.jpg', bio: 'Tim Githens brings institutional experience to client digital asset strategies.', linkedin: '#' },
  { name: 'Joe Slattery', role: 'Financial Advisor', photo: '/team/joe-slattery.jpg', bio: 'Joe Slattery works as a financial advisor at Digital Wealth Partner.', linkedin: '#' },
  { name: 'Aaron Bailey', role: 'Investment Advisor', photo: '/team/aaron-bailey.png', bio: 'Aaron Bailey is an Investment Advisor at Digital Wealth Partner.', linkedin: '#' },
  { name: 'Ryan Atchley', role: 'Financial Advisor', photo: '/team/ryan-atchley.jpg', bio: 'Ryan grew up in Iowa and moved to Utah for his career in financial services.', linkedin: '#' },
  { name: 'Tish Troutman', role: 'Financial Advisor', photo: '/team/tish-troutman.jpg', bio: 'Tish Troutman is a financial advisor at Digital Wealth Partner.', linkedin: '#' },
  { name: 'Tyler Ochs', role: 'Financial Advisor', photo: '/team/tyler-ochs.png', bio: 'Tyler Ochs is a financial advisor at Digital Wealth Partner, based in the midwest.', linkedin: '#' },
  { name: 'Dax Westlund, CBDA', role: 'Investment Advisor', photo: '/team/dax-westlund.jpg', bio: 'Dax Westlund is an Investment Advisor at Digital Wealth Partner.', linkedin: '#' },
  { name: 'Sam Syed', role: 'Wealth Management', photo: '/team/sam-syed.jpg', bio: 'Sam Syed brings over two decades of wealth management experience.', linkedin: '#' },
];

// ─── Re-usable member card ──────────────────────────────────────────────────
function MemberCard({ name, role, photo, bio, linkedin, showBadge = false }: {
  name: string; role: string; photo: string; bio: string; linkedin: string; showBadge?: boolean;
}) {
  return (
    <div className="bg-white rounded-sm overflow-hidden flex flex-col" style={{ boxShadow: '0 2px 16px rgba(30,38,109,0.08)' }}>
      {/* Photo */}
      <div className="relative w-full" style={{ paddingTop: '100%' }}>
        <Image src={photo} alt={name} fill className="object-cover object-top" unoptimized />
        {/* Role badge – only for tagged members */}
        {showBadge && (
          <div className="absolute top-3 left-0 right-0 flex justify-center">
            <span
              className="text-white text-xs font-semibold px-3 py-1 rounded-sm"
              style={{ backgroundColor: '#1e266d', fontSize: '11px', letterSpacing: '0.03em' }}
            >
              {role}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold mb-2" style={{ color: '#1e266d', fontSize: '17px' }}>{name}</h3>
        <p className="text-sm leading-relaxed flex-1" style={{ color: '#4a5568', fontSize: '13px' }}>
          {bio.length > 90 ? bio.slice(0, 90) + '…' : bio}
        </p>
        {/* LinkedIn icon */}
        <div className="mt-4">
          <a
            href={linkedin}
            aria-label={`${name} LinkedIn`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#AD7F4E' }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Section divider ────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 my-14">
      <div className="flex-1 h-px" style={{ backgroundColor: '#1e266d' }} />
      <h2 className="font-bold px-2 shrink-0" style={{ color: '#1e266d', fontSize: '28px' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor: '#1e266d' }} />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">

      <Navbar transparent={true} />

      {/* ════════════════════════════════════════════════════════════════
          HERO  – same structure as home, different copy + image
      ════════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: '#eef0f3', minHeight: '700px' }}
      >
        {/* Dot grid – top right */}
        <div
          className="absolute top-4 right-4 grid gap-[6px] pointer-events-none"
          style={{ gridTemplateColumns: 'repeat(12, 4px)', gridTemplateRows: 'repeat(10, 4px)' }}
        >
          {Array.from({ length: 120 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
          ))}
        </div>

        {/* Dot grid – bottom center-left */}
        <div
          className="absolute bottom-8 left-[32%] grid gap-[6px] pointer-events-none"
          style={{ gridTemplateColumns: 'repeat(8, 4px)', gridTemplateRows: 'repeat(4, 4px)' }}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-10 items-center">

          {/* ── Left: text ── */}
          <div className="relative z-10">
            <h1
              className="font-extrabold leading-tight mb-7"
              style={{ color: '#1e266d', fontSize: '51px', lineHeight: '58px' }}
            >
              Meet the team members
            </h1>

            <p className="mb-10 leading-relaxed" style={{ color: '#4a5568', fontSize: '18px' }}>
              Digital Wealth Partner (DWS) is a pioneering Registered Investment Advisor (RIA)
              that specializes in digital assets and alternative investments, catering to Family
              Offices, High Net Worth Individuals (HNWI), and other RIAs. Leveraging a hedge fund
              type model and fee structure, DWS offers a unique blend of expertise in the
              burgeoning field of digital assets, including cryptocurrencies, blockchain-based
              assets, and other non-traditional investment opportunities. Our goal is to provide
              sophisticated, high-return investment strategies that are tailored to the risk
              tolerance and investment objectives of our discerning clientele.
            </p>

            {/* Scroll arrow */}
            <div>
              <a
                href="#leadership"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('leadership')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors hover:bg-white"
                style={{ borderColor: '#2C3342', color: '#2C3342' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </a>
            </div>
          </div>

          {/* ── Right: dallas city + logo card ── */}
          <div className="relative flex items-center justify-center">
            <div
              className="relative overflow-hidden rounded-lg shadow-2xl"
              style={{ width: '400px', height: '560px', maxWidth: '100%' }}
            >
              <Image
                src="/dallas-downtown.png"
                alt="Digital Wealth Partner"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0" style={{ backgroundColor: 'rgba(44,51,66,0.25)' }} />
              <div className="absolute inset-0 flex items-end justify-center pb-10">
                <Image src="/hero-logo.png" alt="DWS" width={320} height={120} className="w-4/5 object-contain" unoptimized />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          BODY
      ════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 pb-24">

        {/* ── Mission Statement card ── */}
        <div
          className="my-14 text-center py-14 px-8 rounded-sm"
          style={{ border: '1px solid #e5e7eb', boxShadow: '0 2px 16px rgba(30,38,109,0.06)' }}
        >
          {/* Bank icon */}
          <div className="flex justify-center mb-5" style={{ color: '#AD7F4E' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
              <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" />
            </svg>
          </div>
          <h2 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '22px' }}>Mission Statement</h2>
          <p className="max-w-3xl mx-auto leading-relaxed" style={{ color: '#4a5568', fontSize: '15px' }}>
            To redefine wealth management for the digital age by providing unparalleled expertise
            in digital assets and alternative investments, delivering customized, high-performance
            investment solutions to our clients.
          </p>
        </div>

        {/* ── Advisors ── */}
        <div id="leadership">
          <SectionTitle title="Advisors" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {advisors.map((m) => <MemberCard key={m.name} {...m} />)}
          </div>
        </div>

        {/* ── Leadership ── */}
        <div>
          <SectionTitle title="Leadership" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {leadership.map((m) => <MemberCard key={m.name} {...m} />)}
          </div>
        </div>

      </div>

      <SiteFooter />
    </div>
  );
}
