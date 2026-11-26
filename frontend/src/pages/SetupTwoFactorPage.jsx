// US-02 AC 1: bij de eerste login stelt de gebruiker 2FA in via een QR-code.
// Kuray: POST /api/register -> secret + otpauth-URI, daarna POST /api/register/verify.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import QRCode from 'qrcode'
import { startTwoFactorSetup, confirmTwoFactorSetup } from '../api/auth'
import { ErrorBox } from '../components/ui'
import { AuthSide } from './LoginPage'

export default function SetupTwoFactorPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ email: '', password: '', code: '' })
  const [setup, setSetup] = useState(null)
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (setup?.provisioningUri) QRCode.toDataURL(setup.provisioningUri, { margin: 1, width: 300 }).then(setQr)
  }, [setup])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'code' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value }))

  async function start(e) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      setSetup(await startTwoFactorSetup(form))
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function verify(e) {
    e.preventDefault()
    setError(null)
    if (form.code.length !== 6) return setError('Vul de code van 6 cijfers in.')
    setPending(true)
    try {
      await confirmTwoFactorSetup(form)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-page">
      <AuthSide />
      <main className="auth-main">
        <div className="auth-card">
          <div className="steps-indicator" aria-label={`Stap ${step} van 3`}>
            {[1, 2, 3].map((n) => <span key={n} className={n <= step ? 'on' : ''} />)}
          </div>
          <div>
            <h1>Tweestapsverificatie instellen</h1>
            <p className="muted">Nodig bij de eerste keer inloggen. Je manager heeft je account al aangemaakt.</p>
          </div>

          {step === 1 && (
            <form onSubmit={start} noValidate>
              <div className="field">
                <label htmlFor="email">E-mailadres</label>
                <input id="email" className="input" type="email" value={form.email} onChange={set('email')} autoComplete="username" />
              </div>
              <div className="field">
                <label htmlFor="password">Wachtwoord</label>
                <input id="password" className="input" type="password" value={form.password} onChange={set('password')} autoComplete="current-password" />
              </div>
              <ErrorBox error={error} />
              <button className="btn primary" disabled={pending}>{pending ? 'Bezig…' : 'QR-code tonen'}</button>
            </form>
          )}

          {step === 2 && setup && (
            <form onSubmit={verify} noValidate>
              <div className="qr">
                {qr ? <img src={qr} alt="QR-code voor je authenticator-app" /> : <div style={{ width: 150, height: 150 }} />}
                <div className="small">
                  <p>Scan de code met een authenticator-app, zoals Microsoft Authenticator of Google Authenticator.</p>
                  <p style={{ marginTop: 8 }}>Lukt scannen niet? Voer deze sleutel handmatig in:</p>
                  <p className="mono secret" style={{ marginTop: 4 }}>{setup.secret}</p>
                </div>
              </div>
              <div className="field">
                <label htmlFor="code">Code uit de app</label>
                <input id="code" className="input code" inputMode="numeric" placeholder="000000" value={form.code} onChange={set('code')} autoComplete="one-time-code" />
              </div>
              <ErrorBox error={error} />
              <button className="btn primary" disabled={pending}>{pending ? 'Bezig…' : 'Bevestigen'}</button>
            </form>
          )}

          {step === 3 && (
            <div className="stack">
              <div className="alert-box success">Tweestapsverificatie staat aan.</div>
              <p className="muted">Log nu in met je wachtwoord en een nieuwe code. Een code kan maar één keer worden gebruikt, dus wacht tot de app een nieuwe code toont.</p>
              <Link to="/login" className="btn primary">Naar inloggen</Link>
            </div>
          )}

          <p className="small"><Link to="/login">Terug naar inloggen</Link></p>
        </div>
      </main>
    </div>
  )
}
