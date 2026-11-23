'use client';

/**
 * The first step of forming an LLC: choose a new or an existing company. The dashboard layout
 * renders this page without the sidebar, so it carries the same top bar and spacing as the rest.
 */
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, RefreshCw, Shield, BarChart3, Layers } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, PageHeader } from '@/components/client/ui';

const STRUCTURES = [
  {
    icon: Building2,
    title: 'Holding Companies',
    description: 'Protect assets and manage multiple businesses under one parent company.',
  },
  {
    icon: Shield,
    title: 'Asset Protection',
    description: 'Separate business entities to minimize risk and protect personal assets.',
  },
  {
    icon: Layers,
    title: 'Series LLCs',
    description: "Multiple protected 'cells' under one LLC structure for asset protection.",
  },
  {
    icon: BarChart3,
    title: 'Tax Efficiency',
    description: 'Optimize tax structure through strategic entity organization.',
  },
];

const CHOICES = [
  {
    icon: Building2,
    title: 'New Company',
    description: 'Perfect for starting a standalone business or individual venture.',
    href: '/dashboard/llc/new?type=new',
    variant: 'primary' as const,
  },
  {
    icon: RefreshCw,
    title: 'Existing Company',
    description: 'Switch to our registered agent service for enhanced protection and support.',
    href: '/dashboard/llc/new?type=existing',
    variant: 'outline' as const,
  },
];

export default function LLCStartPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-cd-page text-cd-text">
      <DashboardHeader title="Form a new LLC" backHref="/dashboard/llc" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Building2}
          title="Start your business journey"
          titleOnPhone={false}
          meta={["Choose the structure that best fits your business needs. We'll help you make the right choice."]}
        />

        {/* Choice cards */}
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-9">
          {CHOICES.map(({ icon: Icon, title, description, href, variant }) => (
            <Card key={title} bodyClassName="flex h-full flex-col p-5 sm:p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-cd-raised text-cd-text">
                <Icon size={21} strokeWidth={1.75} />
              </span>
              <h2 className="mt-4 text-[18px] font-medium text-cd-text">{title}</h2>
              <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-cd-muted">{description}</p>
              <ActionButton
                onClick={() => router.push(href)}
                variant={variant}
                className="mt-5 w-full flex-row-reverse"
                icon={ArrowRight}
              >
                Choose
              </ActionButton>
            </Card>
          ))}
        </div>

        {/* Understanding Business Structures */}
        <Card title="Understanding business structures" className="mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {STRUCTURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3.5 px-2 py-3 sm:px-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cd-raised text-cd-text">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-cd-text">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-cd-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-6 flex justify-center">
          <ActionButton variant="ghost" icon={ArrowLeft} onClick={() => router.push('/dashboard/llc')}>
            Back to LLC applications
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
