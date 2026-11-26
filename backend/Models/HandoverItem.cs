using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public sealed class HandoverItem
{
    public int Id { get; set; }
    public int HandoverReportId { get; set; }
    [System.Text.Json.Serialization.JsonIgnore] // voorkomt een cyclus Report -> Items -> Report bij het serialiseren
    public HandoverReport? HandoverReport { get; set; }

    public HandoverItemCategory Category { get; set; }

    [Column(TypeName = "nvarchar(max)")]
    public required string Text { get; set; }

    public required string Author { get; set; } // Wordt automatisch gevuld vanuit de ingelogde gebruiker
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? ClientId { get; set; }

    // Optionele koppeling met cases
    public ICollection<Case> LinkedCases { get; set; } = [];
}