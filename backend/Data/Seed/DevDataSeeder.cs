
using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data.Seed;

public static class DevDataSeeder
{
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
            return;
        }

        var user = new User
        {
            Name = name,
            Email = email,
            Role = role,
            TenantId = tenantId,
            PasswordHash = "DEV-SEED-GEEN-WACHTWOORD"
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
}
