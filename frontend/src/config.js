// Centrale instellingen voor de frontend.
// API_MODE "mock": alles draait op de demo-store (src/api/mock).
// API_MODE "live": functies die al een backend-endpoint hebben gaan via HTTP.
export const API_MODE = import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock'

export const isLive = API_MODE === 'live'

// Rollen zoals in backend/Models/User.cs (UserRole)
export const ROLES = {
  Analyst: 'Analyst',
  SecurityEngineer: 'SecurityEngineer',
  Manager: 'Manager',
  AccountManager: 'AccountManager',
  Client: 'Client',
}

export const ROLE_LABELS = {
  Analyst: 'SOC-analist',
  SecurityEngineer: 'Security engineer',
  Manager: 'Manager',
  AccountManager: 'Accountmanager',
  Client: 'Klantviewer',
}

export const EMPLOYEE_ROLES = [ROLES.Analyst, ROLES.SecurityEngineer, ROLES.Manager, ROLES.AccountManager]

// Welke rol mag welk scherm (US-03 AC 3: menu-items zonder recht worden niet getoond)
export const PERMISSIONS = {
  alerts: [ROLES.Analyst, ROLES.SecurityEngineer, ROLES.Manager],
  cases: EMPLOYEE_ROLES,
  handover: EMPLOYEE_ROLES,
  engineering: [ROLES.SecurityEngineer, ROLES.Manager],
  management: [ROLES.Manager],
  accounts: [ROLES.Manager],
  portal: [ROLES.Client],
}

export function can(role, permission) {
  return PERMISSIONS[permission]?.includes(role) ?? false
}
