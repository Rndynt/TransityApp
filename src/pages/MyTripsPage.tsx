import { useQuery } from '@tanstack/react-query';
import { useNav, useAuth } from '@/App';
import { bookingsApi, type BookingListItem } from '@/lib/api';
import { fmtCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Ticket, ChevronRight, LogIn, CalendarDays, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { BookingCardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CFG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  held: { label: 'Menunggu', variant: 'warning' },
  confirmed: { label: 'Aktif', variant: 'success' },
  completed: { label: 'Selesai', variant: 'secondary' },
  cancelled: { label: 'Batal', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'destructive' },
};

export default function MyTripsPage() {
  const { navigate } = useNav();
  const { user, isLoggedIn } = useAuth();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.list(),
    enabled: !!user,
  });

  const activeCount = bookings?.filter(b => b.status === 'confirmed' || b.status === 'held').length ?? 0;

  return (
    <div className="anim-fade min-h-screen bg-slate-50">
      <PageHeader
        title="Pesanan Saya"
        subtitle={isLoggedIn
          ? (isLoading ? 'Memuat pesanan...' : `${activeCount > 0 ? `${activeCount} tiket aktif` : 'Riwayat dan tiket aktif Anda'}`)
          : 'Masuk untuk melihat pesanan'
        }
        rightContent={isLoggedIn && bookings && bookings.length > 0 ? (
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-teal-200" />
          </div>
        ) : undefined}
      />

      <div className="px-4 pt-4 pb-28">
        {!isLoggedIn && (
          <div className="text-center py-12 anim-fade">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-soft flex items-center justify-center">
              <LogIn className="w-8 h-8 text-teal-500" />
            </div>
            <p className="font-bold text-[16px] text-slate-700 mb-1">Masuk untuk melihat pesanan</p>
            <p className="text-[13px] text-slate-400 mb-6 max-w-[260px] mx-auto leading-relaxed">Login ke akunmu untuk melihat riwayat perjalanan dan tiket aktif</p>
            <Button
              className="h-12 px-10 rounded-2xl bg-teal-900 hover:bg-teal-950 text-[14px] font-bold shadow-lg shadow-teal-900/15"
              onClick={() => navigate({ name: 'auth', returnTo: { name: 'my-trips' } })}
            >
              Masuk / Daftar
            </Button>
          </div>
        )}

        {isLoggedIn && isLoading && (
          <div className="space-y-3 anim-fade">
            {Array.from({ length: 3 }).map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isLoggedIn && !isLoading && (!bookings || bookings.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 anim-fade">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
                <Ticket className="w-11 h-11 text-teal-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center border-4 border-white shadow-sm">
                <span className="text-[16px]">✨</span>
              </div>
            </div>
            <h3 className="font-display font-bold text-[18px] text-slate-800 mb-2">Belum Ada Perjalanan</h3>
            <p className="text-[13px] text-slate-400 text-center max-w-[240px] leading-relaxed mb-8">
              Perjalanan seru menunggumu! Cari dan pesan tiket shuttle bus favoritmu sekarang.
            </p>
            <Button
              className="h-12 px-10 rounded-2xl bg-teal-900 hover:bg-teal-950 text-[14px] font-bold shadow-lg shadow-teal-900/15 gap-2"
              onClick={() => navigate({ name: 'home' })}
            >
              <Search className="w-4 h-4" />
              Cari Perjalanan
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {bookings?.map((b: BookingListItem, i: number) => {
            const st = STATUS_CFG[b.status || ''] || { label: b.status, variant: 'secondary' as const };
            let dateLabel = '';
            try { if (b.serviceDate) dateLabel = format(parseISO(b.serviceDate), 'd MMM yyyy', { locale: idLocale }); } catch {}

            return (
              <button
                key={b.id}
                onClick={() => navigate({ name: 'booking-detail', bookingId: b.id, source: 'gateway' })}
                className={cn(
                  'w-full text-left bg-white rounded-2xl shadow-soft overflow-hidden transition-all hover:shadow-lifted active:scale-[0.98] anim-slide-up',
                  `delay-${Math.min(i + 1, 4)}`,
                )}
                data-testid={`card-booking-${b.id}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] text-slate-800 truncate">{b.patternName || b.patternCode || 'Perjalanan'}</p>
                      <p className="text-[12px] text-slate-400 mt-0.5">{dateLabel}</p>
                    </div>
                    <Badge variant={st.variant} className="rounded-lg text-[10px] font-bold shrink-0 ml-2">{st.label}</Badge>
                  </div>

                  <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600 mb-2">
                    <span className="truncate max-w-[40%]">{b.origin?.name || b.origin?.city || '-'}</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                    <span className="truncate max-w-[40%]">{b.destination?.name || b.destination?.city || '-'}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                    <span className="text-[12px] text-slate-400">{b.passengerCount} penumpang</span>
                    <span className="font-display font-bold text-[15px] text-teal-800">{fmtCurrency(b.totalAmount)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
