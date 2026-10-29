namespace backend.Models;

public sealed class Case
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public required string Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
}