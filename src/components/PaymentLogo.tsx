import { cn } from '@/lib/utils';

const LOGOS: Record<string, { bg: string; render: () => JSX.Element }> = {
  QRIS: {
    bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    render: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="3" height="3" />
        <line x1="21" y1="14" x2="21" y2="21" />
        <line x1="14" y1="21" x2="21" y2="21" />
      </svg>
    ),
  },
  GOPAY: {
    bg: 'bg-[#00AED6]',
    render: () => (
      <span className="text-white font-extrabold text-[11px] tracking-tight leading-none">Go</span>
    ),
  },
  OVO: {
    bg: 'bg-[#4C2A86]',
    render: () => (
      <span className="text-white font-extrabold text-[10px] tracking-wider leading-none">OVO</span>
    ),
  },
  DANA: {
    bg: 'bg-[#108EE9]',
    render: () => (
      <span className="text-white font-extrabold text-[10px] tracking-wide leading-none">DANA</span>
    ),
  },
  SHOPEEPAY: {
    bg: 'bg-[#EE4D2D]',
    render: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>
    ),
  },
  VA_BCA: {
    bg: 'bg-[#003D79]',
    render: () => (
      <span className="text-white font-extrabold text-[9px] tracking-wider leading-none">BCA</span>
    ),
  },
  VA_MANDIRI: {
    bg: 'bg-[#003876]',
    render: () => (
      <span className="text-[#FFCF00] font-extrabold text-[8px] tracking-tight leading-none">MDR</span>
    ),
  },
  VA_BNI: {
    bg: 'bg-[#EC6726]',
    render: () => (
      <span className="text-white font-extrabold text-[9px] tracking-wider leading-none">BNI</span>
    ),
  },
  BANK_TRANSFER: {
    bg: 'bg-slate-600',
    render: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
};

interface Props {
  methodId: string;
  size?: 'sm' | 'md';
  selected?: boolean;
}

export default function PaymentLogo({ methodId, size = 'md', selected }: Props) {
  const logo = LOGOS[methodId.toUpperCase()];
  const dim = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';

  if (logo) {
    return (
      <div className={cn(dim, 'flex items-center justify-center shrink-0 shadow-sm', logo.bg)}>
        {logo.render()}
      </div>
    );
  }

  return (
    <div className={cn(dim, 'flex items-center justify-center shrink-0', selected ? 'bg-teal-100' : 'bg-slate-100')}>
      <svg viewBox="0 0 24 24" className={cn('w-5 h-5', selected ? 'text-teal-600' : 'text-slate-400')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    </div>
  );
}
