import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNav, useAuth } from '@/App';
import { bookingsApi, type BookingListItem } from '@/lib/api';
import { fmtCurrency, fmtTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Ticket, LogIn, CalendarDays, Search, Clock, Bus, MapPin, Users, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { BookingCardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const val = Math.max(0, Math.floor(diff / 1000));
      setRemaining(val);
      if (val <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (remaining <= 0) return null;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const isUrgent = remaining <= 120;
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums',
      isUrgent ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'
    )}>
      <Clock className="w-3 h-3" />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}

type StatusStyle = { label: string; variant: string; bg: string; text: string; dot: string };

const STATUS_CFG: Record<string, StatusStyle> = {
  held: { label: 'Menunggu Pembayaran', variant: 'warning', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  confirmed_paid: { label: 'Terkonfirmasi', variant: 'success', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  confirmed_unpaid: { label: 'Menunggu Pembayaran', variant: 'warning', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  completed: { label: 'Selesai', variant: 'secondary', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
  expired: { label: 'Kedaluwarsa', variant: 'destructive', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
};

function getDisplayStatus(booking: BookingListItem): StatusStyle {
  if (booking.status === 'confirmed' && !booking.paymentMethod) {
    return STATUS_CFG['confirmed_unpaid'];
  }
  if (booking.status === 'confirmed') {
    return STATUS_CFG['confirmed_paid'];
  }
  return STATUS_CFG[booking.status || ''] || { label: booking.status || 'Unknown', variant: 'secondary', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
}

function StatusPill({ booking }: { booking: BookingListItem }) {
  const cfg = getDisplayStatus(booking);
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function TicketCard({ booking, index, onClick }: { booking: BookingListItem; index: number; onClick: () => void }) {
  const hasRoute = booking.origin || booking.destination;
  const departTime = booking.origin?.departAt ? fmtTime(booking.origin.departAt) : null;
  const arriveTime = booking.destination?.arriveAt ? fmtTime(booking.destination.arriveAt) : null;
  const isInactive = booking.status === 'cancelled' || booking.status === 'expired' || booking.status === 'completed';

  let dateLabel = '';
  try {
    if (booking.serviceDate) dateLabel = format(parseISO(booking.serviceDate), 'EEEE, d MMM yyyy', { locale: idLocale });
  } catch {}

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left transition-all active:scale-[0.98] anim-slide-up',
        `delay-${Math.min(index + 1, 4)}`,
        isInactive && 'opacity-60',
      )}
      data-testid={`card-booking-${booking.id}`}
    >
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="relative px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center',
                isInactive ? 'bg-slate-100' : 'bg-teal-50'
              )}>
                <Bus className={cn('w-4 h-4', isInactive ? 'text-slate-400' : 'text-teal-600')} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  {booking.operatorName || 'Shuttle'}
                </p>
              </div>
            </div>
            <StatusPill booking={booking} />
          </div>

          {hasRoute ? (
            <div className="flex items-stretch gap-3">
              <div className="flex flex-col items-center py-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-teal-500 bg-white" />
                <div className="w-[1.5px] flex-1 bg-gradient-to-b from-teal-400 to-coral-400 my-1 min-h-[24px]" />
                <div className="w-2.5 h-2.5 rounded-full bg-coral-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[15px] text-slate-800 truncate">
                      {booking.origin?.name || booking.origin?.city || '-'}
                    </p>
                    {booking.origin?.city && booking.origin?.name && (
                      <p className="text-[11px] text-slate-400">{booking.origin.city}</p>
                    )}
                  </div>
                  {departTime && (
                    <span className="text-[18px] font-display font-bold text-teal-800 tabular-nums ml-3 shrink-0">
                      {departTime}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[15px] text-slate-800 truncate">
                      {booking.destination?.name || booking.destination?.city || '-'}
                    </p>
                    {booking.destination?.city && booking.destination?.name && (
                      <p className="text-[11px] text-slate-400">{booking.destination.city}</p>
                    )}
                  </div>
                  {arriveTime && (
                    <span className="text-[18px] font-display font-bold text-slate-500 tabular-nums ml-3 shrink-0">
                      {arriveTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : booking.passengerName ? (
            <div className="flex items-center gap-2 py-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-[14px] text-slate-700">{booking.passengerName}</span>
              {booking.seatNumbers.length > 0 && (
                <span className="text-[11px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                  Kursi {booking.seatNumbers.join(', ')}
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 w-full flex items-center">
            <div className="w-3 h-6 bg-slate-50 rounded-r-full -ml-[1px]" />
            <div className="flex-1 border-t-2 border-dashed border-slate-100 mx-1" />
            <div className="w-3 h-6 bg-slate-50 rounded-l-full -mr-[1px]" />
          </div>
        </div>

        <div className="px-4 pt-5 pb-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dateLabel && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <CalendarDays className="w-3 h-3" />
                  {dateLabel}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {booking.status === 'held' && booking.holdExpiresAt && (
                <HoldCountdown expiresAt={booking.holdExpiresAt} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-slate-400 font-medium">
                {booking.seatNumbers.length > 0
                  ? `Kursi ${booking.seatNumbers.join(', ')}`
                  : `${booking.passengerCount} penumpang`
                }
              </span>
            </div>
            <span className={cn(
              'font-display font-extrabold text-[18px]',
              isInactive ? 'text-slate-400' : 'text-teal-800'
            )}>
              {fmtCurrency(booking.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function MyTripsPage() {
  const { navigate } = useNav();
  const { user, isLoggedIn } = useAuth();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.list(),
    enabled: !!user,
    refetchInterval: (query) => {
      const data = query.state.data as typeof bookings;
      return data?.some(b => b.status === 'held' && b.holdExpiresAt) ? 30000 : false;
    },
  });

  const activeCount = bookings?.filter(b => b.status === 'confirmed' || b.status === 'held').length ?? 0;

  const activeBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'held') || [];
  const pastBookings = bookings?.filter(b => b.status !== 'confirmed' && b.status !== 'held') || [];

  return (
    <div className="anim-fade min-h-screen bg-slate-50">
      <PageHeader
        title="Pesanan Saya"
        subtitle={isLoggedIn
          ? (isLoading ? 'Memuat pesanan...' : `${activeCount > 0 ? `${activeCount} tiket aktif` : 'Riwayat perjalanan Anda'}`)
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
                <Search className="w-4 h-4 text-amber-600" />
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

        {activeBookings.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-1.5 h-4 rounded-full bg-teal-500" />
              <h2 className="text-[13px] font-bold text-slate-600 uppercase tracking-wider">Tiket Aktif</h2>
            </div>
            <div className="space-y-3">
              {activeBookings.map((b, i) => (
                <TicketCard
                  key={b.id}
                  booking={b}
                  index={i}
                  onClick={() => navigate({ name: 'booking-detail', bookingId: b.id, source: 'gateway' })}
                />
              ))}
            </div>
          </div>
        )}

        {pastBookings.length > 0 && (
          <div>
            {activeBookings.length > 0 && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-1.5 h-4 rounded-full bg-slate-300" />
                <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Riwayat</h2>
              </div>
            )}
            <div className="space-y-3">
              {pastBookings.map((b, i) => (
                <TicketCard
                  key={b.id}
                  booking={b}
                  index={i + activeBookings.length}
                  onClick={() => navigate({ name: 'booking-detail', bookingId: b.id, source: 'gateway' })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
