namespace backend.Models;

public sealed class Case
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public required string Status { get; set; } // Start op "Detectie en analyse" (US-08 AC 3)
    public bool IsFalsePositive { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime SlaStartAt { get; set; }
    public DateTime SlaDeadlineAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    // US-08 & US-09: Alle gekoppelde alerts bij deze case
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();
}