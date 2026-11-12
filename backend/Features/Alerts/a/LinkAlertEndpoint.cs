using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Alerts;

public static class LinkAlertEndpoint
{
    public sealed record LinkRequest(int CaseId);

    public static void MapLinkAlertEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api").RequireAuthorization("EmployeeOnly");

        // AC 1: Alleen open cases van dezelfde klant ophalen
        group.MapGet("/alerts/{id:int}/matching-cases", async (int id, SocDbContext db) =>
        {
            var alert = await db.Alerts.FindAsync(id);
            if (alert is null) return Results.NotFound();

            var cases = await db.Cases
                .Where(c => c.TenantId == alert.TenantId && c.ClosedAt == null && c.Status != "Gesloten")
                .Select(c => new { c.Id, c.Title, c.Status, c.SlaDeadlineAt })
                .ToListAsync();

            return Results.Ok(cases);
        }).WithTags("Alerts");

        // AC 2: Alert koppelen aan bestaande case van dezelfde klant
        group.MapPost("/alerts/{id:int}/link", async (int id, LinkRequest req, SocDbContext db, IHubContext<SocHub> hub) =>
        {
            var alert = await db.Alerts.FindAsync(id);
            var targetCase = await db.Cases.FindAsync(req.CaseId);

            if (alert is null || targetCase is null) return Results.NotFound();
            if (alert.Status != Alert.AlertStatus.Open) return Results.Conflict("Alert is niet meer open.");
            if (alert.TenantId != targetCase.TenantId) return Results.BadRequest("Andere klant is niet toegestaan.");
            if (targetCase.ClosedAt is not null || targetCase.Status == "Gesloten") return Results.Conflict("Case is al gesloten.");

            alert.CaseId = targetCase.Id;
            alert.Status = Alert.AlertStatus.Linked;
            await db.SaveChangesAsync();

            await hub.Clients.Group(SocHub.EmployeesGroup)
                .SendAsync("AlertLinked", new { alertId = alert.Id, caseId = targetCase.Id });

            return Results.Ok(new { alert.Id, alert.CaseId, Status = alert.Status.ToString() });
        }).WithTags("Alerts");

        // AC 3: Case sluiten als false positive -> alle gekoppelde alerts krijgen die status ook
        group.MapPatch("/cases/{id:int}/close-false-positive", async (int id, SocDbContext db, IHubContext<SocHub> hub) =>
        {
            var targetCase = await db.Cases.Include(c => c.Alerts).FirstOrDefaultAsync(c => c.Id == id);
            if (targetCase is null) return Results.NotFound();
            if (targetCase.ClosedAt is not null) return Results.Conflict("Case is al gesloten.");

            var now = DateTime.UtcNow;
            targetCase.Status = "Gesloten";
            targetCase.IsFalsePositive = true;
            targetCase.ClosedAt = now;

            foreach (var alert in targetCase.Alerts)
            {
                alert.Status = Alert.AlertStatus.FalsePositive;
                alert.ClosedAt = now;
            }

            await db.SaveChangesAsync();

            await hub.Clients.Group(SocHub.EmployeesGroup)
                .SendAsync("CaseClosed", new { caseId = targetCase.Id, isFalsePositive = true });

            return Results.Ok(new { targetCase.Id, UpdatedAlerts = targetCase.Alerts.Count });
        }).WithTags("Cases");
    }
}