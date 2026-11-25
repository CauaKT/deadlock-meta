export interface AuthUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  emailVerificationRequired?: boolean;
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
  handle_confirmed?: boolean;
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
  friends_public?: boolean;
}

export interface PublicProfile {
  id: string;
  user_id?: string;
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
  friends_public?: boolean;
  createdAt?: string | null;
}

export interface CommunityProfileItem {
  id: string;
  user_id?: string;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  favorite_hero_id: number | null;
  mutual_friends_count?: number;
}

export type TierListStyle = "classic" | "quadrant";

export interface TierRowData {
  label: string;
  color: string;
  heroes: number[];
}

export interface TierQuadrantItem {
  heroId: number;
  x: number;
  y: number;
}

export interface TierQuadrantData {
  topLabel: string;
  bottomLabel: string;
  leftLabel: string;
  rightLabel: string;
  axes?: string[];
  items: TierQuadrantItem[];
}

export interface TierListCommentAuthor {
  id: string;
  username: string;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
}

export interface TierListComment {
  id: string;
  tierListId: string;
  content: string;
  createdAt: string;
  author: TierListCommentAuthor;
  canDelete: boolean;
}

export interface TierListItem {
  id: string;
  title: string;
  description?: string | null;
  author: string;
  authorHandle: string | null;
  authorAvatarUrl?: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  style?: TierListStyle;
  tiers: TierRowData[];
  quadrant?: TierQuadrantData | null;
  viewsCount?: number;
  likesCount?: number;
  commentsCount?: number;
  likedByMe?: boolean;
  relevanceScore?: number;
  recentComments?: TierListComment[];
  comments?: TierListComment[];
  canEdit: boolean;
  canDelete: boolean;
}

export interface SaveTierListInput {
  title: string;
  description?: string | null;
  authorName?: string;
  style?: TierListStyle;
  tiers: TierRowData[];
  quadrant?: TierQuadrantData | null;
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

export interface FeedAuthor {
  id: string;
  username: string;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
}

export interface FeedComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: FeedAuthor;
  canDelete: boolean;
}

export interface FeedTierListEmbed {
  id: string;
  title: string;
  author: string;
  authorHandle: string | null;
  authorAvatarUrl: string | null;
  style: TierListStyle;
  tiers: TierRowData[];
  quadrant: TierQuadrantData | null;
  likesCount: number;
  commentsCount: number;
}

export interface FeedPost {
  id: string;
  content: string;
  mediaUrl: string | null;
  tierList?: FeedTierListEmbed | null;
  createdAt: string;
  author: FeedAuthor;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  canDelete: boolean;
  comments: FeedComment[];
}

export interface FeedResponse {
  items: FeedPost[];
  page: number;
  hasMore: boolean;
}

export interface FriendUser {
  friendshipId: string;
  userId: string;
  username: string;
  handle: string | null;
  avatarUrl: string | null;
  favoriteHeroId: number | null;
  createdAt: string;
}

export interface FriendsOverview {
  friends: FriendUser[];
  incoming: FriendUser[];
  outgoing: FriendUser[];
}

export interface PublicFriendsResponse {
  friendsPublic: boolean;
  hidden: boolean;
  friends: FriendUser[];
}

export interface BuildPhases {
  early: string[];
  mid: string[];
  late: string[];
  situational: string[];
}

export interface CommunityBuildItem {
  id: string;
  heroId: number;
  title: string;
  author: string;
  authorHandle: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  phases: BuildPhases;
  canEdit: boolean;
  canDelete: boolean;
}

export interface SaveBuildInput {
  heroId: number;
  title: string;
  phases: BuildPhases;
}