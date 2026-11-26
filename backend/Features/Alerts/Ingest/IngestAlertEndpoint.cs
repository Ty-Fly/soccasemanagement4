using System.Security.Claims;
using backend.Services.Ingest;
using backend.Services.MultiTenancy;
using Microsoft.AspNetCore.Http.HttpResults;

namespace backend.Features.Alerts;

public static class IngestAlertEndpoint
{
    public sealed record IngestAlertResponse(int AlertId, int TenantId, string Status, bool Duplicate);

    public static IEndpointRouteBuilder MapIngestAlertEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/ingest/alerts", HandleAsync)
            .RequireAuthorization("IngestOnly")
            .WithName("IngestAlert")
            .WithTags("Ingest")
            .WithSummary("Ontvangt een alert van een externe bron (US-xx)")
            .WithDescription("Authenticatie met header X-Api-Key. De klant wordt bepaald door de key. " +
                             "Een alert met een bekende externalId wordt niet opnieuw aangemaakt (200, duplicate = true).")
            .Produces<IngestAlertResponse>(StatusCodes.Status201Created)
            .Produces<IngestAlertResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status401Unauthorized);

        return app;
    }

    private static async Task<Results<Created<IngestAlertResponse>, Ok<IngestAlertResponse>, ValidationProblem>> HandleAsync(
        IngestAlertRequest request,
        ICurrentTenant currentTenant,
        ClaimsPrincipal user,
        IIngestService ingest,
        CancellationToken ct)
    {
        // Alles van buiten is onbetrouwbaar: eerst valideren
        var errors = Validate(request);
        if (errors.Count > 0)
            return TypedResults.ValidationProblem(errors);

        // Tenant en bron komen uit de API-key (IngestApiKeyHandler), niet uit de body
        var tenantId = currentTenant.TenantId;
        var source = user.FindFirstValue("name")!;

        var result = await ingest.IngestAsync(tenantId, source, request, ct);

        var response = new IngestAlertResponse(
            result.Alert.Id,
            result.Alert.TenantId,
            result.Alert.Status.ToString(),
            result.IsDuplicate);

        return result.IsDuplicate
            ? TypedResults.Ok(response)
            : TypedResults.Created($"/api/alerts/{response.AlertId}", response);
    }

    private static Dictionary<string, string[]> Validate(IngestAlertRequest r)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(r.ExternalId))
            errors["externalId"] = ["Verplicht: het ID van de alert in het bronsysteem."];
        else if (r.ExternalId.Length > 200)
            errors["externalId"] = ["Maximaal 200 tekens."];

        if (string.IsNullOrWhiteSpace(r.Title))
            errors["title"] = ["Verplicht."];
        else if (r.Title.Length > 500)
            errors["title"] = ["Maximaal 500 tekens."];

        if (r.DetectedAt is { } d && d.ToUniversalTime() > DateTime.UtcNow.AddMinutes(5))
            errors["detectedAt"] = ["Mag niet in de toekomst liggen."];

        return errors;
    }
}
