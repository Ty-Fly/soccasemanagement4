using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Alerts;

public static class PromoteAlertEndpoint
{
    public const string InitialNistStatus = "Detectie en analyse";

    public sealed record PromoteAlertResponse(
        int CaseId,
        int AlertId,
        int TenantId,
        string Title,
        string Status,
        DateTime SlaStartAt,
        DateTime SlaDeadlineAt
    );

    public static IEndpointRouteBuilder MapPromoteAlertEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/alerts/{id:int}/promote", HandleAsync)
            .RequireAuthorization("EmployeeOnly")
            .WithName("PromoteAlertToCase")
            .WithTags("Alerts")
            .WithSummary("Promoveert een open alert tot een nieuwe case (US-08)")
            .WithDescription("Maakt in één transactie een nieuwe case aan bij dezelfde klant als de alert met NIST-status 'Detectie en analyse' en een SLA-deadline van ontvangsttijdstip + 60 minuten.")
            .Produces<PromoteAlertResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }

    private static async Task<Results<Created<PromoteAlertResponse>, NotFound, Conflict<string>>> HandleAsync(
        int id,
        SocDbContext db,
        IHubContext<SocHub> hubContext,
        CancellationToken cancellationToken)
    {
        var alert = await db.Alerts.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (alert is null)
        {
            return TypedResults.NotFound();
        }

        if (alert.Status != Alert.AlertStatus.Open)
        {
            return TypedResults.Conflict($"Alert {id} heeft al status '{alert.Status}' en kan niet worden gepromoveerd.");
        }

        // DoD US-08: in één transactie case aanmaken en alert koppelen
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var title = alert.Message.Length > 100
            ? alert.Message[..100] + "..."
            : alert.Message;

        var newCase = new Case
        {
            // DoD US-08: TenantId komt altijd van de alert, nooit uit een request-DTO
            TenantId = alert.TenantId,
            Title = string.IsNullOrWhiteSpace(title) ? $"Incident vanuit alert #{alert.Id}" : title,
            Description = alert.Message,
            // US-08 AC 3: eerste NIST-status
            Status = InitialNistStatus,
            CreatedAt = DateTime.UtcNow,
            // US-08 AC 2: SLA-deadline is ontvangsttijdstip van de alert plus 60 minuten
            SlaStartAt = alert.CreatedAt,
            SlaDeadlineAt = alert.CreatedAt.AddMinutes(60)
        };

        db.Cases.Add(newCase);
        await db.SaveChangesAsync(cancellationToken);

        alert.Status = Alert.AlertStatus.Promoted;
        alert.CaseId = newCase.Id;

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var response = new PromoteAlertResponse(
            newCase.Id,
            alert.Id,
            newCase.TenantId,
            newCase.Title,
            newCase.Status,
            newCase.SlaStartAt,
            newCase.SlaDeadlineAt
        );

        // US-08 AC 3 & NFR-03: realtime (< 5 sec) verwijderen uit open alerts en tonen in case-overzicht
        await hubContext.Clients
            .Group(SocHub.EmployeesGroup)
            .SendAsync("AlertPromoted", new { alertId = alert.Id, caseId = newCase.Id }, cancellationToken);

        await hubContext.Clients
            .Group(SocHub.EmployeesGroup)
            .SendAsync("CaseCreated", response, cancellationToken);

        return TypedResults.Created($"/api/cases/{newCase.Id}", response);
    }
}