// Verborgen bediening voor de presentatie: niet zichtbaar in de interface.
// Openen en sluiten met Alt+Shift+D, of door ?demo achter het adres te zetten.
import { useEffect, useState } from 'react'
import { simulateAlert } from '../api/alerts'
import { resetDb } from '../api/mock/db'
import { emit, EVENTS } from '../api/realtime'
import { API_MODE } from '../config'

export default function DemoPanel() {
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has('demo'))
  const [autoSim, setAutoSim] = useState(() => sessionStorage.getItem('soc.autosim') === '1')
  const [done, setDone] = useState(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // De simulator blijft lopen als het paneel dicht is
  useEffect(() => {
    sessionStorage.setItem('soc.autosim', autoSim ? '1' : '0')
    if (!autoSim) return
    const t = setInterval(() => simulateAlert(), 45_000)
    return () => clearInterval(t)
  }, [autoSim])

  const flash = (text) => {
    setDone(text)
    setTimeout(() => setDone(null), 2000)
  }

  if (!open) return null
  return (
    <div className="demo-panel" role="dialog" aria-label="Demobediening">
      <div className="spread">
        <b>Demobediening</b>
        <button className="demo-close" aria-label="Sluiten" onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="rail-buttons">
        <button className="rail-button" onClick={() => { simulateAlert(); flash('Alert verstuurd') }}>Alert simuleren</button>
        <button className="rail-button" aria-pressed={autoSim} onClick={() => setAutoSim((v) => !v)}>
          Simulator {autoSim ? 'aan' : 'uit'}
        </button>
        <button
          className="rail-button"
          onClick={() => {
            if (confirm('Alle demodata terugzetten naar de beginstand?')) {
              resetDb()
              emit(EVENTS.CaseUpdated, {}) // andere tabbladen lezen de store opnieuw in
              window.location.reload()
            }
          }}
        >
          Demo resetten
        </button>
      </div>
      <div className="demo-hint">
        {done ?? `Data: ${API_MODE === 'live' ? 'backend' : 'demodata'}. Sluiten: Alt+Shift+D`}
      </div>
    </div>
  )
}
