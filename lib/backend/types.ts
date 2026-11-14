export interface AuthUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  mustChangePassword?: boolean;
  createdAt: string | null;
  suggestedUsername: string;
  suggestedFullName: string;
  suggestedAvatarUrl: string | null;
  profile: ProfileSummary | null;
}

export interface SavedAccount {
  id: string;
  email: string;
  username: string | null;
  handle: string | null;
  avatarUrl: string | null;
  isCurrent: boolean;
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

export interface SocialLinks {
  steam?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  discord?: string | null;
  youtube?: string | null;
  twitch?: string | null;
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
  banner_nsfw?: boolean;
  profile_color: string | null;
  social_links?: SocialLinks | null;
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
  banner_nsfw?: boolean;
  profile_color: string | null;
  social_links?: SocialLinks | null;
  createdAt?: string | null;
}

export interface CommunityProfileItem {
  id: string;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  favorite_hero_id: number | null;
}

export interface TierRowData {
  label: string;
  color: string;
  heroes: number[];
}

export interface TierListItem {
  id: string;
  title: string;
  author: string;
  authorHandle: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  tiers: TierRowData[];
  canEdit: boolean;
  canDelete: boolean;
}

export interface SaveTierListInput {
  title: string;
  authorName?: string;
  tiers: TierRowData[];
}

export interface AdminOverview {
  status: string;
  counts: {
    users: number;
    verifiedUsers: number;
    admins: number;
    profiles: number;
    tierLists: number;
  };
}

export interface AdminUserItem {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  createdAt: string;
  profile: {
    username: string | null;
    handle: string | null;
  } | null;
}

export interface AdminUsersResponse {
  page: number;
  limit: number;
  total: number;
  items: AdminUserItem[];
}