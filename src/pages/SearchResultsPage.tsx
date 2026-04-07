import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNav } from '@/App';
import { tripsApi, type TripSearchResult } from '@/lib/api';
import { fmtCurrency, fmtTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import OperatorLogo from '@/components/OperatorLogo';
import OperatorBottomSheet from '@/components/OperatorBottomSheet';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Loader2, SearchX, Clock, MapPin, ChevronDown, ChevronUp, Users, CheckCircle2, ArrowRight, SlidersHorizontal, Bus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { format, parseISO, addDays, isSameDay, isToday, isTomorrow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TripCardSkeleton } from '@/components/ui/skeleton';

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

function generateDateRange(originalDate: string, days: number): Date[] {
  const original = parseISO(originalDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = original < today ? today : original;
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(start, i));
  }
  return dates;
}

function getDateChipLabel(d: Date): string {
  if (isToday(d)) return 'Hari Ini';
  if (isTomorrow(d)) return 'Besok';
  return format(d, 'EEE', { locale: idLocale });
}

function DateStrip({ currentDate, originalDate, onChangeDate }: {
  currentDate: string;
  originalDate: string;
  onChangeDate: (newDate: string) => void;
}) {
  const dates = generateDateRange(originalDate, 7);
  const selected = parseISO(currentDate);

  return (
    <div className="grid grid-cols-7 gap-1 mt-3 -mx-4 px-4 pb-0.5">
      {dates.map((d) => {
        const iso = format(d, 'yyyy-MM-dd');
        const isActive = isSameDay(d, selected);
        return (
          <button
            key={iso}
            onClick={() => { if (!isActive) onChangeDate(iso); }}
            className={cn(
              'flex flex-col items-center py-2 rounded-xl text-center transition-all active:scale-[0.95]',
              isActive
                ? 'bg-white/20 ring-1 ring-white/30'
                : 'bg-white/5 hover:bg-white/10',
            )}
          >
            <span className={cn('text-[10px] font-semibold leading-tight', isActive ? 'text-white' : 'text-teal-300/60')}>
              {getDateChipLabel(d)}
            </span>
            <span className={cn('text-[17px] font-extrabold font-display leading-snug', isActive ? 'text-white' : 'text-teal-200/80')}>
              {format(d, 'd')}
            </span>
            <span className={cn('text-[9px] font-semibold uppercase tracking-wider leading-tight', isActive ? 'text-teal-200' : 'text-teal-300/50')}>
              {format(d, 'MMM', { locale: idLocale })}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SearchResultsPage({ originCity, destinationCity, date, passengers, operatorFilter }: Props) {
  const { navigate, goBack } = useNav();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(operatorFilter ?? null);
  const [operatorSheetOpen, setOperatorSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  const [activeDate, setActiveDate] = useState(date);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['trips-search-infinite', originCity, destinationCity, activeDate, passengers],
    queryFn: ({ pageParam }) =>
      tripsApi.searchPaginated({ originCity, destinationCity, date: activeDate, passengers, page: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const handlePullRefresh = useCallback(async () => {
    await queryClient.resetQueries({ queryKey: ['trips-search-infinite', originCity, destinationCity, activeDate, passengers] });
  }, [queryClient, originCity, destinationCity, activeDate, passengers]);

  const handleDateChange = useCallback((newDate: string) => {
    setActiveDate(newDate);
    setActiveFilter(null);
  }, []);

  const { containerRef, pullDistance, isRefreshing, progress, isPastThreshold } = usePullToRefresh({
    onRefresh: handlePullRefresh,
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
    const rawStops = getRawStops(trip);
    const stopsForNav: import('@/lib/api').TripStopInfo[] = rawStops.map(s => ({
      stopId: s.stopId || s.code,
      name: s.name,
      code: s.code,
      city: s.city,
      sequence: s.sequence,
      arriveAt: s.arriveAt,
      departAt: s.departAt,
      boardingAllowed: s.boardingAllowed,
      alightingAllowed: s.alightingAllowed,
    }));
    navigate({
      name: 'trip-detail',
      tripId: trip.tripId,
      serviceDate: trip.serviceDate,
      passengers,
      originCity,
      destCity: destinationCity,
      trip,
      rawStops: stopsForNav,
    });
  };

  let dateLabel = activeDate;
  try { dateLabel = format(parseISO(activeDate), 'EEE, d MMM yyyy', { locale: idLocale }); } catch {}

  return (
    <div ref={containerRef} className="anim-fade min-h-screen bg-slate-50 overflow-y-auto">
      <PageHeader
        title={`${originCity} → ${destinationCity}`}
        subtitle={`${passengers} penumpang`}
        onBack={goBack}
        sticky
      >
        <DateStrip
          currentDate={activeDate}
          originalDate={date}
          onChangeDate={handleDateChange}
        />
      </PageHeader>

      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={progress}
        isPastThreshold={isPastThreshold}
      />

      <div className="px-4 pt-4 pb-24">
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
          <div className="space-y-3 anim-fade">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
              <p className="text-[12px] text-slate-400 font-medium">Mencari perjalanan...</p>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <TripCardSkeleton key={i} />
            ))}
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

function getRawStops(trip: TripSearchResult): Array<{ stopId?: string; name: string; code: string; city: string; departAt: string | null; arriveAt: string | null; sequence: number; boardingAllowed?: boolean; alightingAllowed?: boolean }> {
  const raw = (trip as unknown as { raw?: { stops?: Array<{ stopId?: string; name: string; code: string; city: string; departAt: string | null; arriveAt: string | null; sequence: number; boardingAllowed?: boolean; alightingAllowed?: boolean }> } }).raw;
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
        'w-full text-left bg-white rounded-2xl overflow-hidden anim-slide-up transition-all border border-slate-100',
        isFull ? 'opacity-50' : 'hover:border-teal-200 hover:shadow-lg active:scale-[0.98]',
        `delay-${Math.min(index + 1, 4)}`
      )}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)' }}
      onClick={isFull ? undefined : onSelect}
      disabled={isFull}
      data-testid={`card-trip-${trip.tripId}`}
    >
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-center shrink-0 w-[52px]">
              <p className="font-extrabold text-[22px] text-slate-900 font-display leading-none tracking-tight">{departTime}</p>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="w-2 h-2 rounded-full border-2 border-teal-500" />
              <div className="w-8 h-[2px] bg-gradient-to-r from-teal-400 to-coral-400 rounded-full" />
              <div className="w-2 h-2 rounded-full bg-coral-500" />
            </div>
            <div className="text-center shrink-0 w-[52px]">
              <p className="font-extrabold text-[22px] text-slate-900 font-display leading-none tracking-tight">{arriveTime}</p>
            </div>
            {duration && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {duration}
              </span>
            )}
          </div>
          <div className="text-right shrink-0 pl-2">
            <p className="font-extrabold text-[18px] text-teal-700 font-display leading-none">{fmtCurrency(trip.farePerPerson)}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">/orang</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold text-slate-800 truncate">{originLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <span className="font-semibold text-slate-800 truncate">{destLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/80 border-t border-slate-100/80">
        <OperatorLogo
          name={trip.operatorName}
          logo={trip.operatorLogo}
          color={trip.operatorColor || '#134E4A'}
          size="sm"
          className="!w-5 !h-5 !rounded"
        />
        <span className="text-[11px] font-medium text-slate-500">{trip.operatorName}</span>
        {svcLabel && (
          <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/60 px-1.5 py-0.5 rounded">
            {svcLabel}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 text-[11px] font-medium">
          <Users className="w-3 h-3 text-slate-400" />
          <span className={cn(
            isFull ? 'text-red-500' : trip.availableSeats <= 5 ? 'text-amber-600' : 'text-slate-500'
          )}>
            {isFull ? 'Penuh' : `${trip.availableSeats} kursi`}
          </span>
        </div>

        {stops.length > 2 && (
          <div
            role="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-teal-600 hover:text-teal-700 ml-1"
            data-testid={`button-expand-stops-${trip.tripId}`}
          >
            <MapPin className="w-3 h-3" />
            {stops.length} stop
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        )}
      </div>

      {expanded && stops.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100/60" onClick={(e) => e.stopPropagation()}>
          <div className="ml-1 pl-3 border-l-2 border-teal-100 space-y-1.5">
            {stops.map((stop, i) => (
              <div key={stop.code} className="flex items-center gap-2 text-[11px]">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0 -ml-[13px]',
                  i === 0 ? 'bg-teal-500' : i === stops.length - 1 ? 'bg-coral-500' : 'bg-slate-300'
                )} />
                <span className="font-semibold text-slate-600 w-10 shrink-0">{fmtTime(stop.departAt || stop.arriveAt)}</span>
                <span className="text-slate-800 font-medium truncate">{stop.name}</span>
                <span className="text-slate-400 shrink-0 text-[10px]">{stop.city}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
