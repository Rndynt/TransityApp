import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNav } from '@/App';
import { tripsApi, type TripSearchResult } from '@/lib/api';
import { fmtCurrency, fmtTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import OperatorLogo from '@/components/OperatorLogo';
import OperatorBottomSheet from '@/components/OperatorBottomSheet';
import { ArrowLeft, Loader2, SearchX, Clock, MapPin, ChevronDown, ChevronUp, Users, CheckCircle2, ArrowRight, SlidersHorizontal, Bus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PAGE_LIMIT = 10;

const VEHICLE_LABELS: Record<string, string> = {
  'commuter-14': 'Commuter',
  'premio-14': 'Premio',
  'executive-14': 'Executive',
};

function vehicleLabel(vc: string | null | undefined): string {
  if (!vc) return '';
  return VEHICLE_LABELS[vc] || vc.replace(/-\d+$/, '').replace(/^\w/, c => c.toUpperCase());
}

interface Props {
  originCity: string;
  destinationCity: string;
  date: string;
  passengers: number;
  operatorFilter?: string | null;
}

export default function SearchResultsPage({ originCity, destinationCity, date, passengers, operatorFilter }: Props) {
  const { navigate, goBack } = useNav();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(operatorFilter ?? null);
  const [operatorSheetOpen, setOperatorSheetOpen] = useState(false);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['trips-search-infinite', originCity, destinationCity, date, passengers],
    queryFn: ({ pageParam }) =>
      tripsApi.searchPaginated({ originCity, destinationCity, date, passengers, page: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const allTrips = data?.pages.flatMap((p) => p.data) ?? [];
  const trips = activeFilter
    ? allTrips.filter(t => t.operatorSlug === activeFilter)
    : allTrips;
  const totalUnfiltered = data?.pages[0]?.total ?? 0;

  const operators = Array.from(
    new Map(allTrips.map(t => [t.operatorSlug, { slug: t.operatorSlug, name: t.operatorName, color: t.operatorColor || '#134E4A', logo: t.operatorLogo }])).values()
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '120px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const selectTrip = (trip: TripSearchResult) => {
    const tripLabel = `${trip.operatorName} · ${trip.origin?.cityName || originCity} → ${trip.destination?.cityName || destinationCity}`;
    navigate({
      name: 'select-stops',
      tripId: trip.tripId,
      serviceDate: trip.serviceDate,
      passengers,
      tripLabel,
      fare: trip.farePerPerson,
      stops: [],
      originCity,
      destCity: destinationCity,
      originSeq: trip.origin?.sequence || 0,
      destSeq: trip.destination?.sequence || 0,
    });
  };

  let dateLabel = date;
  try { dateLabel = format(parseISO(date), 'EEE, d MMM yyyy', { locale: idLocale }); } catch {}

  return (
    <div className="anim-fade min-h-screen bg-slate-50">
      <div className="hero-mesh px-4 pt-3 pb-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-white font-bold text-[16px] font-display">
              <span className="truncate">{originCity}</span>
              <ArrowRight className="w-4 h-4 text-teal-300 shrink-0" />
              <span className="truncate">{destinationCity}</span>
            </div>
            <p className="text-teal-300/80 text-[12px] mt-0.5 font-medium">
              {dateLabel} · {passengers} penumpang
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {!isLoading && allTrips.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setOperatorSheetOpen(true)}
              className={cn(
                'flex items-center gap-2 h-9 px-3 pr-3.5 rounded-xl border text-[12px] font-semibold transition-all active:scale-[0.97]',
                activeFilter
                  ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'
              )}
            >
              {activeFilter ? (
                <>
                  <OperatorLogo
                    name={operators.find(o => o.slug === activeFilter)?.name || activeFilter}
                    logo={operators.find(o => o.slug === activeFilter)?.logo || null}
                    color={operators.find(o => o.slug === activeFilter)?.color || '#134E4A'}
                    size="sm"
                    className="!w-6 !h-6 !rounded-md"
                  />
                  {operators.find(o => o.slug === activeFilter)?.name || activeFilter}
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Semua Operator
                </>
              )}
            </button>
            {activeFilter && (
              <button
                onClick={() => setActiveFilter(null)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12px] font-semibold text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-[0.97]"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
            </div>
            <p className="text-[13px] text-slate-400 font-medium">Mencari perjalanan dari semua operator...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <SearchX className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 text-[14px]">Gagal memuat hasil pencarian</p>
          </div>
        )}

        {!isLoading && !error && trips.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <SearchX className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700">Tidak ada perjalanan</p>
            <p className="text-[13px] text-slate-400 mt-1">
              {activeFilter ? 'Tidak ada perjalanan untuk operator ini. Coba pilih "Semua".' : 'Coba tanggal atau rute lain'}
            </p>
            {activeFilter && (
              <button
                onClick={() => setActiveFilter(null)}
                className="mt-3 text-[13px] font-semibold text-teal-600 hover:text-teal-700"
              >
                Tampilkan semua operator
              </button>
            )}
          </div>
        )}

        {trips.length > 0 && (
          <p className="text-[12px] font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            {activeFilter ? `${trips.length} perjalanan` : `${trips.length} dari ${totalUnfiltered} perjalanan`}
          </p>
        )}

        <div className="space-y-3">
          {trips.map((trip, i) => (
            <TripCard
              key={trip.tripId}
              trip={trip}
              index={i}
              passengers={passengers}
              originCity={originCity}
              destCity={destinationCity}
              onSelect={() => selectTrip(trip)}
            />
          ))}
        </div>

        <div ref={sentinelRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex flex-col items-center py-6 gap-2" data-testid="status-loading-more">
            <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
            <p className="text-[12px] text-slate-400 font-medium">Memuat lebih banyak...</p>
          </div>
        )}

        {!isLoading && !hasNextPage && trips.length > 0 && (
          <div className="flex flex-col items-center py-6 gap-1.5" data-testid="status-all-loaded">
            <CheckCircle2 className="w-4 h-4 text-slate-300" />
            <p className="text-[11px] text-slate-300 font-medium">Semua perjalanan ditampilkan</p>
          </div>
        )}
      </div>

      <OperatorBottomSheet
        open={operatorSheetOpen}
        operators={operators.map(o => ({ slug: o.slug, name: o.name, color: o.color, logo: o.logo }))}
        selected={activeFilter}
        onSelect={setActiveFilter}
        onClose={() => setOperatorSheetOpen(false)}
      />
    </div>
  );
}

function getRawStops(trip: TripSearchResult): Array<{ name: string; code: string; city: string; departAt: string | null; arriveAt: string | null; sequence: number }> {
  const raw = (trip as unknown as { raw?: { stops?: Array<{ name: string; code: string; city: string; departAt: string | null; arriveAt: string | null; sequence: number }> } }).raw;
  return raw?.stops || [];
}

function getRawTimes(trip: TripSearchResult): { departAt: string | null; arriveAt: string | null } {
  const raw = (trip as unknown as { raw?: { origin?: { departAt: string | null }; destination?: { arriveAt: string | null } } }).raw;
  return {
    departAt: raw?.origin?.departAt || trip.origin?.departureTime || null,
    arriveAt: raw?.destination?.arriveAt || trip.destination?.departureTime || null,
  };
}

function getDurationLabel(departureTime?: string | null, arrivalTime?: string | null): string {
  if (!departureTime || !arrivalTime) return '';
  const d1 = new Date(departureTime).getTime();
  const d2 = new Date(arrivalTime).getTime();
  if (isNaN(d1) || isNaN(d2)) return '';
  const diff = Math.abs(d2 - d1);
  const h = Math.floor(diff / 3600000);
  const m = Math.round((diff % 3600000) / 60000);
  if (h === 0) return `${m} mnt`;
  if (m === 0) return `${h} jam`;
  return `${h}j ${m}m`;
}

function TripCard({ trip, index, passengers, originCity, destCity, onSelect }: {
  trip: TripSearchResult; index: number; passengers: number; originCity: string; destCity: string; onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rawTimes = getRawTimes(trip);
  const departTime = fmtTime(rawTimes.departAt);
  const arriveTime = fmtTime(rawTimes.arriveAt);
  const duration = getDurationLabel(rawTimes.departAt, rawTimes.arriveAt);
  const isFull = trip.availableSeats < passengers;
  const stops = getRawStops(trip);
  const svcLabel = vehicleLabel(trip.vehicleClass);
  const originLabel = trip.origin?.stopName || originCity;
  const destLabel = trip.destination?.stopName || destCity;

  return (
    <button
      className={cn(
        'w-full text-left bg-white rounded-2xl overflow-hidden anim-slide-up transition-all',
        isFull ? 'opacity-60' : 'hover:shadow-lg active:scale-[0.98]',
        `delay-${Math.min(index + 1, 4)}`
      )}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.04)' }}
      onClick={isFull ? undefined : onSelect}
      disabled={isFull}
      data-testid={`card-trip-${trip.tripId}`}
    >
      <div className="p-4">
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center shrink-0 pt-0.5">
            <p className="font-bold text-[20px] text-slate-900 font-display leading-none">{departTime}</p>
            <div className="flex flex-col items-center py-1.5 flex-1">
              <div className="w-2 h-2 rounded-full border-2 border-teal-500 bg-white" />
              <div className="w-[2px] flex-1 bg-gradient-to-b from-teal-400 to-coral-400 rounded-full" style={{ minHeight: 24 }} />
              <div className="w-2 h-2 rounded-full bg-coral-500" />
            </div>
            <p className="font-bold text-[20px] text-slate-900 font-display leading-none">{arriveTime}</p>
          </div>

          <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
            <div>
              <p className="font-semibold text-[14px] text-slate-800 truncate leading-tight">{originLabel}</p>
              <p className="text-[11px] text-slate-400">{originCity}</p>
            </div>

            {duration && (
              <div className="flex items-center gap-1.5 my-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  <Clock className="w-3 h-3" />
                  {duration}
                </span>
              </div>
            )}

            <div>
              <p className="font-semibold text-[14px] text-slate-800 truncate leading-tight">{destLabel}</p>
              <p className="text-[11px] text-slate-400">{destCity}</p>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between shrink-0 py-0.5">
            <div className="text-right">
              <p className="font-extrabold text-[18px] text-teal-700 font-display leading-none">{fmtCurrency(trip.farePerPerson)}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">/orang</p>
            </div>
            <div className="flex items-center gap-1.5 mt-auto">
              {svcLabel && (
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md">
                  {svcLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100/80">
          <OperatorLogo
            name={trip.operatorName}
            logo={trip.operatorLogo}
            color={trip.operatorColor || '#134E4A'}
            size="sm"
            className="!w-6 !h-6 !rounded-md"
          />
          <span className="text-[11px] font-medium text-slate-500">{trip.operatorName}</span>

          <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className={cn(
              isFull ? 'text-red-500' : trip.availableSeats <= 5 ? 'text-amber-600' : 'text-slate-500'
            )}>
              {isFull ? 'Penuh' : `${trip.availableSeats} kursi`}
            </span>
          </div>
        </div>

        {stops.length > 2 && (
          <div
            role="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            data-testid={`button-expand-stops-${trip.tripId}`}
          >
            <MapPin className="w-3 h-3" />
            {expanded ? 'Sembunyikan rute' : `Lihat ${stops.length} pemberhentian`}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        )}

        {expanded && stops.length > 0 && (
          <div className="mt-2 ml-1 pl-3 border-l-2 border-teal-100 space-y-2 py-1" onClick={(e) => e.stopPropagation()}>
            {stops.map((stop, i) => (
              <div key={stop.code} className="flex items-center gap-2 text-[11px]">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0 -ml-[13px]',
                  i === 0 ? 'bg-teal-500' : i === stops.length - 1 ? 'bg-coral-500' : 'bg-slate-300'
                )} />
                <span className="font-medium text-slate-600">{fmtTime(stop.departAt || stop.arriveAt)}</span>
                <span className="text-slate-800 font-medium truncate">{stop.name}</span>
                <span className="text-slate-400 shrink-0">{stop.city}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
