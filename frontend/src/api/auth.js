// Inloggen via Kuray's endpoints (branch kuray/auth, US-02):
//   POST /api/register         { email, password }        -> 202 { secret, provisioningUri }
//   POST /api/register/verify  { email, password, code }  -> 204
//   POST /api/login            { email, password, code }  -> 200 { token }
// Daarnaast een demo-login zonder backend, voor de presentatie.
import { http, ApiError, isBackendUnreachable } from './http'
import { sessionFromToken } from '../auth/session'
import { getDb } from './mock/db'

function friendly(error, context) {
  if (isBackendUnreachable(error)) {
    return 'De backend is niet bereikbaar. Start de API (dotnet run --launch-profile https) of log in met een demo-account.'
  }
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Te veel pogingen. Wacht een minuut en probeer het opnieuw.'
    if (error.status === 400) return 'Controleer de invoer: een geldig e-mailadres en een code van 6 cijfers.'
    if (error.status === 409) return 'Tweestapsverificatie is voor dit account al ingesteld. Log gewoon in.'
    if (error.status === 401) {
      return context === 'login'
        ? 'E-mailadres, wachtwoord of code klopt niet. Nog geen 2FA ingesteld? Kies dan "Stel eerst tweestapsverificatie in".'
        : 'E-mailadres, wachtwoord of code klopt niet.'
    }
  }
  return error.message || 'Er ging iets mis.'
}

export async function login({ email, password, code }) {
  try {
    const { token } = await http('/api/login', { method: 'POST', auth: false, body: { email, password, code } })
    return sessionFromToken(token)
  } catch (error) {
    throw new Error(friendly(error, 'login'), { cause: error })
  }
}

export async function startTwoFactorSetup({ email, password }) {
  try {
    return await http('/api/register', { method: 'POST', auth: false, body: { email, password } })
  } catch (error) {
    throw new Error(friendly(error, 'register'), { cause: error })
  }
}

export async function confirmTwoFactorSetup({ email, password, code }) {
  try {
    await http('/api/register/verify', { method: 'POST', auth: false, body: { email, password, code } })
  } catch (error) {
    throw new Error(friendly(error, 'verify'), { cause: error })
  }
}

// Demo: inloggen als een van de fictieve gebruikers uit de mock-store
export function demoAccounts() {
  return getDb().users.filter((u) => u.active && [1, 3, 4, 5, 6, 7].includes(u.id))
}

export function demoSession(userId) {
  const u = getDb().users.find((x) => x.id === userId)
  return { token: null, source: 'demo', userId: u.id, tenantId: u.tenantId, role: u.role, email: u.email, name: u.name, expiresAt: null }
}
