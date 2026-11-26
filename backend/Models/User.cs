namespace backend.Models;

public sealed class User
{
    // Enum for all user types
    public enum UserRole
    {
        Analyst,
        SecurityEngineer,
        Manager,
        AccountManager,
        Client
    }

    public int Id { get; set; }
    public int TenantId { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set;}

    // US-02: tweestapsverificatie (Kuray)
    public string? TwoFactorSecretProtected { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public long LastTwoFactorCounter { get; set; } = -1;
}
