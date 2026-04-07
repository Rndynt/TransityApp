import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNav } from '@/App';
import { tripsApi, type TripStopInfo } from '@/lib/api';
import { fmtTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CircleDot, MapPin, Check, Loader2, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StopCardSkeleton } from '@/components/ui/skeleton';

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
        <div className="bg-gradient-to-b from-teal-900 to-teal-800 px-4 pt-3 pb-5">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <p className="text-white font-semibold text-[15px]">Pilih Titik Naik & Turun</p>
          </div>
        </div>
        <div className="px-4 pt-6 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <StopCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade min-h-screen bg-slate-50">
      <div className="bg-gradient-to-b from-teal-900 to-teal-800 px-4 pt-3 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" data-testid="button-back">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[16px]">Pilih Titik Naik & Turun</p>
            <p className="text-teal-300 text-[12px] mt-0.5 truncate">{tripLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 pb-36">
        <div className="bg-white rounded-2xl shadow-soft p-1.5 mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setMode('pickup')}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5',
                mode === 'pickup'
                  ? 'bg-teal-900 text-white shadow-md'
                  : 'bg-transparent text-slate-400 hover:text-slate-600',
              )}
              data-testid="tab-pickup"
            >
              <CircleDot className="w-3.5 h-3.5" />
              Titik Naik
              {pickupStop && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <button
              onClick={() => setMode('drop')}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5',
                mode === 'drop'
                  ? 'bg-coral-500 text-white shadow-md'
                  : 'bg-transparent text-slate-400 hover:text-slate-600',
              )}
              data-testid="tab-drop"
            >
              <MapPin className="w-3.5 h-3.5" />
              Titik Turun
              {dropStop && <Check className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          </div>
        </div>

        {(pickupStop || dropStop) && (
          <div className="bg-white rounded-2xl shadow-soft p-4 mb-4 anim-fade">
            <div className="flex items-stretch gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Naik</span>
                </div>
                {pickupStop ? (
                  <>
                    <p className="font-bold text-[14px] text-slate-800 leading-tight">{pickupStop.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[12px] text-slate-500 font-medium">{fmtTime(pickupStop.departAt)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-slate-300 italic mt-0.5">Belum dipilih</p>
                )}
              </div>

              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-coral-500" />
                  <span className="text-[10px] text-coral-600 font-bold uppercase tracking-wider">Turun</span>
                </div>
                {dropStop ? (
                  <>
                    <p className="font-bold text-[14px] text-slate-800 leading-tight">{dropStop.name}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[12px] text-slate-500 font-medium">{fmtTime(dropStop.arriveAt)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-slate-300 italic mt-0.5">Belum dipilih</p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          {mode === 'pickup'
            ? `Pilih titik naik (${pickupStops.length} halte)`
            : `Pilih titik turun (${dropStops.length} halte)`
          }
        </p>

        {activeStops.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-[13px] text-slate-400">Tidak ada halte tersedia untuk kota ini</p>
          </div>
        )}

        <div className="space-y-2">
          {activeStops.map((stop, idx) => {
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
                  'w-full rounded-2xl p-4 text-left transition-all duration-200',
                  isSelected && mode === 'pickup' && 'bg-teal-50 ring-2 ring-teal-500 shadow-md shadow-teal-500/10',
                  isSelected && mode === 'drop' && 'bg-coral-50 ring-2 ring-coral-400 shadow-md shadow-coral-400/10',
                  !isSelected && 'bg-white shadow-soft hover:shadow-md active:scale-[0.98]',
                )}
                data-testid={`stop-${stop.code}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    isSelected && mode === 'pickup' && 'bg-teal-600',
                    isSelected && mode === 'drop' && 'bg-coral-500',
                    !isSelected && 'bg-slate-100',
                  )}>
                    {isSelected ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : mode === 'pickup' ? (
                      <CircleDot className="w-[18px] h-[18px] text-slate-400" />
                    ) : (
                      <MapPin className="w-[18px] h-[18px] text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[15px] truncate leading-tight',
                      isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-700',
                    )}>
                      {stop.name}
                    </p>
                    {isSelected && mode === 'pickup' && (
                      <span className="text-[11px] font-semibold text-teal-600 mt-0.5 block">Titik naik dipilih</span>
                    )}
                    {isSelected && mode === 'drop' && (
                      <span className="text-[11px] font-semibold text-coral-600 mt-0.5 block">Titik turun dipilih</span>
                    )}
                    {!isSelected && stop.city && (
                      <span className="text-[11px] text-slate-400 mt-0.5 block">{stop.city}</span>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <span className={cn(
                        'text-[16px] font-bold tabular-nums block leading-tight',
                        isSelected && mode === 'pickup' && 'text-teal-700',
                        isSelected && mode === 'drop' && 'text-coral-600',
                        !isSelected && 'text-slate-700',
                      )}>
                        {fmtTime(time)}
                      </span>
                    </div>
                    {!isSelected && (
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 safe-bottom z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          {materializeMut.isError && (
            <p className="text-red-500 text-[12px] text-center mb-2 font-medium">Gagal memproses jadwal. Silakan coba lagi.</p>
          )}
          <Button
            className="w-full h-[52px] rounded-2xl bg-teal-900 hover:bg-teal-950 text-[15px] font-bold shadow-lg shadow-teal-900/15 transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
            disabled={!canProceed || materializeMut.isPending}
            onClick={proceed}
            data-testid="button-continue-stops"
          >
            {materializeMut.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Memproses jadwal...</>
            ) : !canProceed
              ? (pickupStopId === null ? 'Pilih titik naik dulu' : 'Pilih titik turun dulu')
              : (
                <>
                  Lanjut Pilih Kursi
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
