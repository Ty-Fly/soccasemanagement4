using System.ComponentModel.DataAnnotations;

namespace backend.Dtos.Authentication.Register;

/// <summary>Credentials and authenticator code to confirm TOTP setup.</summary>
public sealed record VerifyRegistrationRequest
{
    /// <summary>The email address used during registration.</summary>
    [Required, EmailAddress, StringLength(254)]
    public required string Email { get; init; }

    /// <summary>The account password.</summary>
    [Required, StringLength(128, MinimumLength = 1)]
    public required string Password { get; init; }

    /// <summary>The six-digit code from the authenticator app.</summary>
    [Required, RegularExpression(@"^\d{6}$")]
    public required string Code { get; init; }
}
