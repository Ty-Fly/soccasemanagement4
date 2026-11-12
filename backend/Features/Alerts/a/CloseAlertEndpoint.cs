using System.Security.Claims;
using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Alerts;

public static class CloseAlertEndpoint
{
    public sealed record CloseAlertResponse(
        int Id,
        int TenantId,
        string Status,
        DateTime ClosedAt,
        int? ClosedByUserId
    );

    public static IEndpointRouteBuilder MapCloseAlertEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPatch("/api/alerts/{id:int}/close", HandleAsync)
            .RequireAuthorization("EmployeeOnly")
            .WithName("CloseAlertAsFalsePositive")
            .WithTags("Alerts")
            .WithSummary("Sluit een open alert als false positive (US-07)")
            .WithDescription("Markeert een open alert als FalsePositive, legt de afsluiter en het UTC-tijdstip vast, en stuurt een SignalR-update naar alle analisten.")
            .Produces<CloseAlertResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }

    private static async Task<Results<Ok<CloseAlertResponse>, NotFound, Conflict<string>>> HandleAsync(
        int id,
        SocDbContext db,
        ClaimsPrincipal user,
        IHubContext<SocHub> hubContext,
        CancellationToken cancellationToken)
    {
        var alert = await db.Alerts.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (alert is null)
        {
            return TypedResults.NotFound();
        }

        // DoD US-07: een al gesloten alert kan niet nog een keer gesloten worden
        if (alert.Status != Alert.AlertStatus.Open)
        {
            return TypedResults.Conflict($"Alert {id} heeft al status '{alert.Status}' en kan niet opnieuw als false positive worden gesloten.");
        }

        // Haal de UserId uit de token-claims (indien aanwezig)
        int? userId = null;
        var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        if (int.TryParse(userIdClaim, out var parsedUserId) && parsedUserId > 0)
        {
            userId = parsedUserId;
        }

        // DoD: tijden in UTC opslaan, record bewaren (geen hard delete) voor US-30
        alert.Status = Alert.AlertStatus.FalsePositive;
        alert.ClosedAt = DateTime.UtcNow;
        alert.ClosedByUserId = userId;

        await db.SaveChangesAsync(cancellationToken);

        // DoD US-07 & NFR-03: verwijder de alert realtime (< 5 sec) bij alle analisten uit de open lijst
        await hubContext.Clients
            .Group(SocHub.EmployeesGroup)
            .SendAsync("AlertClosed", new { alertId = alert.Id, status = alert.Status.ToString() }, cancellationToken);

        var response = new CloseAlertResponse(
            alert.Id,
            alert.TenantId,
            alert.Status.ToString(),
            alert.ClosedAt.Value,
            alert.ClosedByUserId
        );

        return TypedResults.Ok(response);
    }
}