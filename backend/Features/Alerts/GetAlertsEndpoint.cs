using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Alerts;

public static class GetAlertsEndpoint
{
    public static IEndpointRouteBuilder MapGetAlertsEndpoint(this IEndpointRouteBuilder app)
    {
        // Startlijst voor het dashboard. Daarna houdt SignalR de lijst bij.
        app.MapGet("/api/alerts", async (Alert.AlertStatus? status, SocDbContext db, CancellationToken ct) =>
        {
            var query = db.Alerts.AsNoTracking();

            if (status is not null)
                query = query.Where(a => a.Status == status);

            var alerts = await query
                .OrderBy(a => a.CreatedAt)      // oudste eerst: daar verloopt de SLA het eerst
                .Take(500)                      // nooit onbeperkt veel rijen teruggeven
                .Select(a => new AlertSummary(  // alleen de kolommen die we nodig hebben (geen RawPayload)
                    a.Id, a.TenantId, a.Source, a.Message,
                    a.Severity.ToString(), a.Status.ToString(),
                    a.CreatedAt, a.DetectedAt, a.CaseId))
                .ToListAsync(ct);

            return TypedResults.Ok(alerts);
        })
        .RequireAuthorization("EmployeeOnly")
        .WithName("GetAlerts")
        .WithTags("Alerts")
        .WithSummary("Lijst met alerts, filter optioneel op status (bijv. ?status=Open)");

        return app;
    }
}
