// Sessie per browsertab (sessionStorage), zodat je in één tab als analist
// en in een tweede tab als klant kunt inloggen tijdens de demo.
const KEY = 'soc.session'

export function getSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (session.expiresAt && Date.now() > session.expiresAt) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function saveSession(session) {
  sessionStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(KEY)
}

// Leest de claims uit een JWT zonder te verifiëren (dat doet de backend).
export function decodeJwt(token) {
  const payload = token.split('.')[1]
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(decodeURIComponent(escape(json)))
}

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
const EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'

// Kuray's JwtTokenGenerator zet: user_id, tenant_id, email, role.
// De DevTokenEndpoint op Dev zet: sub, name, role, tenant_id. We ondersteunen beide.
export function sessionFromToken(token) {
  const claims = decodeJwt(token)
  const email = (claims.email || claims[EMAIL_CLAIM] || '').toLowerCase()
  return {
    token,
    source: 'backend',
    userId: Number(claims.user_id ?? claims.sub ?? 0),
    tenantId: Number(claims.tenant_id ?? 0),
    role: claims.role || claims[ROLE_CLAIM],
    email,
    name: claims.name || nameFromEmail(email),
    expiresAt: claims.exp ? claims.exp * 1000 : null,
  }
}

function nameFromEmail(email) {
  const local = email.split('@')[0] || 'Gebruiker'
  return local.charAt(0).toUpperCase() + local.slice(1)
}
