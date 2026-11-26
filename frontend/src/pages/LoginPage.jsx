import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { login, demoAccounts, demoSession } from '../api/auth'
import { ROLE_LABELS } from '../config'
import { ErrorBox } from '../components/ui'
import Logo from '../components/Logo'
import { homeFor } from '../lib/routes'


export function AuthSide() {
  return (
    <aside className="auth-side">
      <div className="brand">
        <Logo />
      </div>
      <p className="auth-note">Alleen voor geautoriseerde gebruikers. Inlogpogingen worden vastgelegd.</p>
    </aside>
  )
}

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', code: '' })
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'code' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (form.code.length !== 6) return setError('Vul de code van 6 cijfers uit je authenticator-app in.')
    setPending(true)
    try {
      const session = await login(form)
      signIn(session)
      navigate(homeFor(session.role))
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  function demo(userId) {
    const session = demoSession(userId)
    signIn(session)
    navigate(homeFor(session.role))
  }

  return (
    <div className="auth-page">
      <AuthSide />
      <main className="auth-main">
        <div className="auth-card">
          <div>
            <h1>Inloggen</h1>
            <p className="muted">Met je wachtwoord en de code uit je authenticator-app.</p>
          </div>

          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input id="email" className="input" type="email" autoComplete="username" value={form.email} onChange={set('email')} required />
            </div>
            <div className="field">
              <label htmlFor="password">Wachtwoord</label>
              <input id="password" className="input" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} required />
            </div>
            <div className="field">
              <label htmlFor="code">Code uit authenticator-app</label>
              <input id="code" className="input code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={form.code} onChange={set('code')} />
            </div>
            <ErrorBox error={error} />
            <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Bezig met inloggen…' : 'Inloggen'}</button>
            <p className="small muted">
              Eerste keer inloggen? <Link to="/setup-2fa">Stel eerst tweestapsverificatie in</Link>.
            </p>
          </form>

          <div className="divider">of gebruik een demo-account</div>
          <div className="demo-list">
            {demoAccounts().map((u) => (
              <button key={u.id} className="demo-account" onClick={() => demo(u.id)}>
                <b>{ROLE_LABELS[u.role]}</b>
                <span>{u.name}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
