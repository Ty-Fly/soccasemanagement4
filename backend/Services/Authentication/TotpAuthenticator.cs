using Microsoft.AspNetCore.DataProtection;
using OtpNet;

namespace backend.Services.Authentication;

public sealed class TotpAuthenticator
{
    private readonly IDataProtector protector;

    public TotpAuthenticator(IDataProtectionProvider dataProtectionProvider)
    {
        protector = dataProtectionProvider.CreateProtector("backend.Authentication.Totp.v1");
    }

    public string CreateSecret()
    {
        var secret = KeyGeneration.GenerateRandomKey(20);
        return Base32Encoding.ToString(secret);
    }

    public string Protect(string secret) => protector.Protect(secret);

    public string Unprotect(string protectedSecret) => protector.Unprotect(protectedSecret);

    public long? FindMatchingCounter(string secret, string code)
    {
        if (code.Length != 6 || code.Any(character => character is < '0' or > '9'))
        {
            return null;
        }

        var totp = new Totp(Base32Encoding.ToBytes(secret), step: 30, totpSize: 6);
        return totp.VerifyTotp(code, out var counter, VerificationWindow.RfcSpecifiedNetworkDelay)
            ? counter
            : null;
    }
}
