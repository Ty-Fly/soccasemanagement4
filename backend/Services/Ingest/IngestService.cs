using System.Text.Json;
using backend.Data;
using backend.Features.Alerts;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Ingest;

/// <summary>
/// US-xx: ons eigen, algemene alertformaat ("het contract").
/// Velden zijn nullable zodat we zelf een nette 400 met uitleg kunnen geven.
/// Een tenantId in de body wordt bewust NIET gelezen.
/// </summary>
public sealed record IngestAlertRequest(
    string? ExternalId,
    string? Title,
    Alert.AlertSeverity? Severity,
    DateTime? DetectedAt,
    JsonElement? Raw);

public sealed record IngestResult(Alert Alert, bool IsDuplicate);

public interface IIngestService
{
    Task<IngestResult> IngestAsync(int tenantId, string source, IngestAlertRequest request, CancellationToken ct);
}

/// <summary>
/// Eén plek voor de ingest-regels. Het endpoint, de simulator en latere adapters
/// (bijv. voor de SIEM van de leraar) roepen allemaal deze service aan.
/// </summary>
public sealed class IngestService(
    SocDbContext db,
    IHubContext<SocHub> hub,
    ILogger<IngestService> logger) : IIngestService
{
    public async Task<IngestResult> IngestAsync(int tenantId, string source, IngestAlertRequest request, CancellationToken ct)
    {
        var externalId = request.ExternalId!.Trim();

        // 1. Dubbele alert? Geef de bestaande terug (idempotent: een bron mag veilig opnieuw sturen)
        var existing = await FindExistingAsync(tenantId, source, externalId, ct);
        if (existing is not null)
            return new IngestResult(existing, IsDuplicate: true);

        var alert = new Alert
        {
            TenantId = tenantId,                        // uit de API-key, nooit uit de body
            Source = source,
            ExternalId = externalId,
            Message = request.Title!.Trim(),
            Severity = request.Severity ?? Alert.AlertSeverity.Medium,
            DetectedAt = ToUtc(request.DetectedAt),
            RawPayload = request.Raw?.GetRawText(),
            Status = Alert.AlertStatus.Open,
            CreatedAt = DateTime.UtcNow                 // SLA-start: altijd de server-tijd
        };

        db.Alerts.Add(alert);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Race condition: een identiek request was ons net voor en de unieke index hield ons tegen
            db.Entry(alert).State = EntityState.Detached;
            existing = await FindExistingAsync(tenantId, source, externalId, ct);
            if (existing is null) throw;               // een andere databasefout: niet verbergen
            return new IngestResult(existing, IsDuplicate: true);
        }

        logger.LogInformation("Alert {AlertId} ontvangen van {Source} voor tenant {TenantId}",
            alert.Id, source, tenantId);

        // 2. Pas NA het opslaan realtime melden (NFR-03), en alleen aan medewerkers
        await hub.Clients
            .Group(SocHub.EmployeesGroup)
            .SendAsync(SocHubEvents.AlertReceived, AlertSummary.From(alert), ct);

        return new IngestResult(alert, IsDuplicate: false);
    }

    private Task<Alert?> FindExistingAsync(int tenantId, string source, string externalId, CancellationToken ct) =>
        db.Alerts.AsNoTracking().FirstOrDefaultAsync(a =>
            a.TenantId == tenantId && a.Source == source && a.ExternalId == externalId, ct);

    // "2026-11-17T09:00:00Z" komt binnen als Utc, maar zonder "Z" als Unspecified.
    // Die laatste behandelen we als UTC in plaats van als lokale servertijd.
    private static DateTime? ToUtc(DateTime? value) => value switch
    {
        null => null,
        { Kind: DateTimeKind.Unspecified } d => DateTime.SpecifyKind(d, DateTimeKind.Utc),
        var d => d.Value.ToUniversalTime()
    };
}
