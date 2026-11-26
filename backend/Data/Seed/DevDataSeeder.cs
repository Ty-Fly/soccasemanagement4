
using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Services.Ingest;

namespace backend.Data.Seed;

public static class DevDataSeeder
{
    // US-02: alle testaccounts krijgen in Development hetzelfde wachtwoord, zodat de echte
    // login (wachtwoord + 2FA) te testen is. 2FA stelt iedere gebruiker zelf in via /api/register.
    public const string DevPassword = "Demo123!";
    private const string OldPlaceholderHash = "DEV-SEED-GEEN-WACHTWOORD";

    public static async Task SeedAsync(
        SocDbContext db,
        CancellationToken ct = default)
    {
        // Klanten ophalen of aanmaken
        var klantA = await db.Tenants.FirstOrDefaultAsync(
            t => t.Name == "Klant A - Gemeente Voorbeeldstad", ct);

        if (klantA == null)
        {
            klantA = new Tenant
            {
                Name = "Klant A - Gemeente Voorbeeldstad"
            };

            db.Tenants.Add(klantA);
            await db.SaveChangesAsync(ct);
        }

        var klantB = await db.Tenants.FirstOrDefaultAsync(
            t => t.Name == "Klant B - Zorggroep Demo", ct);

        if (klantB == null)
        {
            klantB = new Tenant
            {
                Name = "Klant B - Zorggroep Demo"
            };

            db.Tenants.Add(klantB);
            await db.SaveChangesAsync(ct);
        }

        var klantC = await db.Tenants.FirstOrDefaultAsync(
            t => t.Name == "Klant C - Testorganisatie", ct);

        if (klantC == null)
        {
            klantC = new Tenant
            {
                Name = "Klant C - Testorganisatie"
            };

            db.Tenants.Add(klantC);
            await db.SaveChangesAsync(ct);
        }

        // Testgebruikers aanmaken als ze nog niet bestaan
        await AddUserIfMissing(
            db, "Anna Analist", "analist@soc.local",
            User.UserRole.Analyst, 0, ct);

        await AddUserIfMissing(
            db, "Erik Engineer", "engineer@soc.local",
            User.UserRole.SecurityEngineer, 0, ct);

        await AddUserIfMissing(
            db, "Maria Manager", "manager@soc.local",
            User.UserRole.Manager, 0, ct);

        await AddUserIfMissing(
            db, "Arjen Accountmanager", "accountmanager@soc.local",
            User.UserRole.AccountManager, 0, ct);

        await AddUserIfMissing(
            db, "Klant A Viewer", "klant-a@klant.local",
            User.UserRole.Client, klantA.Id, ct);

        await AddUserIfMissing(
            db, "Klant B Viewer", "klant-b@klant.local",
            User.UserRole.Client, klantB.Id, ct);

        await AddUserIfMissing(
            db, "Klant C Viewer", "klant-c@klant.local",
            User.UserRole.Client, klantC.Id, ct);

        // Testalerts aanmaken als ze nog niet bestaan
        var now = DateTime.UtcNow;

        await AddAlertIfMissing(
            db, klantA.Id,
            "Verdachte inlogpogingen op VPN-gateway",
            now.AddMinutes(-5), ct);

        await AddAlertIfMissing(
            db, klantA.Id,
            "Phishing-link aangeklikt door medewerker",
            now.AddMinutes(-12), ct);

        await AddAlertIfMissing(
            db, klantA.Id,
            "Onbekend PowerShell-script uitgevoerd",
            now.AddMinutes(-30), ct);

        await AddAlertIfMissing(
            db, klantB.Id,
            "Meerdere mislukte logins op beheeraccount",
            now.AddMinutes(-8), ct);

        await AddAlertIfMissing(
            db, klantB.Id,
            "Port scan vanaf extern adres",
            now.AddMinutes(-45), ct);

        await AddAlertIfMissing(
            db, klantC.Id,
            "Verdachte netwerkverbinding",
            now.AddMinutes(-10), ct);
    }

    private static async Task AddUserIfMissing(
        SocDbContext db,
        string name,
        string email,
        User.UserRole role,
        int tenantId,
        CancellationToken ct)
    {
        var existingUser = await db.Users.FirstOrDefaultAsync(
            u => u.Email == email, ct);

        if (existingUser != null)
        {
            // Bestaande dev-databases hebben nog de oude placeholder: vervang die door een echte hash
            if (existingUser.PasswordHash == OldPlaceholderHash)
            {
                existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(DevPassword);
                await db.SaveChangesAsync(ct);
            }

            return;
        }

        var user = new User
        {
            Name = name,
            Email = email,
            Role = role,
            TenantId = tenantId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(DevPassword)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
    }

    private static async Task AddAlertIfMissing(
        SocDbContext db,
        int tenantId,
        string message,
        DateTime createdAt,
        CancellationToken ct)
    {
        var existingAlert = await db.Alerts.FirstOrDefaultAsync(
            a => a.TenantId == tenantId && a.Message == message, ct);

        if (existingAlert != null)
        {
            return;
        }

        var alert = new Alert
        {
            TenantId = tenantId,
            Message = message,
            CreatedAt = createdAt
        };

        db.Alerts.Add(alert);
        await db.SaveChangesAsync(ct);
    }

    // US-xx: API-keys voor de ingest API. ALLEEN DEVELOPMENT.
    // Eigen controle (los van SeedAsync), zodat het ook werkt op databases die al gevuld zijn.
    // Gebruik in de header:  X-Api-Key: dev-ingest-klant-a   (of dev-ingest-klant-b)
    public static async Task SeedIngestKeysAsync(SocDbContext db, CancellationToken ct = default)
    {
        if (await db.IngestApiKeys.AnyAsync(ct))
            return;

        var tenants = await db.Tenants.OrderBy(t => t.Id).Take(2).ToListAsync(ct);
        if (tenants.Count < 2)
            return;

        db.IngestApiKeys.AddRange(
            NewKey(tenants[0].Id, "Simulator Klant A", "dev-ingest-klant-a"),
            NewKey(tenants[1].Id, "Simulator Klant B", "dev-ingest-klant-b"));

        await db.SaveChangesAsync(ct);

        static IngestApiKey NewKey(int tenantId, string name, string key) => new()
        {
            TenantId = tenantId,
            Name = name,
            KeyHash = ApiKeyHasher.Hash(key),
            CreatedAt = DateTime.UtcNow
        };
    }
}
