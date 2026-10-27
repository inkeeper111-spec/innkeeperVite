export const STAFF_SESSION_KEYS = {
  accessToken: 'innkeeper.staff.accessToken',
  refreshToken: 'innkeeper.staff.refreshToken',
  sessionId: 'innkeeper.staff.sessionId'
};

export const STAFF_ROLES = [
  'super_admin',
  'hotel_admin',
  'receptionist',
  'restaurant_staff',
  'housekeeping_staff',
  'maintenance_staff'
];

export const getStaffAccessToken = () => localStorage.getItem(STAFF_SESSION_KEYS.accessToken);
export const getStaffRefreshToken = () => localStorage.getItem(STAFF_SESSION_KEYS.refreshToken);
export const getStaffSessionId = () => localStorage.getItem(STAFF_SESSION_KEYS.sessionId);

export const setStaffSession = ({ accessToken, refreshToken }) => {
  const sessionId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(STAFF_SESSION_KEYS.sessionId, sessionId);
  localStorage.setItem(STAFF_SESSION_KEYS.refreshToken, refreshToken);
  localStorage.setItem(STAFF_SESSION_KEYS.accessToken, accessToken);
  return sessionId;
};

export const updateStaffTokens = ({ accessToken, refreshToken }) => {
  localStorage.setItem(STAFF_SESSION_KEYS.refreshToken, refreshToken);
  localStorage.setItem(STAFF_SESSION_KEYS.accessToken, accessToken);
};

export const clearStaffSession = () => {
  localStorage.removeItem(STAFF_SESSION_KEYS.refreshToken);
  localStorage.removeItem(STAFF_SESSION_KEYS.sessionId);
  localStorage.removeItem(STAFF_SESSION_KEYS.accessToken);
};

export const isStaffRole = (role) => STAFF_ROLES.includes(role);
