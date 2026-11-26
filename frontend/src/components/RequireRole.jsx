import { Navigate, Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { can } from '../config'

// Route-bewaking in de UI. De echte controle (403) zit in de backend (US-03).
export default function RequireRole({ permission, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (permission && !can(user.role, permission)) {
    return (
      <div className="forbidden">
        <h1>Geen toegang</h1>
        <p className="muted">Je rol heeft geen rechten voor deze pagina. Vraag een manager om je rechten aan te passen als je dit wel nodig hebt.</p>
        <Link className="btn" to="/">Naar je startpagina</Link>
      </div>
    )
  }
  return children
}
