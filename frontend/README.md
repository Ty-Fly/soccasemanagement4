# SOC Casemanagement – frontend

React (Vite) single page application voor het SOC-casemanagementplatform.
Voortgebouwd op de basisopzet van Thomas (branch `Thomas`).

## Starten

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Zonder backend werkt alles met demodata. Log in met een van de demo-accounts op het inlogscherm.

**Tip voor de demo:** open twee browservensters. Log in het ene in als SOC-analist en in het andere als
klantviewer (Jeroen de Wit, Gemeente Voorbeeldstad). Berichten, statuswijzigingen en nieuwe alerts verschijnen
dan binnen een paar seconden in het andere venster, zonder te verversen. In de zijbalk staan knoppen om een
alert te simuleren en om de demodata terug te zetten (doe dat vlak voor de demo, zodat de SLA-timers weer
verschillende kleuren hebben).

## Koppeling met de backend

De Vite-dev-server stuurt `/api` en `/hubs` door naar de backend (`vite.config.js`). Daardoor is er voor
development geen CORS-configuratie nodig. Kopieer `.env.example` naar `.env.local` om het adres of de modus aan te passen.

| Instelling | Betekenis |
|---|---|
| `VITE_BACKEND_URL` | Adres van de .NET-API, standaard `https://localhost:7181` |
| `VITE_API_MODE=mock` | Alle schermen gebruiken demodata (standaard) |
| `VITE_API_MODE=live` | Functies waarvoor al een endpoint bestaat, roepen de backend aan |

Het **inlogformulier** roept altijd de echte backend aan (Kuray, branch `kuray/auth`):
`POST /api/login`, `POST /api/register` en `POST /api/register/verify` (QR-code voor 2FA via `/setup-2fa`).
Is de backend niet bereikbaar, dan meldt het scherm dat en kun je een demo-account gebruiken.

### Welke functie gebruikt welk endpoint

Alle API-aanroepen staan in `src/api/`. Iedere functie heeft een `isLive`-tak voor het echte endpoint en een
mock-tak. Vervangen = de mock-tak weghalen zodra het endpoint klaar is.

| Functie (`src/api/…`) | Endpoint | Branch / story | Status |
|---|---|---|---|
| `auth.login` | `POST /api/login` | kuray/auth, US-02 | live |
| `auth.startTwoFactorSetup` / `confirmTwoFactorSetup` | `POST /api/register(/verify)` | kuray/auth, US-02 | live |
| `alerts.listAlerts` | `GET /api/alerts?status=Open` | Cheryl, US-05/06 | live-tak |
| `alerts.closeAlert` | `PATCH /api/alerts/{id}/close` | Dev, US-07 | live-tak |
| `alerts.promoteAlert` | `POST /api/alerts/{id}/promote` | Dev, US-08 | live-tak |
| `alerts.matchingCases` / `linkAlert` | `GET …/matching-cases`, `POST …/link` | Dev, US-09 | live-tak |
| `alerts.createNationalIncident` | `POST /api/cases/national-incident` | nuseema2, US-10 | live-tak |
| `cases.claimCase` / `assignCase` | `PATCH /api/cases/{id}/claim`, `/assign` | Dev, US-11 | live-tak |
| `cases.closeCaseAsFalsePositive` | `PATCH /api/cases/{id}/close-false-positive` | Dev, US-09 | live-tak |
| `cases.listCases` / `getCase` / `getTimeline` | nog geen GET-endpoints | US-11 t/m 18 | mock |
| `cases.changeStatus` / `updateCaseDetails` | nog niet | US-17 | mock |
| `cases.addNote` / `sendMessage` | nog niet | US-18, 26, 27 | mock |
| `cases.completeStep` / `skipStep` | nog niet | US-19, 20 | mock |
| `cases.uploadFile` / `setFinalReport` / `downloadFile` | nog niet | US-21, 29 | mock |
| `handover.*` | `GET /api/handover-reports/active-shift`, `POST …/{id}/items` | Emma, US-22/23 | mock (vorm wijkt nog af) |
| `stats.engineerStats` / `managerStats` | nog niet | US-30, 31 | mock |
| `users.*` (accountbeheer, meldingen) | nog niet | US-04, 28 | mock |

Realtime: `src/api/realtime.js` gebruikt dezelfde eventnamen als `backend/Hubs/SocHubEvents.cs`
(`AlertReceived`, `AlertClosed`, `AlertPromoted`, `CaseCreated`, …). In mock-modus loopt dit via een
BroadcastChannel tussen tabs; later vervangen door `@microsoft/signalr` op `/hubs/soc`.

## Schermen per rol

| Rol | Schermen |
|---|---|
| SOC-analist | Alerts, Cases, Case-detail, Overdracht |
| Security engineer | + Detectieregels (US-30) |
| Manager | + Management (US-31), Accounts (US-04) |
| Accountmanager | Cases (lezen en klantcontact), Overdracht |
| Klantviewer | Klantportaal: mijn incidenten, voortgang, berichten, eindrapport, meldingen |

Menu-items zonder recht worden niet getoond (US-03 AC 3). De echte afscherming (403/404) blijft de taak van de backend.

## Structuur

```
src/
  api/          API-functies (live + mock), realtime, demo-store (api/mock)
  auth/         sessie (per tab) en AuthContext
  components/   AppShell (zijbalk met SLA-timer), Toasts, kleine UI-onderdelen
  lib/          SLA-regels, datums, shifts, hooks
  pages/        schermen; pages/portal = klantportaal
```
