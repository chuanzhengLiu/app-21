export type UserRole = 'platform_admin' | 'gym_admin' | 'setter' | 'verified_climber' | 'guest';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  gymId?: number;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Gym {
  id: number;
  name: string;
  address?: string;
  areaSqm?: number;
  adminId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Wall {
  id: number;
  gymId: number;
  name: string;
  description?: string;
  photoUrl?: string;
  polygonCoords?: object;
  createdAt: string;
  updatedAt: string;
}

export type RouteStatus = 'drafting' | 'open' | 'removing' | 'removed';
export type RouteType = 'boulder' | 'lead' | 'top_rope' | 'speed';

export interface Route {
  id: number;
  wallId: number;
  name: string;
  grade: string;
  color?: string;
  type: RouteType;
  status: RouteStatus;
  setterId?: number;
  setterName?: string;
  pathCoords?: object;
  tags?: string[];
  length?: number;
  description?: string;
  openDate?: string;
  plannedRemoveDate?: string;
  holds: Hold[];
  ascentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Hold {
  id: number;
  routeId: number;
  type: HoldType;
  positionX: number;
  positionY: number;
}

export type HoldType = 'hand' | 'foot' | 'start' | 'end';

export type AscentType = 'flash' | 'redpoint' | 'onsight' | 'high_point' | 'fall';

export interface Ascent {
  id: number;
  userId: number;
  routeId: number;
  ascentType: AscentType;
  attempts: number;
  feltGrade?: string;
  videoUrl?: string;
  notes?: string;
  visibility?: 'private' | 'friends' | 'public';
  routeName?: string;
  routeGrade?: string;
  userName?: string;
  route?: Route;
  createdAt: string;
}

export interface GradeVote {
  id: number;
  userId: number;
  routeId: number;
  suggestedGrade: string;
  createdAt: string;
}

export interface EmailLoginCredentials {
  email: string;
  password: string;
}

export interface PhoneLoginCredentials {
  phone: string;
  password: string;
}

export type LoginCredentials = EmailLoginCredentials | PhoneLoginCredentials;

export interface RegisterCredentials {
  name: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SendCodeResponse {
  success: boolean;
  message: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface RouteHeat {
  routeId: number;
  routeName: string;
  grade: string;
  totalAscents: number;
  sentCount: number;
  sendRate: number;
}

export interface ColdRoute {
  routeId: number;
  routeName: string;
  grade: string;
  daysSinceLastAscent: number;
  openDate: string | null;
}

export interface SetterWorkload {
  setterId: number;
  setterName: string;
  routesSet: number;
}

export interface ActiveUsersStats {
  weeklyActiveUsers: number;
  totalMembers: number;
  avgRoutesPerUser: number;
}
