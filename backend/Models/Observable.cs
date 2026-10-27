namespace backend.Models;

public sealed class Observable
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public required string Name { get; set; }
    public required string Type { get; set; }
    public DateTime CreatedAt { get; set; }
}