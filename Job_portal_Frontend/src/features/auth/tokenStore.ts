let accessToken: string | null = null;
let refreshToken: string | null = null;

/**
 * tokenStore:
 * In-memory storage for JWT access and refresh tokens.
 */
export const tokenStore = {
  /** getAccess: Returns the active JWT access token for API requests */
  getAccess: () => accessToken,

  /** getRefresh: Returns the stored JWT refresh token for renewing sessions */
  getRefresh: () => refreshToken,

  /** set: Updates both access and refresh tokens in memory */
  set: (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
  },

  /** clear: Wipes all authentication tokens upon user sign-out or session expiry */
  clear: () => {
    accessToken = null;
    refreshToken = null;
  },
};
