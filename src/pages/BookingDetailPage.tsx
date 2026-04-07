import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNav } from '@/App';
import { bookingsApi } from '@/lib/api';
import { fmtCurrency, fmtTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, QrCode, Users, XCircle, CheckCircle2, CreditCard, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { BookingDetailSkeleton } from '@/components/ui/skeleton';

function HoldTimer({ expiresAt }: { expiresAt: string }) {
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
      'flex items-center gap-3 px-4 py-3 rounded-2xl mb-3',
      isUrgent ? 'bg-amber-50 border border-amber-200/60' : 'bg-teal-50 border border-teal-200/60',
    )}>
      <Clock className={cn('w-5 h-5 shrink-0', isUrgent ? 'text-amber-500' : 'text-teal-600')} />
      <div className="flex-1">
        <p className={cn('text-[11px] font-medium', isUrgent ? 'text-amber-600' : 'text-teal-600')}>Selesaikan pembayaran dalam</p>
        <p className={cn('text-[20px] font-display font-extrabold tabular-nums', isUrgent ? 'text-amber-700' : 'text-teal-800')}>
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}

interface Props {
  bookingId: string;
  source?: 'gateway' | 'terminal';
}

const STATUS_CFG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'; icon: typeof CheckCircle2 }> = {
  held: { label: 'Menunggu Bayar', variant: 'warning', icon: QrCode },
  confirmed: { label: 'Terkonfirmasi', variant: 'success', icon: CheckCircle2 },
  completed: { label: 'Selesai', variant: 'secondary', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', variant: 'destructive', icon: XCircle },
  expired: { label: 'Kedaluwarsa', variant: 'destructive', icon: XCircle },
};

export default function BookingDetailPage({ bookingId, source }: Props) {
  const { navigate, goBack } = useNav();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId, source],
    queryFn: () => bookingsApi.getGatewayDetail(bookingId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  if (isLoading) {
    return <BookingDetailSkeleton />;
  }

  if (error || !booking) {
    return (
      <div>
        <PageHeader title="Detail Pesanan" onBack={goBack} />
        <p className="text-center text-slate-400 py-10">Pesanan tidak ditemukan</p>
      </div>
    );
  }

  const st = STATUS_CFG[booking.status || ''] || { label: booking.status, variant: 'secondary' as const, icon: QrCode };

  return (
    <div className="anim-fade">
      <PageHeader
        title="Detail Pesanan"
        onBack={goBack}
        rightContent={<Badge variant={st.variant} className="rounded-lg px-2.5 py-1 text-[11px] font-bold">{st.label}</Badge>}
      />

      <div className="px-4 pt-4 pb-24">
        {booking.status === 'held' && booking.holdExpiresAt && (
          <HoldTimer expiresAt={booking.holdExpiresAt} />
        )}

        <div className="bg-white rounded-2xl shadow-soft overflow-hidden anim-slide-up">
          <div className="p-4">
            <p className="font-bold text-[16px] text-slate-800 mb-3">{booking.patternName || booking.patternCode || booking.operatorName || 'Detail Perjalanan'}</p>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1.5">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-teal-500" />
                <div className="w-[1.5px] h-10 bg-gradient-to-b from-teal-400 to-coral-400 my-0.5" />
                <div className="w-2.5 h-2.5 rounded-full bg-coral-500" />
              </div>
              <div className="flex-1 space-y-5">
                <div>
                  <p className="font-semibold text-[14px]">{booking.origin?.name}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">{fmtTime(booking.departAt)}</p>
                </div>
                <div>
                  <p className="font-semibold text-[14px]">{booking.destination?.name}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">{fmtTime(booking.arriveAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-teal-600" />
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Penumpang</p>
            </div>
            <div className="space-y-2">
              {booking.passengers?.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                  <span className="text-[13px] font-semibold text-slate-700">{p.fullName}</span>
                  <span className="text-[12px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">Kursi {p.seatNo}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-slate-100" />

          <div className="p-4 flex items-center justify-between">
            <span className="text-[13px] text-slate-400 font-medium">Total Pembayaran</span>
            <span className="font-display font-extrabold text-[22px] text-teal-900">{fmtCurrency(booking.totalAmount)}</span>
          </div>
        </div>

        {booking.qrData && booking.qrData.length > 0 && (
          <div className="mt-4 anim-slide-up delay-1">
            <div className="flex items-center gap-2 mb-3 px-0.5">
              <QrCode className="w-4 h-4 text-teal-600" />
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiket Digital</p>
            </div>
            <div className="space-y-3">
              {booking.qrData.map((qr) => (
                <div key={qr.passengerId} className="bg-white rounded-2xl shadow-soft overflow-hidden">
                  <div className="p-5 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl border border-slate-100">
                      <QRCodeSVG value={qr.qrPayload} size={140} level="M" />
                    </div>
                    <p className="font-bold text-[14px] mt-3">{qr.fullName}</p>
                    <p className="text-[12px] text-slate-400 font-medium">Kursi {qr.seatNo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {booking.status === 'held' && booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() > Date.now() && (
          <div className="mt-4 anim-slide-up delay-2">
            <Button
              className="w-full h-13 rounded-2xl bg-teal-900 hover:bg-teal-950 text-[15px] font-bold shadow-lg shadow-teal-900/15 transition-all active:scale-[0.97] gap-2"
              onClick={() => navigate({
                name: 'payment',
                tripId: booking.tripId,
                serviceDate: booking.serviceDate || '',
                originStopId: booking.origin?.stopId || '',
                destStopId: booking.destination?.stopId || '',
                originSeq: 0,
                destSeq: 0,
                bookingId: booking.id || booking.bookingId || bookingId,
                holdExpiresAt: booking.holdExpiresAt,
                tripLabel: booking.patternName || booking.patternCode || 'Perjalanan',
                fare: booking.passengers?.length > 0 ? Math.round(Number(booking.totalAmount || 0) / booking.passengers.length) : Number(booking.totalAmount || 0),
                seats: booking.passengers?.map(p => p.seatNo) || [],
                originStopName: booking.origin?.name || undefined,
                destStopName: booking.destination?.name || undefined,
                originTime: booking.departAt || undefined,
                destTime: booking.arriveAt || undefined,
                passengers: booking.passengers?.map(p => ({ fullName: p.fullName, phone: undefined, seatNo: p.seatNo })) || [],
              })}
            >
              <CreditCard className="w-5 h-5" />
              Bayar Sekarang
            </Button>
          </div>
        )}

        {(booking.status === 'held' || booking.status === 'confirmed') && (
          <div className="mt-3 anim-slide-up delay-3">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-[13px]"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel"
            >
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Batalkan Pesanan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
