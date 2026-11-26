
using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Features.Cases;

public static class CreateNationalIncidentEndpoint
{
    public sealed record CreateNationalIncidentRequest(
        List<int>? AlertIds
    );

    public sealed record CreatedNationalCase(
        int CaseId,
        int TenantId,
        string Title,
        string Status,
        DateTime SlaStartAt,
        DateTime SlaDeadlineAt,
        List<int> AlertIds
    );

    public sealed record CreateNationalIncidentResponse(
        List<CreatedNationalCase> Cases
    );

    public static IEndpointRouteBuilder MapCreateNationalIncidentEndpoint(
        this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/cases/national-incident", HandleAsync)
            .RequireAuthorization("EmployeeOnly")
            .WithName("CreateNationalIncident")
            .WithTags("Cases")
            .WithSummary("Maakt aparte cases aan voor een landelijk incident")
            .WithDescription(
                "Maakt één aparte case per getroffen klant op basis van geselecteerde alerts. " +
                "Alle cases worden in één transactie aangemaakt.")
            .Produces<CreateNationalIncidentResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }

    private static async Task<
        Results<
            Created<CreateNationalIncidentResponse>,
            BadRequest<string>,
            NotFound,
            Conflict<string>
        >
    > HandleAsync(
        CreateNationalIncidentRequest request,
        SocDbContext db,
        IHubContext<SocHub> hubContext,
        CancellationToken cancellationToken)
    {
        if (request.AlertIds == null || request.AlertIds.Count == 0)
        {
            return TypedResults.BadRequest(
                "Selecteer minimaal één alert.");
        }

        // Dubbele alert-ID's voorkomen.
        var uniqueAlertIds = request.AlertIds.Distinct().ToList();

        if (uniqueAlertIds.Count != request.AlertIds.Count)
        {
            return TypedResults.BadRequest(
                "Dezelfde alert mag niet meerdere keren geselecteerd worden.");
        }

        // Haal de geselecteerde alerts uit de database.
        // TenantId wordt dus nooit door de frontend aangeleverd.
        var alerts = await db.Alerts
            .Where(alert => uniqueAlertIds.Contains(alert.Id))
            .ToListAsync(cancellationToken);

        if (alerts.Count != uniqueAlertIds.Count)
        {
            return TypedResults.NotFound();
        }

        // Alleen open alerts die nog niet aan een case gekoppeld zijn.
        foreach (var alert in alerts)
        {
            if (alert.Status != Alert.AlertStatus.Open)
            {
                return TypedResults.Conflict(
                    $"Alert {alert.Id} is niet meer open.");
            }

            if (alert.CaseId != null)
            {
                return TypedResults.Conflict(
                    $"Alert {alert.Id} is al gekoppeld aan een case.");
            }
        }

        // Verzamel de alerts per klant.
        var alertsPerTenant = new Dictionary<int, List<Alert>>();

        foreach (var alert in alerts)
        {
            if (!alertsPerTenant.ContainsKey(alert.TenantId))
            {
                alertsPerTenant[alert.TenantId] = new List<Alert>();
            }

            alertsPerTenant[alert.TenantId].Add(alert);
        }

        // Een landelijk incident moet meerdere klanten betreffen.
        if (alertsPerTenant.Count < 2)
        {
            return TypedResults.BadRequest(
                "Selecteer alerts van minimaal twee verschillende klanten.");
        }

        var createdCases = new List<CreatedNationalCase>();

        await using var transaction =
            await db.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            foreach (var tenantGroup in alertsPerTenant)
            {
                var tenantId = tenantGroup.Key;
                var tenantAlerts = tenantGroup.Value;

                // De oudste geselecteerde alert bepaalt de SLA-start.
                var slaStartAt = tenantAlerts[0].CreatedAt;

                foreach (var alert in tenantAlerts)
                {
                    if (alert.CreatedAt < slaStartAt)
                    {
                        slaStartAt = alert.CreatedAt;
                    }
                }

                var slaDeadlineAt = slaStartAt.AddMinutes(60);

                // Algemene tekst: geen namen van andere klanten.
                var newCase = new Case
                {
                    TenantId = tenantId,
                    Title = "Landelijk incident",
                    Description =
                        "Deze case is aangemaakt naar aanleiding van een landelijk incident.",
                    Status = Case.CaseStatus.DetectieEnAnalyse,
                    CreatedAt = DateTime.UtcNow,
                    SlaStartAt = slaStartAt,
                    SlaDeadlineAt = slaDeadlineAt
                };

                db.Cases.Add(newCase);

                // Eerst opslaan zodat de nieuwe CaseId beschikbaar is.
                await db.SaveChangesAsync(cancellationToken);

                var linkedAlertIds = new List<int>();

                foreach (var alert in tenantAlerts)
                {
                    alert.Status = Alert.AlertStatus.Promoted;
                    alert.CaseId = newCase.Id;

                    linkedAlertIds.Add(alert.Id);
                }

                createdCases.Add(
                    new CreatedNationalCase(
                        newCase.Id,
                        newCase.TenantId,
                        newCase.Title,
                        newCase.Status.ToString(),
                        newCase.SlaStartAt,
                        newCase.SlaDeadlineAt,
                        linkedAlertIds
                    )
                );
            }

            // Alle cases en alertkoppelingen worden samen bevestigd.
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            // Bij een fout wordt alles teruggedraaid.
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }

        var response = new CreateNationalIncidentResponse(createdCases);

        // SignalR-meldingen pas versturen nadat de transactie is bevestigd.
        foreach (var createdCase in createdCases)
        {
            await hubContext.Clients
                .Group(SocHub.EmployeesGroup)
                .SendAsync(
                    "CaseCreated",
                    createdCase,
                    cancellationToken);
        }

        return TypedResults.Created(
            "/api/cases",
            response);
    }
}
