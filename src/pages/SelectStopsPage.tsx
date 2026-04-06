import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNav } from '@/App';
import { tripsApi, type TripStopInfo } from '@/lib/api';
import { fmtTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CircleDot, Flag, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  tripId: string;
  serviceDate: string;
  passengers: number;
  tripLabel: string;
  fare: number;
  stops?: TripStopInfo[];
  originCity: string;
  destCity: string;
  originSeq: number;
  destSeq: number;
}

export default function SelectStopsPage({ tripId, serviceDate, passengers, tripLabel, fare, stops: passedStops, originCity, destCity, originSeq, destSeq }: Props) {
  const { navigate, goBack } = useNav();
  const [pickupStopId, setPickupStopId] = useState<string | null>(null);
  const [dropStopId, setDropStopId] = useState<string | null>(null);
  const [mode, setMode] = useState<'pickup' | 'drop'>('pickup');

  const needsFetch = !passedStops || passedStops.length === 0;

  const { data: tripDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['trip-detail', tripId],
    queryFn: () => tripsApi.getDetail(tripId),
    enabled: needsFetch,
  });

  const stops: TripStopInfo[] = needsFetch
    ? (tripDetail?.stops?.map((s) => ({
        stopId: s.stopId,
        name: s.name,
        code: s.code,
        city: s.city || undefined,
        sequence: s.sequence,
        arriveAt: s.arriveAt,
        departAt: s.departAt,
      })) || [])
    : passedStops!;

  const hasBoardingFlags = stops.some(s => s.boardingAllowed !== undefined);
  const pickupStops = stops.filter(s =>
    hasBoardingFlags ? s.boardingAllowed : (s.city ? s.city === originCity : s.sequence <= originSeq)
  );
  const dropStops = stops.filter(s =>
    hasBoardingFlags ? s.alightingAllowed : (s.city ? s.city === destCity : s.sequence >= destSeq)
  );

  const pickupStop = pickupStopId ? stops.find(s => s.stopId === pickupStopId) : null;
  const dropStop = dropStopId ? stops.find(s => s.stopId === dropStopId) : null;
  const canProceed = !!pickupStop && !!dropStop;

  const handlePickup = (stop: TripStopInfo) => {
    setPickupStopId(stop.stopId);
    setMode('drop');
  };

  const handleDrop = (stop: TripStopInfo) => {
    setDropStopId(stop.stopId);
  };

  const isVirtual = tripId.includes('virtual-');

  const materializeMut = useMutation({
    mutationFn: () => tripsApi.materialize(tripId, serviceDate),
    onSuccess: (result) => {
      if (!pickupStop || !dropStop) return;
      const realTripId = result.tripId.includes(':')
        ? result.tripId
        : `${tripId.split(':')[0] || ''}:${result.tripId}`.replace(/^:/, '');
      navigate({
        name: 'select-seats',
        tripId: realTripId,
        serviceDate,
        originStopId: pickupStop.stopId,
        destStopId: dropStop.stopId,
        originSeq: pickupStop.sequence,
        destSeq: dropStop.sequence,
        passengers,
        tripLabel,
        fare,
      });
    },
  });

  const proceed = () => {
    if (!pickupStop || !dropStop) return;
    if (isVirtual) {
      materializeMut.mutate();
    } else {
      navigate({
        name: 'select-seats',
        tripId,
        serviceDate,
        originStopId: pickupStop.stopId,
        destStopId: dropStop.stopId,
        originSeq: pickupStop.sequence,
        destSeq: dropStop.sequence,
        passengers,
        tripLabel,
        fare,
      });
    }
  };

  const activeStops = mode === 'pickup' ? pickupStops : dropStops;

  if (detailLoading) {
    return (
      <div className="anim-fade min-h-screen bg-slate-50">
        <div className="bg-teal-900 px-4 pt-3 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <p className="text-white font-semibold text-[15px]">Pilih Titik Naik & Turun</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-[13px] text-slate-400 font-medium">Memuat rute perjalanan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade min-h-screen bg-slate-50">
      <div className="bg-teal-900 px-4 pt-3 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" data-testid="button-back">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[15px]">Pilih Titik Naik & Turun</p>
            <p className="text-teal-300 text-[12px] mt-0.5 truncate">{tripLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-32">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('pickup')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all',
              mode === 'pickup'
                ? 'bg-teal-900 text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200',
            )}
            data-testid="tab-pickup"
          >
            <CircleDot className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Titik Naik
            {pickupStop && <span className="ml-1 opacity-70">✓</span>}
          </button>
          <button
            onClick={() => setMode('drop')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all',
              mode === 'drop'
                ? 'bg-coral-500 text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200',
            )}
            data-testid="tab-drop"
          >
            <Flag className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Titik Turun
            {dropStop && <span className="ml-1 opacity-70">✓</span>}
          </button>
        </div>

        {pickupStop && dropStop && (
          <div className="bg-teal-50 border border-teal-200/60 rounded-2xl p-3.5 mb-4 anim-fade">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] text-teal-600 font-bold uppercase tracking-wider mb-0.5">
                  <CircleDot className="w-3 h-3" /> Naik
                </div>
                <p className="font-bold text-[14px] text-teal-900">{pickupStop.name}</p>
                <p className="text-[12px] text-teal-700 font-medium">{fmtTime(pickupStop.departAt)}</p>
              </div>
              <div className="text-teal-300 text-lg font-bold">→</div>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-end gap-1.5 text-[10px] text-coral-600 font-bold uppercase tracking-wider mb-0.5">
                  <Flag className="w-3 h-3" /> Turun
                </div>
                <p className="font-bold text-[14px] text-teal-900">{dropStop.name}</p>
                <p className="text-[12px] text-teal-700 font-medium">{fmtTime(dropStop.arriveAt)}</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          {mode === 'pickup'
            ? `Pilih titik naik (${pickupStops.length} halte)`
            : `Pilih titik turun (${dropStops.length} halte)`
          }
        </p>

        {activeStops.length === 0 && (
          <div className="text-center py-12 text-[13px] text-slate-400">
            Tidak ada halte tersedia untuk kota ini
          </div>
        )}

        <div className="grid gap-2.5">
          {activeStops.map((stop) => {
            const isPickup = pickupStopId === stop.stopId;
            const isDrop = dropStopId === stop.stopId;
            const isSelected = (mode === 'pickup' && isPickup) || (mode === 'drop' && isDrop);
            const time = mode === 'pickup' ? stop.departAt : stop.arriveAt;

            return (
              <button
                key={stop.stopId}
                onClick={() => {
                  if (mode === 'pickup') handlePickup(stop);
                  else handleDrop(stop);
                }}
                className={cn(
                  'w-full rounded-2xl p-4 text-left transition-all duration-200 border-2',
                  isSelected && mode === 'pickup' && 'bg-teal-50 border-teal-500 shadow-md shadow-teal-500/10',
                  isSelected && mode === 'drop' && 'bg-coral-50 border-coral-400 shadow-md shadow-coral-400/10',
                  !isSelected && 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]',
                )}
                data-testid={`stop-${stop.code}`}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                    isSelected && mode === 'pickup' && 'bg-teal-600',
                    isSelected && mode === 'drop' && 'bg-coral-500',
                    !isSelected && 'bg-slate-100',
                  )}>
                    {isSelected ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-[14px] font-bold text-slate-400">{stop.code}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[15px] truncate',
                      isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-700',
                    )}>
                      {stop.name}
                    </p>
                    {isSelected && mode === 'pickup' && <span className="text-[11px] font-bold text-teal-600">Titik naik dipilih</span>}
                    {isSelected && mode === 'drop' && <span className="text-[11px] font-bold text-coral-600">Titik turun dipilih</span>}
                    {!isSelected && (
                      <span className="text-[11px] text-slate-400">Halte {stop.sequence}</span>
                    )}
                  </div>

                  <div className={cn(
                    'shrink-0 px-3 py-1.5 rounded-lg',
                    isSelected && mode === 'pickup' && 'bg-teal-600',
                    isSelected && mode === 'drop' && 'bg-coral-500',
                    !isSelected && 'bg-slate-50',
                  )}>
                    <span className={cn(
                      'text-[16px] font-bold tabular-nums',
                      isSelected ? 'text-white' : 'text-slate-700',
                    )}>
                      {fmtTime(time)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-bottom z-40">
        <div className="px-4 py-3">
          {materializeMut.isError && (
            <p className="text-red-500 text-xs text-center mb-2">Gagal memproses jadwal. Silakan coba lagi.</p>
          )}
          <Button
            className="w-full h-12 rounded-2xl bg-teal-900 hover:bg-teal-950 text-[14px] font-bold shadow-lg shadow-teal-900/15 transition-all active:scale-[0.97]"
            disabled={!canProceed || materializeMut.isPending}
            onClick={proceed}
            data-testid="button-continue-stops"
          >
            {materializeMut.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Memproses jadwal...</>
            ) : !canProceed
              ? (pickupStopId === null ? 'Pilih titik naik dulu' : 'Pilih titik turun')
              : 'Lanjut Pilih Kursi'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
