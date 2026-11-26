using Microsoft.AspNetCore.DataProtection;
using OtpNet;

namespace backend.Services.Authentication;

public sealed class TotpAuthenticator
{
    private readonly IDataProtector protector;

    // Creates a new instance of the TotpAuthenticator class.
    public TotpAuthenticator(IDataProtectionProvider dataProtectionProvider)
    {
        protector = dataProtectionProvider.CreateProtector("backend.Authentication.Totp.v1");
    }

    // Creates a new TOTP secret and returns it as a Base32-encoded string.
    public string CreateSecret()
    {
        var secret = KeyGeneration.GenerateRandomKey(20);
        return Base32Encoding.ToString(secret);
    }

    public string Protect(string secret) => protector.Protect(secret);

    public string Unprotect(string protectedSecret) => protector.Unprotect(protectedSecret);

    // Finds the matching TOTP counter for the given secret and code.
    // Returns the counter if a match is found, or null if no match is found.
    public long? FindMatchingCounter(string secret, string code)
    {
        // Validates the code format: it must be exactly 6 digits.
        if (code.Length != 6 || code.Any(character => character is < '0' or > '9'))
        {
            return null;
        }

        // Creates a new TOTP instance with the given secret, a 30-second time step, and a 6-digit code size.
        var totp = new Totp(Base32Encoding.ToBytes(secret), step: 30, totpSize: 6);
        return totp.VerifyTotp(code, out var counter, VerificationWindow.RfcSpecifiedNetworkDelay)
            ? counter
            : null;
    }
}
