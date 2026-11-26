// Dunne fetch-wrapper voor de .NET-backend.
// Zet automatisch het JWT-token mee en vertaalt fouten naar ApiError.
import { clearSession, getSession } from '../auth/session'

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

// Netwerkfout of de Vite-proxy kan de backend niet bereiken
export function isBackendUnreachable(error) {
  return !(error instanceof ApiError) || [502, 503, 504].includes(error.status)
}

export async function http(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const session = getSession()
  if (auth && session?.token) headers.Authorization = `Bearer ${session.token}`

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  // Token verlopen of ongeldig (bijv. backend herstart met tijdelijke sleutel): opnieuw inloggen
  if (response.status === 401 && auth && session?.token) {
    clearSession()
    window.location.assign('/login')
  }

  if (!response.ok) {
    const message =
      (typeof data === 'string' && data) ||
      data?.detail ||
      data?.title ||
      data?.message ||
      `Verzoek mislukt (${response.status})`
    throw new ApiError(response.status, message, data)
  }

  return data
}
