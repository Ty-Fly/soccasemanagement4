using backend.Models;

namespace backend.Features.Alerts;

/// <summary>
/// Wat de frontend van een alert te zien krijgt, in de lijst én via SignalR.
/// Bewust zonder RawPayload: die kan groot en gevoelig zijn.
/// </summary>
public sealed record AlertSummary(
    int Id,
    int TenantId,
    string Source,
    string Message,
    string Severity,
    string Status,
    DateTime CreatedAt,
    DateTime? DetectedAt,
    int? CaseId)
{
    public static AlertSummary From(Alert a) => new(
        a.Id, a.TenantId, a.Source, a.Message,
        a.Severity.ToString(), a.Status.ToString(),
        a.CreatedAt, a.DetectedAt, a.CaseId);
}
