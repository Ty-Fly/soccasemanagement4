namespace backend.Features.Authentication;

internal static class AuthenticationEndpointHelpers
{
    // Cleans up email (NFR-01) and looks up the user in the database
    public static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();
}
