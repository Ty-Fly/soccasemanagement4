using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Services.Ingest;

namespace backend.Data.Seed;

/// <summary>
/// Vult een LEGE development-database met een beetje fictieve testdata.
/// Draait alleen in Development (zie Program.cs).
///
/// Testaccounts (token ophalen via POST /api/dev/token met alleen het e-mailadres):
///   analist@soc.local, engineer@soc.local, manager@soc.local, accountmanager@soc.local,
///   klant-a@klant.local (Klant A), klant-b@klant.local (Klant B)
///
/// Testdata nodig voor je eigen story? Voeg die onderaan toe, in een eigen blok met // US-xx.
/// </summary>
public static class DevDataSeeder
{
    public static async Task SeedAsync(SocDbContext db, CancellationToken ct = default)
    {
        if (await db.Tenants.AnyAsync(ct))
            return;

        var now = DateTime.UtcNow;

        // --- Klanten (fictief) ---
        var klantA = new Tenant { Name = "Klant A - Gemeente Voorbeeldstad" };
        var klantB = new Tenant { Name = "Klant B - Zorggroep Demo" };
        db.Tenants.AddRange(klantA, klantB);
        await db.SaveChangesAsync(ct);

        // --- Gebruikers per rol ---
        // PasswordHash is een placeholder: echte login en hashing zijn US-02 (Kuray).
        // Medewerkers hebben (nog) TenantId 0: hoe medewerkers en klanten gescheiden
        // worden is uitwerking van US-01 (Kuray).
        User NewUser(string name, string email, User.UserRole role, int tenantId = 0) => new()
        {
            Name = name,
            Email = email,
            Role = role,
            TenantId = tenantId,
            PasswordHash = "DEV-SEED-GEEN-WACHTWOORD"
        };

        db.Users.AddRange(
            NewUser("Anna Analist", "analist@soc.local", User.UserRole.Analyst),
            NewUser("Erik Engineer", "engineer@soc.local", User.UserRole.SecurityEngineer),
            NewUser("Maria Manager", "manager@soc.local", User.UserRole.Manager),
            NewUser("Arjen Accountmanager", "accountmanager@soc.local", User.UserRole.AccountManager),
            NewUser("Klant A Viewer", "klant-a@klant.local", User.UserRole.Client, klantA.Id),
            NewUser("Klant B Viewer", "klant-b@klant.local", User.UserRole.Client, klantB.Id));

        // --- Open alerts ---
        db.Alerts.AddRange(
            new Alert { TenantId = klantA.Id, Message = "Verdachte inlogpogingen op VPN-gateway", CreatedAt = now.AddMinutes(-5) },
            new Alert { TenantId = klantA.Id, Message = "Phishing-link aangeklikt door medewerker", CreatedAt = now.AddMinutes(-12) },
            new Alert { TenantId = klantA.Id, Message = "Onbekend PowerShell-script uitgevoerd", CreatedAt = now.AddMinutes(-30) },
            new Alert { TenantId = klantB.Id, Message = "Meerdere mislukte logins op beheeraccount", CreatedAt = now.AddMinutes(-8) },
            new Alert { TenantId = klantB.Id, Message = "Port scan vanaf extern adres", CreatedAt = now.AddMinutes(-45) });

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
