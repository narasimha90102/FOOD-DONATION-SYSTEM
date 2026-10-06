/**
 * Canonical role constants for FoodBridge AI.
 * Use ONLY these values throughout the entire mobile app.
 * Never use string literals like 'donor', 'Donor', 'ngo_user', etc.
 */
export const ROLES = {
  DONOR: 'DONOR',
  NGO: 'NGO',
  VOLUNTEER: 'VOLUNTEER',
  ADMIN: 'ADMIN',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Returns the human-readable display label for a given role.
 */
export const getRoleLabel = (role: Role | string | undefined): string => {
  switch (role?.toUpperCase()) {
    case ROLES.DONOR:     return 'Food Surplus Donor';
    case ROLES.NGO:       return 'Registered NGO Partner';
    case ROLES.VOLUNTEER: return 'Registered Volunteer';
    case ROLES.ADMIN:     return 'System Administrator';
    default:              return 'User';
  }
};

/**
 * Returns the home dashboard screen name for a given role.
 */
export const getRoleDashboard = (role: Role | string | undefined): string => {
  switch (role?.toUpperCase()) {
    case ROLES.NGO:       return 'NgoDashboard';
    case ROLES.VOLUNTEER: return 'VolunteerDashboard';
    case ROLES.ADMIN:     return 'AdminDashboard';
    case ROLES.DONOR:
    default:              return 'DonorDashboard';
  }
};

/**
 * Normalizes any role string to canonical UPPERCASE form.
 * Handles 'donor', 'Donor', 'DONOR', 'ngo', 'NGO', etc.
 */
export const normalizeRole = (role: string | undefined): Role => {
  const upper = (role || '').toUpperCase().trim();
  if (Object.values(ROLES).includes(upper as Role)) {
    return upper as Role;
  }
  return ROLES.DONOR; // Safe fallback
};
