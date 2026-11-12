namespace backend.Models;

public sealed class Case
{
    // Gedeelde NIST-fases (US-17 AC 1). Gebruikt door US-08/09, US-17, US-25 en US-31.
    // De regels voor het wisselen van status zijn uitwerking van US-17.
    public enum CaseStatus
    {
        DetectieEnAnalyse,
        Containment,
        EradicatieEnHerstel,
        PostIncident,
        Gesloten
    }

    public int Id { get; set; }
    public int TenantId { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public CaseStatus Status { get; set; } = CaseStatus.DetectieEnAnalyse; // Start op "Detectie en analyse" (US-08 AC 3)
    public bool IsFalsePositive { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime SlaStartAt { get; set; }
    public DateTime SlaDeadlineAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    // Behandelaar, null = onverdeeld. Gebruikt door US-04, US-11 en US-31.
    public int? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }

    // US-08 & US-09: Alle gekoppelde alerts bij deze case
    public ICollection<Alert> Alerts { get; set; } = new List<Alert>();

    // Gedeelde tijdlijn (US-11, 17, 18, 19, 20, 27). Toevoegen via ITimelineService.
    public ICollection<TimelineEntry> TimelineEntries { get; set; } = new List<TimelineEntry>();
}
