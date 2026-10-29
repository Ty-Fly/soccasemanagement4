namespace backend.Models;

public sealed class Alert 
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Message { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}