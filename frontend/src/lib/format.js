const dtf = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const df = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const tf = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' })

export const formatDateTime = (v) => (v ? dtf.format(new Date(v)) : '–')
export const formatDate = (v) => (v ? df.format(new Date(v)) : '–')
export const formatTime = (v) => (v ? tf.format(new Date(v)) : '–')

export function timeAgo(v, now = Date.now()) {
  const min = Math.round((now - new Date(v).getTime()) / 60_000)
  if (min < 1) return 'zojuist'
  if (min < 60) return `${min} min geleden`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} uur geleden`
  return `${Math.round(h / 24)} dagen geleden`
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const NIST_STATUSES = [
  { key: 'DetectieEnAnalyse', label: 'Detectie en analyse' },
  { key: 'Containment', label: 'Containment' },
  { key: 'EradicatieEnHerstel', label: 'Eradicatie en herstel' },
  { key: 'PostIncident', label: 'Post-incident' },
  { key: 'Gesloten', label: 'Gesloten' },
]
export const nistLabel = (key) => NIST_STATUSES.find((s) => s.key === key)?.label ?? key

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
export const SEVERITY_LABELS = { Critical: 'Kritiek', High: 'Hoog', Medium: 'Middel', Low: 'Laag' }
export const severityRank = (s) => SEVERITIES.indexOf(s)

export const ALERT_STATUS_LABELS = { Open: 'Open', FalsePositive: 'False positive', Promoted: 'Gepromoveerd', Linked: 'Gekoppeld' }

export const HANDOVER_CATEGORIES = {
  NewActor: 'Nieuwe actor',
  Pentest: 'Pentest',
  ClientAppointment: 'Klantafspraak',
  RecurringFalsePositive: 'Terugkerende false positive',
  Other: 'Overig',
}

export const CLASSIFICATIONS = ['Phishing', 'Malware', 'Ransomware', 'Ongeautoriseerde toegang', 'Datalek', 'DDoS', 'Insider', 'Overig']
export const IMPACTS = ['Laag', 'Middel', 'Hoog', 'Kritiek']
