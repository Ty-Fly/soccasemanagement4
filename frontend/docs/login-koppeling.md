# Login (branch `kuray/auth`) – bevindingen bij het koppelen van de frontend

De frontend roept `POST /api/register`, `POST /api/register/verify` en `POST /api/login` aan met precies de
vormen uit Kuray's DTO's. Getest tegen een nagebootste API met dezelfde vormen en statuscodes: register → QR →
verify → login → token uitlezen werkt. De .NET-backend zelf kon in deze omgeving niet draaien (geen SQL Server,
geen toegang tot NuGet), dus onderstaande punten komen uit het lezen van de code.

## Wat goed werkt
- Wachtwoord + TOTP-code zijn allebei verplicht; codes kunnen niet opnieuw worden gebruikt (counter-check).
- TOTP-secret wordt versleuteld opgeslagen (Data Protection); wachtwoorden met BCrypt.
- Rate limiting op de auth-endpoints (10 per minuut per IP).

## Moet opgelost worden vóór merge naar Dev

> Update 26 nov: punten 1 t/m 4 zijn opgelost in `frontend-demo` (zie `INTEGRATIE.md` in de root). Alleen de migratie moet nog lokaal worden gegenereerd.
1. **Branch is gebaseerd op een oude versie.** `kuray/auth` verwijdert t.o.v. Dev o.a. `DevDataSeeder`,
   `DevTokenEndpoint`, `AssignCaseEndpoint`, `TimelineService`/`TimelineEntry` en alle migraties. Zo mergen
   gooit werk van Filip en anderen weg. Eerst rebasen op `Dev`.
2. **Claimnamen sluiten niet aan.** `JwtTokenGenerator` zet `user_id`, `tenant_id`, `email`, `role`.
   De endpoints op Dev lezen de gebruiker uit `sub` (`CloseAlertEndpoint`, `AssignCaseEndpoint`) en de naam uit
   `name` (Emma's handover-items). Met een token van de echte login geeft `PATCH /api/cases/{id}/claim` daardoor
   401. Voorstel: in `GenerateToken` ook `sub` en `name` toevoegen (zoals `DevTokenEndpoint` doet).
3. **SignalR-token via querystring ontbreekt.** Dev leest `?access_token=` voor `/hubs`; in Kuray's
   `Program.cs` is dat weggevallen. Zonder dit werkt realtime niet met de echte login.
4. **Testgebruikers.** Er is geen seeder meer en geen endpoint om accounts aan te maken. Voor de demo: in de
   seeder gebruikers aanmaken met `PasswordHash = BCrypt.Net.BCrypt.HashPassword("…")` en
   `TwoFactorEnabled = false`. Daarna stelt iedereen 2FA in via de frontend (`/setup-2fa`).

## Goed om te weten
- In Development wordt zonder `JwtSettings:SigningKey` bij iedere start een nieuwe sleutel gemaakt. Na een
  herstart van de API zijn tokens ongeldig; de frontend stuurt de gebruiker dan terug naar het inlogscherm.
- Data Protection-sleutels moeten bewaard blijven, anders zijn de opgeslagen TOTP-secrets na een herstart
  onleesbaar (staat ook in Kuray's README).
- E-mail wordt in hoofdletters vergeleken (`NormalizeEmail`). Dat werkt doordat SQL Server standaard
  hoofdletterongevoelig vergelijkt; bij een andere collation moeten e-mails in hoofdletters worden opgeslagen.
- US-02 AC 3 (account 15 minuten blokkeren na 5 mislukte pogingen) is nog niet gebouwd; nu is er alleen rate limiting per IP.
- Na het instellen van 2FA moet de gebruiker wachten op een **nieuwe** code voordat inloggen lukt (de code van
  de verificatie is al verbruikt). De frontend zegt dat erbij.
- Er is geen CORS-configuratie. Voor development lost de Vite-proxy dat op; in productie serveert de backend
  de frontend (zie deploymentstrategie), dus dan is het dezelfde origin.
