namespace backend.Models;

public sealed class Alert
{
    public enum AlertStatus
    {
        Open,
        FalsePositive,
        Promoted,
        Linked
    }

    // US-xx: ernst volgens de bron, zodat analisten kunnen prioriteren
    public enum AlertSeverity
    {
        Low,
        Medium,
        High,
        Critical
    }

    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Message { get; set; } = null!;
    public AlertStatus Status { get; set; } = AlertStatus.Open;

    // Ontvangsttijdstip bij ONS (UTC). Start van de SLA (zie US-08), altijd door de server gezet.
    public DateTime CreatedAt { get; set; }

    // US-05: herkomst en context van de alert
    public string Source { get; set; } = "manual";      // naam van de API-key/bron
    public string? ExternalId { get; set; }             // ID in het bronsysteem, voor dubbele alerts
    public AlertSeverity Severity { get; set; } = AlertSeverity.Medium;
    public DateTime? DetectedAt { get; set; }           // tijdstip volgens de bron (UTC)
    public string? RawPayload { get; set; }             // originele JSON als bewijs

    // US-07
    public DateTime? ClosedAt { get; set; }
    public int? ClosedByUserId { get; set; }
    public User? ClosedByUser { get; set; }

    // US-08 & US-09
    public int? CaseId { get; set; }
    public Case? Case { get; set; }
}