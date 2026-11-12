namespace backend.Models;

/// <summary>
/// Eén item in de tijdlijn van een case. Meerdere stories schrijven hierin
/// (US-11, 17, 18, 19, 20, 27), daarom zit het in de basis.
/// Voeg items toe via <see cref="backend.Services.Timeline.ITimelineService"/>.
/// Tonen, notities en wat de klant mag zien is uitwerking van US-18.
/// </summary>
public sealed class TimelineEntry
{
    public enum EntryType
    {
        Note,           // US-18
        StatusChange,   // US-17
        AssigneeChange, // US-11
        PlaybookStep,   // US-19 / US-20
        Message,        // US-27
        AlertLinked,    // US-08 / US-09
        Other
    }

    public int Id { get; set; }
    public int TenantId { get; set; }

    public int CaseId { get; set; }
    public Case? Case { get; set; }

    public EntryType Type { get; set; }
    public required string Content { get; set; }

    // Null bij automatische items die het systeem zelf aanmaakt
    public int? AuthorUserId { get; set; }
    public User? AuthorUser { get; set; }

    // Interne items zijn niet bedoeld voor de klant (US-18 AC 3)
    public bool IsInternal { get; set; } = true;

    public DateTime CreatedAt { get; set; }
}
