namespace backend.Features.Authentication;

internal static class AuthenticationEndpointHelpers
{
    public static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();
}
