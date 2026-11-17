using System.Security.Cryptography;
using System.Text;

namespace backend.Services.Ingest;

public static class ApiKeyHasher
{
    // SHA-256 is hier genoeg omdat een API-key lang en willekeurig is.
    // Voor wachtwoorden van gebruikers (US-02) is een trage hash nodig, zoals bcrypt of PBKDF2.
    public static string Hash(string key) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
}