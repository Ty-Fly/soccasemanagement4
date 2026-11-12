using Microsoft.EntityFrameworkCore;
using backend.Models;

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
}
