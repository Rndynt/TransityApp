export interface AppUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: AppUser;
  token: string;
}

export interface StopSummary {
  name: string;
  code: string;
  city: string | null;
}

export interface StopDetail extends StopSummary {
  stopId: string;
}

export interface TripStopInfo {
  stopId: string;
  name: string;
  code: string;
  city?: string;
  sequence: number;
  arriveAt: string | null;
  departAt: string | null;
}

export interface GatewayStopInfo {
  stopId: string;
  cityName: string;
  stopName: string;
  sequence: number;
  departureTime: string | null;
}

export interface TripSearchResult {
  tripId: string;
  serviceDate: string;
  vehicleClass: string | null;
  operatorName: string;
  operatorSlug: string;
  operatorLogo: string | null;
  operatorColor: string | null;
  origin: GatewayStopInfo | null;
  destination: GatewayStopInfo | null;
  availableSeats: number;
  farePerPerson: number;
  isVirtual: boolean;
}

export interface TripDetail {
  tripId: string;
  serviceDate: string | null;
  patternCode: string | null;
  patternName: string | null;
  vehicleClass: string | null;
  operatorName: string | null;
  capacity: number | null;
  status: string | null;
  seatAvailability: { total: number; sold: number; available: number };
  stops: Array<{
    stopId: string;
    name: string;
    code: string;
    city: string | null;
    sequence: number;
    arriveAt: string | null;
    departAt: string | null;
    boardingAllowed: boolean;
    alightingAllowed: boolean;
  }>;
  reviews: { count: number; avgRating: number };
}

export interface SeatmapResponse {
  layout: { rows: number | null; cols: number | null; seatMap: SeatMapItem[] };
  seatAvailability: Record<string, { available: boolean; held: boolean }>;
}

export interface SeatMapItem {
  row: number;
  col: number;
  label: string;
  type: string;
}

export interface PassengerInfo {
  id: string;
  fullName: string;
  phone: string | null;
  seatNo: string;
  fareAmount: string | null;
}

export interface QrDataItem {
  passengerId: string;
  seatNo: string;
  fullName: string;
  qrToken: string;
  qrPayload: string;
}

export interface BookingListItem {
  id: string;
  tripId: string;
  serviceDate: string | null;
  patternCode: string | null;
  patternName: string | null;
  status: string | null;
  totalAmount: string | null;
  origin: StopSummary | null;
  destination: StopSummary | null;
  passengerCount: number;
  createdAt?: string | null;
}

export interface BookingDetail {
  id: string;
  bookingId?: string;
  tripId: string;
  serviceDate: string | null;
  patternCode: string | null;
  patternName: string | null;
  operatorName?: string | null;
  operatorSlug?: string | null;
  origin: StopDetail | null;
  destination: StopDetail | null;
  departAt: string | null;
  arriveAt: string | null;
  status: string | null;
  totalAmount: string | null;
  channel: string | null;
  holdExpiresAt: string | null;
  qrData: QrDataItem[];
  passengers: PassengerInfo[];
  payments: Array<{
    id: string;
    method: string;
    amount: string | null;
    status: string | null;
    paidAt: string | null;
  }>;
  paymentIntent: {
    paymentId: string;
    method: string;
    amount: string | null;
    status: string | null;
    providerRef: string | null;
    expiresAt: string | null;
  } | null;
  createdAt: string | null;
}

export interface GatewayBookingResponse {
  bookingId: string;
  externalBookingId?: string;
  operatorId?: string;
  operatorName?: string;
  operatorSlug?: string;
  status: string;
  totalAmount: string;
  holdExpiresAt: string | null;
  paymentIntent: {
    paymentId: string;
    method: string;
    amount: string;
  } | null;
  qrData: QrDataItem[];
  passengers: PassengerInfo[];
  tripId: string;
}

export interface CreateBookingData {
  tripId: string;
  serviceDate: string;
  originStopId: string;
  destinationStopId: string;
  originSeq: number;
  destinationSeq: number;
  passengers: Array<{ fullName: string; phone?: string; idNumber?: string; seatNo: string }>;
  paymentMethod: string;
}

function getToken(): string | null {
  try { return localStorage.getItem('transity_token'); } catch { return null; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Terjadi kesalahan' }));
    throw new Error(err.error || err.message || 'Terjadi kesalahan');
  }
  return res.json();
}

const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: Record<string, unknown>) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: Record<string, unknown>) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const authApi = {
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post<AuthResponse>('/api/app/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/app/auth/login', data),
  getMe: () => api.get<AppUser>('/api/app/auth/me'),
  updateProfile: (data: { name?: string; phone?: string }) =>
    api.patch<AppUser>('/api/app/profile', data),
};

export interface TripSearchPaginatedResponse {
  data: TripSearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface GatewaySearchResponse {
  trips: TripSearchResult[];
  errors?: Array<{ operatorSlug: string; error: string }>;
  totalOperators?: number;
  respondedOperators?: number;
}

export interface OperatorInfo {
  slug: string;
  name: string;
  color: string;
  logo: string | null;
}

interface CitiesFullResponse {
  cities: ({ city: string; stopCount: number } | string)[];
  byOperator?: { operatorSlug: string; operatorName?: string; operatorLogo?: string | null; operatorColor?: string; cities: unknown[] }[];
}

export const tripsApi = {
  getCitiesAndOperators: async (): Promise<{ cities: string[]; operators: OperatorInfo[] }> => {
    const res = await api.get<CitiesFullResponse | ({ city: string; stopCount: number } | string)[]>('/api/gateway/cities');
    if (Array.isArray(res)) {
      return { cities: res.map((c) => (typeof c === 'string' ? c : c.city)), operators: [] };
    }
    const citiesData = res.cities || [];
    const cities = citiesData.map((c: { city: string; stopCount: number } | string) => (typeof c === 'string' ? c : c.city));
    const operators: OperatorInfo[] = (res.byOperator || [])
      .filter((op) => op.operatorSlug)
      .map((op) => ({
        slug: op.operatorSlug,
        name: op.operatorName || op.operatorSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        color: op.operatorColor || '#134E4A',
        logo: op.operatorLogo || null,
      }));
    return { cities, operators };
  },

  getCities: async (): Promise<string[]> => {
    const { cities } = await tripsApi.getCitiesAndOperators();
    return cities;
  },

  search: async (params: { originCity: string; destinationCity: string; date: string; passengers?: number; page?: number; limit?: number }): Promise<TripSearchResult[]> => {
    const qs = new URLSearchParams(params as unknown as Record<string, string>).toString();
    const result = await api.get<GatewaySearchResponse | TripSearchResult[]>(`/api/gateway/trips/search?${qs}`);
    if (Array.isArray(result)) return result;
    if ('trips' in result) return result.trips;
    return [];
  },

  searchPaginated: async (params: { originCity: string; destinationCity: string; date: string; passengers?: number; page: number; limit: number }): Promise<TripSearchPaginatedResponse> => {
    const qs = new URLSearchParams(params as unknown as Record<string, string>).toString();
    const result = await api.get<GatewaySearchResponse | TripSearchPaginatedResponse | TripSearchResult[]>(`/api/gateway/trips/search?${qs}`);

    if (Array.isArray(result)) {
      return { data: result, total: result.length, page: 1, limit: result.length, hasMore: false };
    }
    if ('trips' in result) {
      const trips = result.trips;
      const page = params.page;
      const limit = params.limit;
      const start = (page - 1) * limit;
      const sliced = trips.slice(start, start + limit);
      return {
        data: sliced,
        total: trips.length,
        page,
        limit,
        hasMore: start + limit < trips.length,
      };
    }
    return result as TripSearchPaginatedResponse;
  },

  getDetail: (tripId: string) => api.get<TripDetail>(`/api/gateway/trips/${tripId}`),
  getSeatmap: (tripId: string, originSeq: number, destSeq: number) =>
    api.get<SeatmapResponse>(`/api/gateway/trips/${tripId}/seatmap?originSeq=${originSeq}&destinationSeq=${destSeq}`),
};

export const bookingsApi = {
  create: (data: CreateBookingData) =>
    api.post<GatewayBookingResponse>('/api/gateway/bookings', data as unknown as Record<string, unknown>),
  list: () => api.get<BookingListItem[]>('/api/app/bookings'),
  getDetail: (id: string) => api.get<BookingDetail>(`/api/app/bookings/${id}`),
  getGatewayDetail: (bookingId: string) => api.get<BookingDetail>(`/api/gateway/bookings/${bookingId}`),
  cancel: (id: string) => api.post<{ success: boolean }>(`/api/app/bookings/${id}/cancel`, {}),
};

export const store = {
  setAuth(user: AppUser, token: string) {
    localStorage.setItem('transity_token', token);
    localStorage.setItem('transity_user', JSON.stringify(user));
  },
  getUser(): AppUser | null {
    try {
      const raw = localStorage.getItem('transity_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  getToken,
  logout() {
    localStorage.removeItem('transity_token');
    localStorage.removeItem('transity_user');
  },
  isLoggedIn(): boolean {
    return !!localStorage.getItem('transity_token');
  },
};
