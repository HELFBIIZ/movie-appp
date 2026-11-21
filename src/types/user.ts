export type RoleCode = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

/** Public API data only. Password hashes, session tokens and secrets stay in the store. */
export interface PublicUser {
  id: string;
  email: string;
  username: string;
  roleCode: RoleCode;
}

export interface UserProfile {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
}
