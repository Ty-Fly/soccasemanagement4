using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public sealed class HandoverReport
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public required string Title { get; set; }

    // Content has large text data, so we specify the column type as nvarchar(max) to accommodate it
    [Column(TypeName = "nvarchar(max)")]
    public required string Content { get; set; }

    public DateTime CreatedAt { get; set; }
}