# Integratie in `frontend-demo`

Deze branch bevat de frontend-demo plus alle backend-features die klaar stonden. Het is bedoeld als één
pull request naar `Dev`, zodat iedereen vanaf daar verder kan met zijn eigen feature.

## Wat zit erin

| Bron | Wat | Hoe |
|---|---|---|
| `Dev` (incl. PR #107) | US-07, 08, 09, 11, dev-token, seeder | gemerged |
| `Cheryl` | US-05 ingest-API met API-sleutels, US-06 `GET /api/alerts`, CORS | gemerged, conflict in `Program.cs` opgelost |
| `Emma` (PR #106) | US-22 overdrachtsitems en actieve shift | gemerged, conflict in `Program.cs` opgelost |
| `nuseema2` | US-10 landelijk incident, uitgebreidere seeder | gemerged, conflict in `Program.cs` opgelost |
| `kuray/auth` (PR #108) | US-02 register, verify en login met TOTP | **alleen de auth-bestanden** overgenomen: een merge zou de seeder, alle migraties en endpoints van anderen verwijderen |
| `Thomas` + demo | React-frontend met alle schermen, draait standaard op demodata | basis van deze branch |

### Aanpassingen om alles samen te laten werken
- **Login-token** (`Services/Authentication/JwtTokenGenerator.cs`): dezelfde claims als `/api/dev/token`
  (`sub`, `name`, `role`, `tenant_id`). Met de oorspronkelijke claim `user_id` gaven claim, assign en
  handover 401 na een echte login.
- **`Program.cs`**: rate limiting (10 per minuut per IP), Data Protection, validatie en de drie
  auth-endpoints toegevoegd aan de bestaande JWT-configuratie van Dev. Die blijft leidend
  (`MapInboundClaims = false`, token via `?access_token=` voor SignalR).
- **`User.Email`**: maximaal 254 tekens en een unieke index. SQL Server kan geen index op `nvarchar(max)` maken.
- **Seeder**: alle testaccounts krijgen wachtwoord `Demo123!`. Bestaande placeholders worden bijgewerkt.
- **`HandoverItem.HandoverReport`** krijgt `[JsonIgnore]`. Anders geeft `GET /api/handover-reports/active-shift`
  een fout door een cyclus (rapport → items → rapport).

## Eerste stap na het mergen: migratie aanmaken

Het datamodel is veranderd (2FA-kolommen en unieke e-mail op `Users`, Emma's `HandoverItems`).
Emma's migratie `AddHandoverItem` is leeg, en de snapshot mist dat model. Deze migratie kon niet in de branch,
omdat de omgeving waarin is geïntegreerd geen NuGet-toegang heeft. Eén persoon doet dit, en commit het resultaat:

```bash
cd backend
dotnet ef migrations add IntegratieDemo
dotnet build
dotnet run --launch-profile https
```

Zonder deze migratie start de API wel, maar logt hij "Database bijwerken/seeden mislukt" en werken login
en overdracht niet.

## Wat is getest

| Test | Resultaat |
|---|---|
| Backend compileren met de C#-compiler uit de .NET 10 SDK, tegen de echte ASP.NET-referenties en stubs voor EF Core, BCrypt, Otp.NET en IdentityModel | geen fouten |
| Routes, policies en anonieme toegang tot de login-endpoints | geen dubbele routes, alle policies bestaan |
| Wat er verwijderd is | alleen wijzigingen uit de branches van de teamleden zelf |
| Frontend: lint en build | schoon |
| Demoproces in de browser: analist → manager → accountmanager → klant, plus de verborgen demobediening | werkt |
| Mergen naar `Dev` | geen conflicten |

**Niet getest:** een echte `dotnet build` en een run tegen SQL Server. Doe dat lokaal na de migratie.

## Frontend

De frontend draait standaard op demodata en werkt zonder backend. Met `VITE_API_MODE=live` in
`frontend/.env.local` roepen login, alerts en case-acties de echte endpoints aan; zie `frontend/README.md`.

## Daarna
- PR #106 (`Emma`) en PR #108 (`kuray/auth`) kunnen dicht: die code zit hierin.
- Werk verder vanaf `Dev` in je eigen feature-branch.
- Kuray: `Migrations/` staat in jouw `.gitignore`. Dat is hier niet overgenomen, omdat het team migraties via git deelt.
