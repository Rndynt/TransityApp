import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 't_onboarding_done';

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function markOnboardingDone(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

interface Slide {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bgClass: string;
  accentColor: string;
}

const slides: Slide[] = [
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="20" width="48" height="28" rx="6" stroke="white" strokeWidth="2.5" />
        <circle cx="18" cy="48" r="5" stroke="white" strokeWidth="2.5" />
        <circle cx="46" cy="48" r="5" stroke="white" strokeWidth="2.5" />
        <path d="M8 32h48" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="14" y="25" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.3)" />
        <rect x="26" y="25" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.3)" />
        <rect x="38" y="25" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
    title: 'Shuttle Bus\nDalam Genggaman',
    subtitle: 'Cari dan pesan tiket shuttle bus antarkota langsung dari HP-mu',
    bgClass: 'from-teal-800 via-teal-900 to-emerald-950',
    accentColor: 'bg-teal-400',
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <path d="M12 20L32 8l20 12v24L32 56 12 44V20z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="32" cy="28" r="6" stroke="white" strokeWidth="2.5" />
        <path d="M20 44c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="white" strokeWidth="2.5" />
        <circle cx="20" cy="18" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="44" cy="18" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="32" cy="52" r="2" fill="rgba(255,255,255,0.4)" />
      </svg>
    ),
    title: 'Banyak Operator,\nSatu Aplikasi',
    subtitle: 'Bandingkan jadwal dan harga dari berbagai operator shuttle terpercaya',
    bgClass: 'from-indigo-800 via-indigo-900 to-violet-950',
    accentColor: 'bg-indigo-400',
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="16" y="8" width="32" height="48" rx="4" stroke="white" strokeWidth="2.5" />
        <path d="M24 52h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <rect x="22" y="16" width="20" height="12" rx="2" stroke="white" strokeWidth="2" />
        <path d="M28 22l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="22" y="34" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.25)" />
        <rect x="22" y="40" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.15)" />
      </svg>
    ),
    title: 'Pesan Mudah,\nPerjalanan Nyaman',
    subtitle: 'Pilih kursi, bayar, dan dapatkan e-tiket instan tanpa ribet',
    bgClass: 'from-rose-700 via-rose-800 to-pink-950',
    accentColor: 'bg-rose-400',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingPage({ onDone }: Props) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    if (current < slides.length - 1) {
      setCurrent(c => c + 1);
    } else {
      markOnboardingDone();
      onDone();
    }
  }, [current, onDone]);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
  }, []);

  const skip = useCallback(() => {
    markOnboardingDone();
    onDone();
  }, [onDone]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta) > 60) {
      if (touchDelta < 0 && current < slides.length - 1) {
        setCurrent(c => c + 1);
      } else if (touchDelta > 0 && current > 0) {
        setCurrent(c => c - 1);
      }
    }
    setTouchStart(null);
    setTouchDelta(0);
    setSwiping(false);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (e: TouchEvent) => { e.preventDefault(); };
    el.addEventListener('touchmove', preventScroll, { passive: false });
    return () => el.removeEventListener('touchmove', preventScroll);
  }, []);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-[100] flex flex-col transition-all duration-700 ease-out bg-gradient-to-br overflow-hidden',
        slide.bgClass,
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/[0.03] blur-2xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute -bottom-20 right-10 w-56 h-56 rounded-full bg-white/[0.04] blur-2xl" />
      </div>

      <div className="flex justify-end px-5 pt-4 safe-top relative z-10">
        {!isLast && (
          <button
            onClick={skip}
            className="text-[13px] font-medium text-white/60 hover:text-white/90 transition-colors px-3 py-1.5 rounded-full"
          >
            Lewati
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div
          className="relative"
          style={{
            transform: swiping ? `translateX(${touchDelta * 0.3}px)` : 'translateX(0)',
            transition: swiping ? 'none' : 'transform 0.4s ease-out',
          }}
        >
          <div className={cn(
            'w-36 h-36 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto',
            'bg-white/10 backdrop-blur-sm border border-white/10',
            'shadow-[0_8px_40px_rgba(0,0,0,0.2)]',
            'transition-transform duration-500',
          )}>
            <div className="transition-all duration-500 ease-out" key={current}>
              {slide.icon}
            </div>
          </div>

          <h1
            key={`title-${current}`}
            className="text-[32px] leading-[1.15] font-bold text-white text-center mb-4 font-display whitespace-pre-line anim-fade"
          >
            {slide.title}
          </h1>

          <p
            key={`sub-${current}`}
            className="text-[15px] leading-relaxed text-white/65 text-center max-w-[280px] mx-auto anim-fade"
          >
            {slide.subtitle}
          </p>
        </div>
      </div>

      <div className="px-8 pb-10 safe-bottom relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'h-[6px] rounded-full transition-all duration-500',
                i === current
                  ? `w-8 ${slide.accentColor}`
                  : 'w-[6px] bg-white/25 hover:bg-white/40',
              )}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className={cn(
            'w-full h-14 rounded-2xl text-[15px] font-bold transition-all duration-300 active:scale-[0.97]',
            isLast
              ? 'bg-white text-teal-900 shadow-[0_4px_20px_rgba(255,255,255,0.25)]'
              : 'bg-white/15 text-white border border-white/20 backdrop-blur-sm hover:bg-white/25',
          )}
        >
          {isLast ? 'Mulai Sekarang' : 'Lanjut'}
        </button>
      </div>
    </div>
  );
}
