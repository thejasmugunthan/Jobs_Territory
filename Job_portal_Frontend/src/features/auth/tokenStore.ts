let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,
  set: (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
  },
  clear: () => {
    accessToken = null;
    refreshToken = null;
  },
};
