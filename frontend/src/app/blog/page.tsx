'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';
import { Search, Calendar, User, Folder, MessageSquare, ChevronRight } from 'lucide-react';

const BLOG_POSTS = [
  {
    "title": "Crypto Estate Planning: Protecting Your Digital Asset Portfolio",
    "date": "February 7, 2026",
    "category": "General",
    "excerpt": "When someone passes away holding Bitcoin or XRP in a cold wallet, NFTs on a marketplace, or tokens in a […]",
    "image": "/crypto-investment-wealth-digital-assets-17.webp",
    "href": "https://www.digitalwealthpartners.net/crypto-estate-planning-protecting-your-digital-asset-portfolio/"
  },
  {
    "title": "Crypto Wealth Management for Families and Foundations",
    "date": "February 5, 2026",
    "category": "General",
    "excerpt": "The world of wealth management is changing fast. Your family office or foundation might be wondering whether crypto deserves a […]",
    "image": "/crypto-investment-wealth-digital-assets-26.webp",
    "href": "https://www.digitalwealthpartners.net/crypto-wealth-management-for-families-and-foundations/"
  },
  {
    "title": "Crypto Custody Services & Security Solutions for High Net Worth Investors",
    "date": "February 2, 2026",
    "category": "General",
    "excerpt": "Understanding Professional Crypto Custody As digital assets continue gaining acceptance among institutional investors and wealthy individuals, secure storage becomes a […]",
    "image": "/crypto-investment-wealth-digital-assets-3.webp",
    "href": "https://www.digitalwealthpartners.net/crypto-custody-services-security-solutions-for-high-net-worth-investors/"
  },
  {
    "title": "Alternative Investments That Balance Crypto Volatility",
    "date": "January 27, 2026",
    "category": "General",
    "excerpt": "You’ve watched Bitcoin surge 40% in weeks, then crater just as fast. Your stock portfolio swings with every Federal Reserve […]",
    "image": "/crypto-investment-wealth-digital-assets-35.webp",
    "href": "https://www.digitalwealthpartners.net/alternative-investments-that-balance-crypto-volatility/"
  },
  {
    "title": "Securities-Backed Lending for Your Wealth Plan",
    "date": "January 26, 2026",
    "category": "General",
    "excerpt": "When you need capital fast, selling your crypto or traditional investments can create several issues. Tax bills arrive. Your carefully […]",
    "image": "/crypto-investment-wealth-digital-assets-41.webp",
    "href": "https://www.digitalwealthpartners.net/securities-backed-lending-for-your-wealth-plan/"
  },
  {
    "title": "Crypto Custody for Retirement Accounts: IRAs, 401(k)s, and 403(b)s",
    "date": "January 25, 2026",
    "category": "General",
    "excerpt": "The landscape of retirement investing has shifted dramatically. Digital assets are no longer confined to individual brokerage accounts. Today, you […]",
    "image": "/crypto-investment-wealth-digital-assets-19.webp",
    "href": "https://www.digitalwealthpartners.net/crypto-custody-for-retirement-accounts-iras-401ks-and-403bs/"
  },
  {
    "title": "Donor-Advised Funds for Crypto Investors",
    "date": "January 25, 2026",
    "category": "General",
    "excerpt": "You’ve built wealth through digital assets and complex investments. Now you want your charitable giving to be as strategic as […]",
    "image": "/crypto-investment-wealth-digital-assets-11.webp",
    "href": "https://www.digitalwealthpartners.net/donor-advised-funds-for-crypto-investors/"
  },
  {
    "title": "Family Office Crypto Services for Digital Asset Management",
    "date": "January 25, 2026",
    "category": "General",
    "excerpt": "When Family Wealth Spans Two Financial Worlds When your family’s wealth spans both traditional investments and digital assets, you’re managing […]",
    "image": "/Digital-Wealth-Partners-Crypto-Financial-Advisor-25.webp",
    "href": "https://www.digitalwealthpartners.net/family-office-crypto-services-for-digital-asset-management/"
  },
  {
    "title": "Digital Asset Advisory Services for RIAs",
    "date": "April 11, 2026",
    "category": "General",
    "excerpt": "The family office world has been fielding crypto questions for years now. Most RIAs have been dodging them just as […]",
    "image": "/crypto-investment-wealth-digital-assets-24.webp",
    "href": "https://www.digitalwealthpartners.net/digital-asset-advisory-services-for-rias/"
  },
  {
    "title": "How Modern Family Offices Connect Your Wealth, Operations, and Future",
    "date": "January 25, 2026",
    "category": "General",
    "excerpt": "You want more than investment advice. You want a coordinated system connecting investments, tax planning, estate strategy, and daily operations […]",
    "image": "/Digital-Wealth-Partners-Crypto-Financial-Advisor-23.webp",
    "href": "https://www.digitalwealthpartners.net/how-modern-family-offices-connect-your-wealth-operations-and-future/"
  }
];

const RECENT_POSTS = BLOG_POSTS.slice(0, 5);

export default function BlogPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
          
          {/* ─── LEFT: MAIN CONTENT ───────────────────────────────────── */}
          <div className="lg:w-2/3">
            <div className="space-y-16">
              {BLOG_POSTS.map((post, idx) => (
                <FadeIn key={idx} direction="up" delay={idx * 0.05}>
                  <article className="pb-16 border-b border-gray-100 last:border-0">
                    {/* Featured Image */}
                    <Link href={post.href} className="block relative aspect-[16/9] mb-8 rounded-sm overflow-hidden shadow-sm group">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        priority={idx === 0}
                      />
                    </Link>

                    {/* Post Meta */}
                    <div className="flex flex-wrap items-center gap-6 mb-6 text-sm" style={{ color: '#718096' }}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Digital Wealth Partners</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" />
                        <span>{post.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Comments Off</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 
                      className="font-bold mb-6 hover:text-[#AD7F4E] transition-colors leading-tight"
                      style={{ color: '#1e266d', fontSize: '32px' }}
                    >
                      <Link href={post.href}>
                        {post.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-lg leading-relaxed mb-10" style={{ color: '#4a5568' }}>
                      {post.excerpt}
                    </p>

                    {/* Read More Button */}
                    <Link
                      href={post.href}
                      className="inline-flex items-center gap-2 text-white font-semibold px-8 py-3.5 rounded transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#2C3342', fontSize: '15px' }}
                    >
                      Read more
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </article>
                </FadeIn>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-10 flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center rounded bg-[#1e266d] text-white font-bold">1</button>
              <button className="w-10 h-10 flex items-center justify-center rounded border border-gray-100 text-gray-700 hover:border-[#AD7F4E] hover:text-[#AD7F4E] transition-colors">2</button>
              <button className="w-10 h-10 flex items-center justify-center rounded border border-gray-100 text-gray-700 hover:border-[#AD7F4E] hover:text-[#AD7F4E] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── RIGHT: SIDEBAR ───────────────────────────────────────── */}
          <aside className="lg:w-1/3">
            <FadeIn direction="up" delay={0.2}>
              <div className="space-y-12 sticky top-32">
                
                {/* Search */}
                <div>
                  <h3 className="font-bold mb-5 text-lg" style={{ color: '#1e266d' }}>Search</h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search ..."
                      className="w-full bg-[#f7f8fa] border-none px-5 py-4 pr-12 text-sm rounded-sm focus:outline-none focus:ring-1 focus:ring-[#AD7F4E] transition-all"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Recent Posts */}
                <div>
                  <h3 className="font-bold mb-6 text-lg" style={{ color: '#1e266d' }}>Recent Posts</h3>
                  <div className="space-y-6">
                    {RECENT_POSTS.map((post, idx) => (
                      <Link key={idx} href={post.href} className="group flex gap-4 items-start">
                        <div className="relative w-16 h-16 shrink-0 rounded-sm overflow-hidden">
                          <Image
                            src={post.image}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-110"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <h4 
                            className="font-bold text-sm leading-snug transition-colors group-hover:text-[#AD7F4E]"
                            style={{ color: '#1e266d' }}
                          >
                            {post.title}
                          </h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Follow Us */}
                <div>
                  <h3 className="font-bold mb-6 text-lg" style={{ color: '#1e266d' }}>Follow Us</h3>
                  <div className="flex gap-4">
                    <a 
                      href="#" 
                      className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-[#AD7F4E]">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.858L2.002 2.25h6.958l4.265 5.643 5.019-5.643zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  </div>
                </div>

              </div>
            </FadeIn>
          </aside>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
