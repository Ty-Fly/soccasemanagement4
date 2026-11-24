using System.ComponentModel.DataAnnotations;

namespace backend.Dtos.Authentication.Register;

/// <summary>Credentials for a pre-provisioned account to begin authenticator setup.</summary>
public sealed record RegisterRequest
{
    /// <summary>The user's email address.</summary>
    [Required, EmailAddress, StringLength(254)]
    public required string Email { get; init; }

    /// <summary>The account password.</summary>
    [Required, StringLength(128, MinimumLength = 1)]
    public required string Password { get; init; }
}
