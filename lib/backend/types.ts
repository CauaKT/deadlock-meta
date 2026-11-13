export interface AuthUser {
  id: string;
  email: string;
  createdAt: string | null;
  suggestedUsername: string;
  suggestedFullName: string;
  suggestedAvatarUrl: string | null;
}

export interface ProfileSummary {
  username: string | null;
  avatar_url?: string | null;
  favorite_hero_id?: number | null;
  handle?: string | null;
}

export interface OnboardingProfile {
  username: string | null;
  avatar_url: string | null;
  handle: string | null;
}

export interface FullProfile {
  id: string;
  username: string | null;
  bio: string | null;
  handle: string | null;
  avatar_url: string | null;
  steam_id: string | null;
  favorite_hero_id: number | null;
  banner_hero_id: number | null;
  banner_image: string | null;
  profile_color: string | null;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  favorite_hero_id: number | null;
  bio: string | null;
  banner_hero_id: number | null;
  banner_image: string | null;
  profile_color: string | null;
  createdAt?: string | null;
}

export interface CommunityProfileItem {
  id: string;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  favorite_hero_id: number | null;
}