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

    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Message { get; set; } = null!;
    public AlertStatus Status { get; set; } = AlertStatus.Open;
    public DateTime CreatedAt { get; set; }

    // US-07: Vastleggen wie en wanneer een alert heeft gesloten (voor US-30 dashboard)
    public DateTime? ClosedAt { get; set; }
    public int? ClosedByUserId { get; set; }
    public User? ClosedByUser { get; set; }

    // US-08 & US-09: Koppeling aan een Case
    public int? CaseId { get; set; }
    public Case? Case { get; set; }
}