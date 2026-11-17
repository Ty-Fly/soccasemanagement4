using backend.Data;
using backend.Models;

namespace backend.Services.Timeline;

/// <summary>
/// Eén plek om iets aan de tijdlijn van een case toe te voegen.
///
/// Gebruik:
///   timeline.Add(myCase, TimelineEntry.EntryType.StatusChange, "Status gewijzigd naar Containment", userId);
///   await db.SaveChangesAsync();
///
/// Add() slaat zelf NIET op: zo valt het item in dezelfde SaveChanges/transactie als jouw wijziging.
/// </summary>
public interface ITimelineService
{
    TimelineEntry Add(Case @case, TimelineEntry.EntryType type, string content,
        int? authorUserId = null, bool isInternal = true);
}

public sealed class TimelineService(SocDbContext db) : ITimelineService
{
    public TimelineEntry Add(Case @case, TimelineEntry.EntryType type, string content,
        int? authorUserId = null, bool isInternal = true)
    {
        var entry = new TimelineEntry
        {
            Case = @case,
            TenantId = @case.TenantId, // altijd de klant van de case
            Type = type,
            Content = content,
            AuthorUserId = authorUserId,
            IsInternal = isInternal,
            CreatedAt = DateTime.UtcNow
        };

        db.TimelineEntries.Add(entry);
        return entry;
    }
}
