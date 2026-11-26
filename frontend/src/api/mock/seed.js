// Fictieve demodata. Alle tijden zijn relatief aan "nu", zodat de SLA-timers
// tijdens de demo verschillende kleuren laten zien. Reset via de knop in de zijbalk.
import { PLAYBOOKS } from './playbooks'
import { currentShift, previousShift } from '../../lib/shifts'

const MIN = 60_000
const DAY = 24 * 60 * MIN

function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const TENANTS = [
  {
    id: 1,
    name: 'Gemeente Voorbeeldstad',
    initials: 'GV',
    color: '#2F6FDB',
    urls: [
      { label: 'Microsoft Defender', url: 'https://security.microsoft.com' },
      { label: 'SIEM (Elastic)', url: 'https://siem.voorbeeldstad.example' },
    ],
    keystoreRef: 'Keystore / Klanten / Voorbeeldstad / Defender-admin',
    contact: 'Jeroen de Wit, CISO',
  },
  {
    id: 2,
    name: 'Zorggroep Demo',
    initials: 'ZD',
    color: '#1F8A5B',
    urls: [
      { label: 'CrowdStrike Falcon', url: 'https://falcon.crowdstrike.com' },
      { label: 'Firewall-beheer', url: 'https://fw.zorggroepdemo.example' },
    ],
    keystoreRef: 'Keystore / Klanten / Zorggroep Demo / Falcon-analist',
    contact: 'Sanne Koster, IT-manager',
  },
  {
    id: 3,
    name: 'Noordkade Transport',
    initials: 'NT',
    color: '#9A4FC4',
    urls: [
      { label: 'SentinelOne', url: 'https://noordkade.sentinelone.example' },
      { label: 'NDR (Darktrace)', url: 'https://ndr.noordkade.example' },
    ],
    keystoreRef: 'Keystore / Klanten / Noordkade / S1-console',
    contact: 'Mehmet Yilmaz, hoofd ICT',
  },
]

// Medewerkers hebben TenantId 0 (zie DevDataSeeder op de Dev-branch)
export const USERS = [
  { id: 1, tenantId: 0, name: 'Anna Analist', email: 'analist@soc.local', role: 'Analyst' },
  { id: 2, tenantId: 0, name: 'Bram Bakker', email: 'bram@soc.local', role: 'Analyst' },
  { id: 3, tenantId: 0, name: 'Erik Engineer', email: 'engineer@soc.local', role: 'SecurityEngineer' },
  { id: 4, tenantId: 0, name: 'Maria Manager', email: 'manager@soc.local', role: 'Manager' },
  { id: 5, tenantId: 0, name: 'Arjen Accountmanager', email: 'accountmanager@soc.local', role: 'AccountManager' },
  { id: 6, tenantId: 1, name: 'Jeroen de Wit', email: 'klant-a@klant.local', role: 'Client' },
  { id: 7, tenantId: 2, name: 'Sanne Koster', email: 'klant-b@klant.local', role: 'Client' },
  { id: 8, tenantId: 3, name: 'Mehmet Yilmaz', email: 'klant-c@klant.local', role: 'Client' },
  { id: 9, tenantId: 0, name: 'Lotte Visser', email: 'lotte@soc.local', role: 'Analyst' },
].map((u) => ({ ...u, active: true, twoFactorEnabled: true }))

// Alerttypes zoals ze uit EDR/NDR/SIEM komen (OCSF class_name + detectieregel)
export const ALERT_TYPES = [
  { type: 'Brute-force op VPN', className: 'Authentication', source: 'SIEM', incidentType: 'brute-force', fpRate: 0.62 },
  { type: 'Phishing-link aangeklikt', className: 'Email Activity', source: 'EDR', incidentType: 'phishing', fpRate: 0.35 },
  { type: 'Verdacht PowerShell-script', className: 'Process Activity', source: 'EDR', incidentType: 'malware', fpRate: 0.48 },
  { type: 'Port scan van extern adres', className: 'Network Activity', source: 'NDR', incidentType: 'overig', fpRate: 0.81 },
  { type: 'Impossible travel login', className: 'Authentication', source: 'SIEM', incidentType: 'brute-force', fpRate: 0.71 },
  { type: 'Ransomware-gedrag gedetecteerd', className: 'Detection Finding', source: 'EDR', incidentType: 'malware', fpRate: 0.12 },
  { type: 'DNS-tunneling vermoed', className: 'DNS Activity', source: 'NDR', incidentType: 'overig', fpRate: 0.55 },
]

const IPS = ['185.220.101.34', '45.155.205.233', '91.240.118.172', '194.26.29.113', '103.75.190.11', '80.66.88.205']
const DOMAINS = ['login-microsoft365.support', 'voorbeeldstad-portaal.net', 'cdn-update.services', 'docusign-secure.click']
const HASHES = [
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
]
const ACCOUNTS = ['j.devries', 'svc_backup', 'admin.helpdesk', 'p.jansen', 'm.bakker', 'beheer01']
const HOSTS = ['WS-0142', 'SRV-FS01', 'LT-HR-022', 'SRV-DC02', 'WS-0377']

export function makeObservables(alertType, r) {
  const pick = (arr) => arr[Math.floor(r() * arr.length)]
  const list = [
    { type: 'IP-adres', value: pick(IPS), role: 'Bron' },
    { type: 'Gebruikersnaam', value: pick(ACCOUNTS), role: 'Doelwit' },
    { type: 'Hostnaam', value: pick(HOSTS), role: 'Getroffen systeem' },
  ]
  if (alertType.incidentType === 'phishing') list.push({ type: 'Domein', value: pick(DOMAINS), role: 'Phishing-URL' })
  if (alertType.incidentType === 'malware') list.push({ type: 'Bestandshash (SHA-256)', value: pick(HASHES), role: 'Payload' })
  if (alertType.type.startsWith('DNS')) list.push({ type: 'Domein', value: pick(DOMAINS), role: 'C2' })
  return list
}

const SEVERITY_BY_TYPE = {
  'Ransomware-gedrag gedetecteerd': 'Critical',
  'Phishing-link aangeklikt': 'High',
  'Verdacht PowerShell-script': 'High',
  'Brute-force op VPN': 'Medium',
  'Impossible travel login': 'Medium',
  'DNS-tunneling vermoed': 'Medium',
  'Port scan van extern adres': 'Low',
}

function buildAlert(id, tenantId, alertType, createdAt, r, extra = {}) {
  return {
    id,
    tenantId,
    source: alertType.source,
    className: alertType.className,
    alertType: alertType.type,
    message: `${alertType.type} bij ${TENANTS.find((t) => t.id === tenantId).name}`,
    severity: extra.severity || SEVERITY_BY_TYPE[alertType.type],
    status: 'Open',
    createdAt: new Date(createdAt).toISOString(),
    detectedAt: new Date(createdAt - Math.floor(r() * 3) * MIN).toISOString(),
    caseId: null,
    closedAt: null,
    closedByUserId: null,
    observables: makeObservables(alertType, r),
    ...extra,
  }
}

export function freshPlaybook(incidentType) {
  const pb = PLAYBOOKS[incidentType] || PLAYBOOKS.overig
  return { key: pb.key, steps: pb.steps.map((s) => ({ id: s.id, status: 'open' })) }
}

export function buildSeed() {
  const r = rng(20261126)
  const now = Date.now()
  const at = (minAgo) => now - minAgo * MIN
  const iso = (ms) => new Date(ms).toISOString()
  const T = (name) => ALERT_TYPES.find((a) => a.type === name)

  let alertId = 1
  let caseId = 1
  let entryId = 1
  const alerts = []
  const cases = []
  const timeline = []

  const addEntry = (c, type, content, opts = {}) => {
    timeline.push({
      id: entryId++,
      tenantId: c.tenantId,
      caseId: c.id,
      type,
      content,
      authorUserId: opts.authorUserId ?? null,
      authorName: opts.authorName ?? 'Systeem',
      isInternal: opts.isInternal ?? true,
      direction: opts.direction ?? null,
      createdAt: iso(opts.at),
    })
  }

  // ---- Historie voor de dashboards (laatste 90 dagen) ----
  for (let i = 0; i < 40; i++) {
    const type = ALERT_TYPES[Math.floor(r() * ALERT_TYPES.length)]
    const tenantId = 1 + Math.floor(r() * 3)
    const created = now - (2 + r() * 28) * DAY
    const isFp = r() < type.fpRate
    const a = buildAlert(alertId++, tenantId, type, created, r)
    if (isFp) {
      a.status = 'FalsePositive'
      a.closedAt = iso(created + (3 + r() * 20) * MIN)
      a.closedByUserId = [1, 2, 9][Math.floor(r() * 3)]
    } else {
      a.status = 'Promoted'
      const handlingHours = 2 + r() * 40
      const firstResponseMin = 8 + r() * 70
      const c = {
        id: caseId++,
        tenantId,
        title: a.alertType,
        description: a.message,
        status: 'Gesloten',
        incidentType: type.incidentType,
        classification: type.incidentType === 'phishing' ? 'Phishing' : type.incidentType === 'malware' ? 'Malware' : 'Ongeautoriseerde toegang',
        impact: ['Laag', 'Middel', 'Hoog'][Math.floor(r() * 3)],
        triage: 'Afgehandeld volgens playbook.',
        isFalsePositive: false,
        createdAt: iso(created),
        slaStartAt: iso(created),
        slaDeadlineAt: iso(created + 60 * MIN),
        firstResponseAt: iso(created + firstResponseMin * MIN),
        slaMet: firstResponseMin <= 60,
        closedAt: iso(created + handlingHours * 60 * MIN),
        assignedToUserId: [1, 2, 9][Math.floor(r() * 3)],
        playbook: freshPlaybook(type.incidentType),
        files: [],
        historical: true,
      }
      a.caseId = c.id
      cases.push(c)
    }
    alerts.push(a)
  }

  // ---- Lopende cases met verschillende SLA-standen ----
  const live = [
    { tenant: 2, type: 'Ransomware-gedrag gedetecteerd', minAgo: 24, assigned: 1, status: 'DetectieEnAnalyse' },
    { tenant: 3, type: 'Phishing-link aangeklikt', minAgo: 190, assigned: 1, responded: 35, status: 'Containment', classification: 'Phishing', impact: 'Middel' },
    { tenant: 1, type: 'Impossible travel login', minAgo: 420, assigned: 2, responded: 22, status: 'EradicatieEnHerstel', classification: 'Ongeautoriseerde toegang', impact: 'Laag' },
  ]
  const liveCaseIds = []
  for (const l of live) {
    const type = T(l.type)
    const created = at(l.minAgo)
    const a = buildAlert(alertId++, l.tenant, type, created, r, { status: 'Promoted' })
    const c = {
      id: caseId++,
      tenantId: l.tenant,
      title: type.type,
      description: `${a.message}. Gedetecteerd door ${type.source} (${type.className}).`,
      status: l.status || 'DetectieEnAnalyse',
      incidentType: type.incidentType,
      classification: l.classification || '',
      impact: l.impact || '',
      triage: l.responded ? 'Bevestigd als echt incident na controle van de logs.' : '',
      isFalsePositive: false,
      createdAt: iso(created + 2 * MIN),
      slaStartAt: iso(created),
      slaDeadlineAt: iso(created + 60 * MIN),
      firstResponseAt: l.responded ? iso(created + l.responded * MIN) : null,
      slaMet: l.responded ? l.responded <= 60 : null,
      closedAt: null,
      assignedToUserId: l.assigned,
      playbook: freshPlaybook(type.incidentType),
      files: [],
    }
    a.caseId = c.id
    alerts.push(a)
    cases.push(c)
    liveCaseIds.push(c.id)
    addEntry(c, 'AlertLinked', `Case aangemaakt vanuit alert #${a.id}.`, { at: created + 2 * MIN })
    if (l.assigned) {
      const u = USERS.find((x) => x.id === l.assigned)
      addEntry(c, 'AssigneeChange', `Case opgepakt door ${u.name}.`, { at: created + 4 * MIN, authorUserId: u.id, authorName: u.name })
    }
    if (l.responded) {
      const u = USERS.find((x) => x.id === l.assigned)
      c.playbook.steps.slice(0, 3).forEach((s, i) => {
        s.status = 'done'
        s.by = u.name
        s.at = iso(created + (6 + i * 5) * MIN)
      })
      addEntry(c, 'Note', 'Logs van de afgelopen 24 uur opgevraagd. Geen laterale beweging gezien.', { at: created + 12 * MIN, authorUserId: u.id, authorName: u.name })
      addEntry(c, 'Message', 'Goedemiddag, wij onderzoeken een melding op uw omgeving en houden u via dit portaal op de hoogte.', {
        at: created + l.responded * MIN, authorUserId: u.id, authorName: u.name, isInternal: false, direction: 'toClient',
      })
      const client = USERS.find((x) => x.role === 'Client' && x.tenantId === l.tenant)
      addEntry(c, 'Message', 'Dank voor het bericht. Moeten wij intern al iets doen?', {
        at: created + (l.responded + 9) * MIN, authorUserId: client.id, authorName: client.name, isInternal: false, direction: 'fromClient',
      })
      addEntry(c, 'StatusChange', 'Status gewijzigd naar Containment.', { at: created + (l.responded + 15) * MIN, authorUserId: u.id, authorName: u.name, isInternal: false })
      if (l.status === 'EradicatieEnHerstel') {
        addEntry(c, 'StatusChange', 'Status gewijzigd naar Eradicatie en herstel.', { at: created + 300 * MIN, authorUserId: u.id, authorName: u.name, isInternal: false })
      }
    }
  }

  // Een recent gesloten case met eindrapport voor het klantportaal
  {
    const type = T('Verdacht PowerShell-script')
    const created = now - 3 * DAY
    const a = buildAlert(alertId++, 1, type, created, r, { status: 'Promoted' })
    const c = {
      id: caseId++, tenantId: 1, title: 'Verdacht PowerShell-script op WS-0142', description: a.message,
      status: 'Gesloten', incidentType: 'malware', classification: 'Malware', impact: 'Middel',
      triage: 'Script herleid naar een verouderde beheertool. Endpoint opnieuw geïnstalleerd.',
      isFalsePositive: false, createdAt: iso(created), slaStartAt: iso(created), slaDeadlineAt: iso(created + 60 * MIN),
      firstResponseAt: iso(created + 18 * MIN), slaMet: true, closedAt: iso(created + 30 * 60 * MIN), assignedToUserId: 1,
      playbook: freshPlaybook('malware'),
      files: [{ id: 1, name: 'Eindrapport-incident-WS-0142.pdf', size: 184_320, isFinalReport: true, uploadedAt: iso(created + 29 * 60 * MIN), uploadedBy: 'Anna Analist' }],
    }
    c.playbook.steps.forEach((s) => { s.status = 'done'; s.by = 'Anna Analist'; s.at = iso(created + 60 * MIN) })
    a.caseId = c.id
    alerts.push(a)
    cases.push(c)
    for (const [i, st] of ['Containment', 'Eradicatie en herstel', 'Post-incident', 'Gesloten'].entries()) {
      addEntry(c, 'StatusChange', `Status gewijzigd naar ${st}.`, { at: created + (60 + i * 400) * MIN, authorUserId: 1, authorName: 'Anna Analist', isInternal: false })
    }
    addEntry(c, 'Message', 'Het eindrapport staat klaar in het portaal.', { at: created + 29 * 60 * MIN, authorUserId: 1, authorName: 'Anna Analist', isInternal: false, direction: 'toClient' })
  }

  // ---- Open alerts in de wachtrij ----
  const open = [
    [3, 'Ransomware-gedrag gedetecteerd', 2],
    [2, 'Phishing-link aangeklikt', 11],
    [1, 'Brute-force op VPN', 3],
    [3, 'Port scan van extern adres', 18],
  ]
  for (const [tenant, name, minAgo] of open) alerts.push(buildAlert(alertId++, tenant, T(name), at(minAgo), r))

  // ---- Overdrachtsrapporten ----
  const cur = currentShift(new Date(now))
  const prev = previousShift(new Date(now))
  const prevPrev = previousShift(new Date(prev.startsAt))
  const handoverReports = [
    {
      id: 1, shift: prevPrev.name, startsAt: prevPrev.startsAt, endsAt: prevPrev.endsAt,
      items: [
        { id: 1, category: 'RecurringFalsePositive', text: 'Back-upjob van Zorggroep Demo triggert elke nacht om 02:00 de regel "Massaal bestanden gewijzigd". Kan gesloten worden.', author: 'Bram Bakker', createdAt: iso(new Date(prevPrev.startsAt).getTime() + 3 * 60 * MIN), clientId: 2, linkedCaseIds: [] },
      ],
    },
    {
      id: 2, shift: prev.name, startsAt: prev.startsAt, endsAt: prev.endsAt,
      items: [
        { id: 2, category: 'Pentest', text: 'Noordkade Transport laat tot vrijdag een pentest uitvoeren vanaf 194.26.29.113. Scans van dat adres zijn verwacht.', author: 'Lotte Visser', createdAt: iso(new Date(prev.startsAt).getTime() + 60 * MIN), clientId: 3, linkedCaseIds: [] },
        { id: 3, category: 'NewActor', text: 'Nieuwe phishingcampagne met nep-DocuSign-links (docusign-secure.click). Twee klanten geraakt.', author: 'Lotte Visser', createdAt: iso(new Date(prev.startsAt).getTime() + 3 * 60 * MIN), clientId: null, linkedCaseIds: [liveCaseIds[1]] },
      ],
    },
    { id: 3, shift: cur.name, startsAt: cur.startsAt, endsAt: cur.endsAt, items: [] },
  ]

  const notificationPrefs = {}
  for (const t of TENANTS) {
    notificationPrefs[t.id] = {
      StatusChange: { portal: true, email: false, webhook: false },
      Message: { portal: true, email: true, webhook: false },
      FinalReport: { portal: true, email: true, webhook: false },
      webhookUrl: '',
    }
  }

  return {
    version: 4,
    seededAt: iso(now),
    tenants: TENANTS,
    users: USERS,
    alerts,
    cases,
    timeline,
    handoverReports,
    notificationPrefs,
    counters: { alert: alertId, case: caseId, entry: entryId, user: 100, file: 10, handoverItem: 10, handoverReport: 10 },
  }
}
