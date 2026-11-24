using System.ComponentModel.DataAnnotations;

namespace backend.Dtos.Authentication.Login;

/// <summary>Credentials and authenticator code used to log in.</summary>
public sealed record LoginRequest
{
    /// <summary>The user's email address.</summary>
    [Required, EmailAddress, StringLength(254)]
    public required string Email { get; init; }

    /// <summary>The account password.</summary>
    [Required, StringLength(128, MinimumLength = 1)]
    public required string Password { get; init; }

    /// <summary>The six-digit code from the authenticator app.</summary>
    [Required, RegularExpression(@"^\d{6}$")]
    public required string Code { get; init; }
}
